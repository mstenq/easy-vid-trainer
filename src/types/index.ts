export interface Dataset {
  id: number;
  name: string;
  createdAt: string;
  videoCount?: number;
  videos?: Video[];
}

export interface Video {
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

export interface ProcessingConfig {
  fps: number;
  frameCount: number;
}

export interface ProcessingProgress {
  videoId: number;
  progress: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  message?: string;
}
