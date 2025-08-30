# Easy Video Trainer

A React SPA for managing video training datasets with built-in video processing capabilities.

## Features

- 📁 **Dataset Management**: Create and organize video datasets
- 🎥 **Video Upload**: Drag-and-drop video file uploads 
- ⚙️ **Video Configuration**: Set start time, resolution, and crop settings
- 🎬 **Video Preview**: Preview videos with interactive controls
- 🔄 **Video Processing**: Batch process videos with custom settings
- 📊 **Progress Tracking**: Real-time processing progress for each video

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components  
- **Build Tool**: Bun
- **Routing**: React Router
- **File Upload**: react-dropzone

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your system

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd easy-vid-trainer
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components (Button, Card, etc.)
│   ├── CreateDatasetModal.tsx
│   ├── VideoList.tsx
│   ├── VideoDetailPanel.tsx
│   ├── ProcessingPanel.tsx
│   └── VideoUploadZone.tsx
├── pages/              # Main application pages
│   ├── DatasetListPage.tsx
│   └── DatasetDetailPage.tsx
├── services/           # API and data services
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── lib/                # Utility functions
│   └── utils.ts
└── App.tsx             # Main application component
```

## API Integration

The app is designed to work with a Bun + SQLite backend. Currently uses mock data for development.

### Expected Backend Endpoints

- `GET /api/datasets` - List all datasets
- `POST /api/datasets` - Create new dataset
- `GET /api/datasets/:id` - Get dataset with videos
- `GET /api/videos/:id` - Get video metadata
- `PATCH /api/videos/:id` - Update video configuration
- `POST /api/datasets/:id/videos` - Upload videos to dataset
- `POST /api/datasets/:id/process` - Process videos in dataset

## Data Model

### Dataset
```typescript
interface Dataset {
  id: number;
  name: string;
  createdAt: string;
  videoCount?: number;
  videos?: Video[];
}
```

### Video  
```typescript
interface Video {
  id: number;
  datasetId: number;
  filename: string;
  filepath: string;
  duration: number;
  originalWidth: number;
  originalHeight: number;
  startTime: number;
  resolution: '1280x720' | '720x1280' | '768x768';
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  status: 'pending' | 'processed' | 'error';
  fps?: number;
  frameCount?: number;
}
```

## Features Overview

### Dataset Management
- Create datasets with custom names
- View all datasets in a grid layout
- Navigate to dataset details

### Video Configuration  
- Set custom start time for video processing
- Choose output resolution (16:9, 9:16, or 1:1)
- Define crop area with numeric inputs
- Visual crop overlay on video preview
- Real-time preview of settings

### Processing
- Configure FPS and frame count at dataset level
- Process all configured videos in a dataset
- Track processing progress per video
- View processing status and results

## Development

### Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start` - Start production server

### Adding Components

The project uses shadcn/ui for base components. To add new components:

```bash
bunx shadcn-ui@latest add <component-name>
```

## License

MIT License
