import { cn } from '@/lib/utils';
import { Play, Video } from 'lucide-react';
import { formatDuration, getStatusIcon, getStatusColor, getStatusBorderColor } from '@/lib/video-utils';
import type { Video as VideoType } from '@/types';

interface VideoListProps {
  videos: VideoType[];
  selectedVideo: VideoType | null;
  onVideoSelect: (video: VideoType) => void;
}

export function VideoList({ videos, selectedVideo, onVideoSelect }: VideoListProps) {
  if (videos.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground space-y-3">
        <div className="w-12 h-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
          <Video className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">No videos yet</p>
          <p className="text-xs">Upload videos to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {videos.map((video) => {
        const StatusIcon = getStatusIcon(video.status);
        const isSelected = selectedVideo?.id === video.id;
        
        return (
          <div
            key={video.id}
            data-testid="video-item"
            data-video-id={video.id}
            onClick={() => onVideoSelect(video)}
            className={cn(
              'p-4 cursor-pointer rounded-lg border border-border/50 transition-all duration-200 hover:border-primary/30 hover:bg-accent/50 group',
              isSelected && 'bg-primary/5 border-primary/50 shadow-sm'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                  isSelected ? "bg-primary/10" : "bg-muted/30 group-hover:bg-primary/5"
                )}>
                  <Play className={cn(
                    "h-4 w-4 transition-colors",
                    isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-sm font-medium truncate transition-colors",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {video.filename}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>{formatDuration(video.duration)}</span>
                    <span>•</span>
                    <span>{video.originalWidth}×{video.originalHeight}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusIcon className={cn("h-4 w-4", getStatusColor(video.status))} />
                <span className="text-xs text-muted-foreground">{video.resolution}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Start: {video.startTime.toFixed(1)}s</span>
              {video.status === 'processed' && (
                <span className="text-green-600 dark:text-green-400 font-medium">✓ Ready</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
