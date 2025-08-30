#!/usr/bin/env bun
import { db } from './src/db';
import { videos } from './src/db/schema';
import { extractVideoMetadata } from './src/lib/video-metadata';
import { eq } from 'drizzle-orm';
import { existsSync } from 'fs';

async function updateVideoMetadata() {
  console.log('Updating video metadata for existing videos...');
  
  // Get all videos from the database
  const allVideos = await db.query.videos.findMany();
  
  console.log(`Found ${allVideos.length} videos to process`);
  
  for (const video of allVideos) {
    console.log(`\nProcessing: ${video.filename}`);
    
    // Check if the file exists
    if (!existsSync(video.filepath)) {
      console.log(`  ⚠️  File not found: ${video.filepath}`);
      continue;
    }
    
    try {
      // Extract metadata
      const metadata = await extractVideoMetadata(video.filepath);
      
      console.log(`  ✅ Extracted metadata:`, {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        frameCount: metadata.frameCount
      });
      
      // Update the database
      await db
        .update(videos)
        .set({
          duration: metadata.duration,
          originalWidth: metadata.width,
          originalHeight: metadata.height,
          cropWidth: metadata.width,
          cropHeight: metadata.height,
          fps: metadata.fps,
          frameCount: metadata.frameCount,
        })
        .where(eq(videos.id, video.id));
      
      console.log(`  ✅ Updated database record`);
      
    } catch (error) {
      console.log(`  ❌ Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log('\n✅ Metadata update complete!');
}

// Run the update
updateVideoMetadata().catch((error) => {
  console.error('Error updating metadata:', error);
  process.exit(1);
});
