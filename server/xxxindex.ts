import { db } from '../src/db';
import { datasets, videos } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { Dataset, Video, NewDataset, NewVideo } from '../src/db/schema';
import { file, type BunFile } from 'bun';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper function to create JSON response with CORS headers
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Helper function to handle CORS preflight requests
function handleCORS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// Route handlers
async function handleDatasetsList() {
  try {
    const allDatasets = await db
      .select({
        id: datasets.id,
        name: datasets.name,
        createdAt: datasets.createdAt,
      })
      .from(datasets)
      .orderBy(desc(datasets.createdAt));

    // Get video counts for each dataset
    const datasetsWithCounts = await Promise.all(
      allDatasets.map(async (dataset) => {
        const videoCount = await db
          .select({ count: videos.id })
          .from(videos)
          .where(eq(videos.datasetId, dataset.id));
        
        return {
          ...dataset,
          videoCount: videoCount.length
        };
      })
    );

    return jsonResponse(datasetsWithCounts);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return jsonResponse({ error: 'Failed to fetch datasets' }, 500);
  }
}

async function handleDatasetGet(id: number) {
  try {
    const dataset = await db
      .select()
      .from(datasets)
      .where(eq(datasets.id, id))
      .limit(1);

    if (dataset.length === 0) {
      return jsonResponse({ error: 'Dataset not found' }, 404);
    }

    const datasetVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.datasetId, id))
      .orderBy(videos.filename);

    return jsonResponse({
      ...dataset[0],
      videos: datasetVideos,
      videoCount: datasetVideos.length
    });
  } catch (error) {
    console.error('Error fetching dataset:', error);
    return jsonResponse({ error: 'Failed to fetch dataset' }, 500);
  }
}

async function handleDatasetCreate(request: Request) {
  try {
    const { name } = await request.json();
    
    if (!name || typeof name !== 'string') {
      return jsonResponse({ error: 'Dataset name is required' }, 400);
    }

    const newDataset = await db
      .insert(datasets)
      .values({ name })
      .returning();

    return jsonResponse({
      ...newDataset[0],
      videoCount: 0,
      videos: []
    });
  } catch (error) {
    console.error('Error creating dataset:', error);
    return jsonResponse({ error: 'Failed to create dataset' }, 500);
  }
}

async function handleVideoGet(id: number) {
  try {
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, id))
      .limit(1);

    if (video.length === 0) {
      return jsonResponse({ error: 'Video not found' }, 404);
    }

    return jsonResponse(video[0]);
  } catch (error) {
    console.error('Error fetching video:', error);
    return jsonResponse({ error: 'Failed to fetch video' }, 500);
  }
}

async function handleVideoUpdate(id: number, request: Request) {
  try {
    const updates = await request.json();

    const updatedVideo = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();

    if (updatedVideo.length === 0) {
      return jsonResponse({ error: 'Video not found' }, 404);
    }

    return jsonResponse(updatedVideo[0]);
  } catch (error) {
    console.error('Error updating video:', error);
    return jsonResponse({ error: 'Failed to update video' }, 500);
  }
}

async function handleVideoUpload(datasetId: number, request: Request) {
  try {
    const { files } = await request.json();

    if (!files || !Array.isArray(files)) {
      return jsonResponse({ error: 'Files data is required' }, 400);
    }

    const newVideos = await Promise.all(
      files.map(async (file: any) => {
        const videoData: NewVideo = {
          datasetId,
          filename: file.name,
          filepath: `datasets/dataset-${datasetId}/${file.name}`,
          duration: file.duration || 120,
          originalWidth: file.width || 1920,
          originalHeight: file.height || 1080,
          startTime: 0,
          resolution: '1280x720',
          cropX: 0,
          cropY: 0,
          cropWidth: file.width || 1920,
          cropHeight: file.height || 1080,
          status: 'pending'
        };

        const inserted = await db
          .insert(videos)
          .values(videoData)
          .returning();

        return inserted[0];
      })
    );

    return jsonResponse(newVideos);
  } catch (error) {
    console.error('Error uploading videos:', error);
    return jsonResponse({ error: 'Failed to upload videos' }, 500);
  }
}

async function handleDatasetProcess(datasetId: number, request: Request) {
  try {
    const { fps, frameCount } = await request.json();

    await db
      .update(videos)
      .set({
        fps,
        frameCount,
        status: 'processed'
      })
      .where(eq(videos.datasetId, datasetId));

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error processing dataset:', error);
    return jsonResponse({ error: 'Failed to process dataset' }, 500);
  }
}

// Main request handler
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    return handleCORS();
  }

  // Parse route parameters
  const pathParts = pathname.split('/').filter(Boolean);

  try {
    // Health check
    if (pathname === '/api/health') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Dataset routes
    if (pathname === '/api/datasets') {
      if (method === 'GET') {
        return await handleDatasetsList();
      } else if (method === 'POST') {
        return await handleDatasetCreate(request);
      }
    }

    // Dataset by ID routes
    if (pathParts[0] === 'api' && pathParts[1] === 'datasets' && pathParts[2]) {
      const datasetId = parseInt(pathParts[2]);
      
      if (isNaN(datasetId)) {
        return jsonResponse({ error: 'Invalid dataset ID' }, 400);
      }

      if (pathParts.length === 3 && method === 'GET') {
        return await handleDatasetGet(datasetId);
      }

      // Video upload route
      if (pathParts[3] === 'videos' && method === 'POST') {
        return await handleVideoUpload(datasetId, request);
      }

      // Process dataset route
      if (pathParts[3] === 'process' && method === 'POST') {
        return await handleDatasetProcess(datasetId, request);
      }
    }

    // Video routes
    if (pathParts[0] === 'api' && pathParts[1] === 'videos' && pathParts[2]) {
      const videoId = parseInt(pathParts[2]);
      
      if (isNaN(videoId)) {
        return jsonResponse({ error: 'Invalid video ID' }, 400);
      }

      if (method === 'GET') {
        return await handleVideoGet(videoId);
      } else if (method === 'PATCH') {
        return await handleVideoUpdate(videoId, request);
      } else if (method === 'DELETE') {
        return await handleVideoDelete(videoId);
      }
    }

    // Route not found
    return jsonResponse({ error: 'Route not found' }, 404);

  } catch (error) {
    console.error('Request handling error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

export default {
  port: 3001,
  fetch: handleRequest,
};
