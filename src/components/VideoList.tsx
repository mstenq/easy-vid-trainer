import { cn } from '@/lib/utils';
import { Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { Video } from '@/types';

interface VideoListProps {
  videos: Video[];
  selectedVideo: Video | null;
  onVideoSelect: (video: Video) => void;
}

export function VideoList({ videos, selectedVideo, onVideoSelect }: VideoListProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: Video['status']) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: Video['status']) => {
    switch (status) {
      case 'processed':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-yellow-500';
    }
  };

  if (videos.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No videos in this dataset</p>
        <p className="text-xs">Upload videos to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {videos.map((video) => (
        <div
          key={video.id}
          onClick={() => onVideoSelect(video)}
          className={cn(
            'p-3 cursor-pointer border-l-4 transition-colors hover:bg-accent',
            selectedVideo?.id === video.id 
              ? 'bg-accent border-l-primary' 
              : getStatusColor(video.status)
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium truncate">{video.filename}</p>
            <span className="min-w-4 max-w-4">{getStatusIcon(video.status)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDuration(video.duration)}</span>
            <span>{video.originalWidth}×{video.originalHeight}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>Start: {video.startTime.toFixed(1)}s</span>
            <span>{video.resolution}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
