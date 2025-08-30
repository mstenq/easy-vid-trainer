import { db } from '@/db';
import { videos, datasets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { extractVideoMetadata } from '@/lib/video-metadata';

export async function getVideo(id: number) {
  try {
    const video = await db.query.videos.findFirst({
      where: eq(videos.id, id),
    });

    if (!video) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }

    return Response.json(video);
  } catch (error) {
    console.error('Error getting video:', error);
    return Response.json({ error: 'Failed to get video' }, { status: 500 });
  }
}

export async function updateVideo(id: number, req: Request) {
  try {
    const updates = await req.json();
    
    // Validate that video exists
    const existingVideo = await db.query.videos.findFirst({
      where: eq(videos.id, id),
    });

    if (!existingVideo) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }

    // Update the video
    const [updatedVideo] = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();

    return Response.json(updatedVideo);
  } catch (error) {
    console.error('Error updating video:', error);
    return Response.json({ error: 'Failed to update video' }, { status: 500 });
  }
}

export async function deleteVideo(id: number) {
  try {
    // Get video details before deletion to access file path
    const existingVideo = await db.query.videos.findFirst({
      where: eq(videos.id, id),
    });

    if (!existingVideo) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete the video file from filesystem
    try {
      const file = Bun.file(existingVideo.filepath);
      await file.delete();
    } catch (fileError) {
      console.warn('Could not delete video file:', existingVideo.filepath, fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete the video from database
    await db
      .delete(videos)
      .where(eq(videos.id, id));

    return Response.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    return Response.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}

export async function uploadVideos(datasetId: number, req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    // Check if dataset exists
    const dataset = await db.query.datasets.findFirst({
      where: eq(datasets.id, datasetId),
    });

    if (!dataset) {
      return Response.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // Create uploads directory for this dataset
    const uploadsDir = `uploads/${datasetId}`;
    await Bun.write(`${uploadsDir}/.keep`, ''); // Ensure directory exists

    const newVideos = [];
    
    for (const file of files) {
      // Generate unique filename to avoid conflicts
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop() || 'mp4';
      const uniqueFilename = `${timestamp}_${randomString}.${extension}`;
      const filepath = `uploads/${datasetId}/${uniqueFilename}`;
      
      // Save the file to disk
      await Bun.write(filepath, file);
      
      // Extract real video metadata using ffprobe
      let duration = 30.0; // Default fallback
      let originalWidth = 1920; // Default fallback
      let originalHeight = 1080; // Default fallback
      let fps: number | undefined;
      let frameCount: number | undefined;
      
      try {
        const metadata = await extractVideoMetadata(filepath);
        duration = metadata.duration;
        originalWidth = metadata.width;
        originalHeight = metadata.height;
        fps = metadata.fps;
        frameCount = metadata.frameCount;
        
        console.log(`Extracted metadata for ${file.name}:`, {
          duration,
          originalWidth,
          originalHeight,
          fps,
          frameCount
        });
      } catch (error) {
        console.error(`Failed to extract metadata for ${file.name}:`, error);
        // Continue with default values as fallback
      }

      const [newVideo] = await db
        .insert(videos)
        .values({
          datasetId,
          filename: file.name,
          filepath: filepath,
          duration,
          originalWidth,
          originalHeight,
          cropWidth: originalWidth,
          cropHeight: originalHeight,
          fps,
          frameCount,
          status: 'pending',
        })
        .returning();
      
      newVideos.push(newVideo);
    }

    return Response.json(newVideos);
  } catch (error) {
    console.error('Error uploading videos:', error);
    return Response.json({ error: 'Failed to upload videos' }, { status: 500 });
  }
}
