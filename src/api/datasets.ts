import { db } from '@/db';
import { datasets, videos, type Video } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { mkdir, rmdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import type { ProcessingConfig } from '@/types';

export async function listDatasets() {
  try {
    // Get datasets with video count
    const result = await db
      .select({
        id: datasets.id,
        name: datasets.name,
        createdAt: datasets.createdAt,
        videoCount: count(videos.id),
      })
      .from(datasets)
      .leftJoin(videos, eq(datasets.id, videos.datasetId))
      .groupBy(datasets.id, datasets.name, datasets.createdAt);

    return Response.json(result);
  } catch (error) {
    console.error('Error listing datasets:', error);
    return Response.json({ error: 'Failed to list datasets' }, { status: 500 });
  }
}

export async function getDataset(id: number) {
  try {
    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, id),
      with: {
        videos: true,
      },
    });

    if (!dataset) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }

    return Response.json(dataset);
  } catch (error) {
    console.error('Error getting dataset:', error);
    return Response.json({ error: 'Failed to get dataset' }, { status: 500 });
  }
}

export async function createDataset(req: Request) {
  try {
    const { name } = await req.json();
    
    if (!name || typeof name !== 'string') {
      return Response.json({ error: 'Dataset name is required' }, { status: 400 });
    }

    const [newDataset] = await db
      .insert(datasets)
      .values({ name })
      .returning();

    return Response.json(newDataset);
  } catch (error) {
    console.error('Error creating dataset:', error);
    return Response.json({ error: 'Failed to create dataset' }, { status: 500 });
  }
}

export async function processDataset(datasetId: number, req: Request) {
  try {
    const config: ProcessingConfig = await req.json();
    
    // Validate config
    if (!config.fps || !config.frameCount) {
      return Response.json({ error: 'Invalid processing config' }, { status: 400 });
    }

    // Get dataset with its videos
    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, datasetId),
      with: {
        videos: true,
      },
    });

    if (!dataset) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // Create output directory
    const outputDir = join(process.cwd(), 'output', dataset.name);
    await mkdir(outputDir, { recursive: true });

    // Process each video
    let processedCount = 0;
    const totalVideos = dataset.videos.length;

    for (let i = 0; i < dataset.videos.length; i++) {
      const video = dataset.videos[i];
      if (!video) continue;
      
      const outputFilename = `vid_${String(i + 1).padStart(4, '0')}.mp4`;
      const outputPath = join(outputDir, outputFilename);

      try {
        // Update video status to processing
        await db
          .update(videos)
          .set({ status: 'pending' })
          .where(eq(videos.id, video.id));

        // Run FFMPEG processing
        await processVideo(video, outputPath, config);

        // Update video as processed
        await db
          .update(videos)
          .set({ 
            status: 'processed',
            fps: config.fps,
            frameCount: config.frameCount,
          })
          .where(eq(videos.id, video.id));

        processedCount++;
      } catch (error) {
        console.error(`Error processing video ${video.id}:`, error);
        
        // Update video status to error
        await db
          .update(videos)
          .set({ status: 'error' })
          .where(eq(videos.id, video.id));
      }
    }

    return Response.json({ 
      message: `Processing completed. ${processedCount}/${totalVideos} videos processed successfully.`,
      processedCount,
      totalVideos 
    });
  } catch (error) {
    console.error('Error processing dataset:', error);
    return Response.json({ error: 'Failed to process dataset' }, { status: 500 });
  }
}

export async function deleteDataset(id: number) {
  try {
    // Get dataset with its videos before deletion
    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, id),
      with: {
        videos: true,
      },
    });

    if (!dataset) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // Delete video files from filesystem
    for (const video of dataset.videos) {
      try {
        const file = Bun.file(video.filepath);
        await file.delete();
      } catch (fileError) {
        console.warn('Could not delete video file:', video.filepath, fileError);
        // Continue with other deletions even if one file fails
      }
    }

    // Delete videos from database (will be handled by foreign key cascade, but let's be explicit)
    await db
      .delete(videos)
      .where(eq(videos.datasetId, id));

    // Delete the dataset from database
    await db
      .delete(datasets)
      .where(eq(datasets.id, id));

    // Delete uploads directory for this dataset
    const uploadsDir = join(process.cwd(), 'uploads', id.toString());
    try {
      if (existsSync(uploadsDir)) {
        await rmdir(uploadsDir, { recursive: true });
      }
    } catch (dirError) {
      console.warn('Could not delete uploads directory:', uploadsDir, dirError);
    }

    // Delete output directory for this dataset
    const outputDir = join(process.cwd(), 'output', dataset.name);
    try {
      if (existsSync(outputDir)) {
        await rmdir(outputDir, { recursive: true });
      }
    } catch (dirError) {
      console.warn('Could not delete output directory:', outputDir, dirError);
    }

    return Response.json({ message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Error deleting dataset:', error);
    return Response.json({ error: 'Failed to delete dataset' }, { status: 500 });
  }
}

async function processVideo(video: Video, outputPath: string, config: ProcessingConfig): Promise<void> {
  // Parse resolution
  const [resWidth, resHeight] = video.resolution.split('x').map(Number);
  
  // Build FFMPEG command
  const ffmpegArgs = [
    'ffmpeg',
    '-i', video.filepath,
    '-ss', video.startTime.toString(),
    '-vf', `crop=${video.cropWidth}:${video.cropHeight}:${video.cropX}:${video.cropY},scale=${resWidth}:${resHeight}`,
    '-r', config.fps.toString(),
    '-frames:v', config.frameCount.toString(),
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-y', // Overwrite output file
    outputPath
  ];

  console.log('Running FFMPEG with args:', ffmpegArgs);

  const proc = Bun.spawn(ffmpegArgs, {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;

  if (exitCode === 0) {
    console.log(`Successfully processed video: ${outputPath}`);
  } else {
    const stderr = await new Response(proc.stderr).text();
    console.error(`FFMPEG failed with code ${exitCode}:`, stderr);
    throw new Error(`FFMPEG processing failed with exit code ${exitCode}: ${stderr}`);
  }
}
