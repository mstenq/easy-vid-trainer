import { serve } from "bun";
import index from "./index.html";
import { listDatasets, getDataset, createDataset, processDataset, deleteDataset } from "./api/datasets";
import { getVideo, updateVideo, uploadVideos, deleteVideo } from "./api/videos";

const server = serve({
  routes: {
    // Serve uploaded videos - must come before catch-all route
    "/uploads/*": async (req) => {
      try {
        const url = new URL(req.url);
        const filePath = url.pathname.slice(1); // Remove leading slash to get "uploads/..."
        const file = Bun.file(filePath);
        
        if (await file.exists()) {
          return new Response(file, {
            headers: {
              'Content-Type': 'video/mp4',
              'Accept-Ranges': 'bytes',
            },
          });
        } else {
          return new Response('Video not found', { status: 404 });
        }
      } catch (error) {
        console.error('Error serving video file:', error);
        return new Response('Error serving video', { status: 500 });
      }
    },

    // Dataset routes
    "/api/datasets": {
      async GET(req) {
        return listDatasets();
      },
      async POST(req) {
        return createDataset(req);
      },
    },

    "/api/datasets/:id": {
      async GET(req) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return Response.json({ error: "Invalid dataset ID" }, { status: 400 });
        }
        return getDataset(id);
      },
      async DELETE(req) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return Response.json({ error: "Invalid dataset ID" }, { status: 400 });
        }
        return deleteDataset(id);
      },
    },

    "/api/datasets/:id/process": {
      async POST(req) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return Response.json({ error: "Invalid dataset ID" }, { status: 400 });
        }
        return processDataset(id, req);
      },
    },

    "/api/datasets/:id/videos": {
      async POST(req) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return Response.json({ error: "Invalid dataset ID" }, { status: 400 });
        }
        return uploadVideos(id, req);
      },
    },

    // Video routes
    "/api/videos/:id": {
      async GET(req) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return Response.json({ error: "Invalid video ID" }, { status: 400 });
        }
        return getVideo(id);
      },
      async PATCH(req) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return Response.json({ error: "Invalid video ID" }, { status: 400 });
        }
        return updateVideo(id, req);
      },
      async DELETE(req) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return Response.json({ error: "Invalid video ID" }, { status: 400 });
        }
        return deleteVideo(id);
      },
    },

    // Keep the original hello endpoints for testing
    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    // Serve index.html for all unmatched routes - must be last
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
