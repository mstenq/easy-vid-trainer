import { db } from '@/db';
import { datasets, videos, type Video } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
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
