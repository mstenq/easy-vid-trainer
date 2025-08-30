import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { formatDuration, getStatusIcon, getStatusColor, getStatusBorderColor } from '@/lib/video-utils';
import type { Video } from '@/types';

interface VideoListProps {
  videos: Video[];
  selectedVideo: Video | null;
  onVideoSelect: (video: Video) => void;
}

export function VideoList({ videos, selectedVideo, onVideoSelect }: VideoListProps) {
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
      {videos.map((video) => {
        const StatusIcon = getStatusIcon(video.status);
        
        return (
          <div
            key={video.id}
            data-testid="video-item"
            data-video-id={video.id}
            onClick={() => onVideoSelect(video)}
            className={cn(
              'p-3 cursor-pointer border-l-4 transition-colors hover:bg-accent',
              selectedVideo?.id === video.id 
                ? 'bg-accent border-l-primary' 
                : getStatusBorderColor(video.status)
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium truncate">{video.filename}</p>
              <span className="min-w-4 max-w-4">
                <StatusIcon className={`h-4 w-4 ${getStatusColor(video.status)}`} />
              </span>
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
        );
      })}
    </div>
  );
}
