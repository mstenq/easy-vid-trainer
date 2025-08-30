import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { formatTime } from '@/lib/video-utils';
import type { Video } from '@/types';

interface VideoPlayerProps {
  video: Video;
  isPlaying: boolean;
  currentTime: number;
  videoError: string | null;
  videoLoaded: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoContainerRef: React.RefObject<HTMLDivElement | null>;
  onPlayPause: () => void;
  onTimeUpdate: () => void;
  onSeek: (time: number) => void;
  onLoadedMetadata: () => void;
  onVideoError: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  onVideoEnded: () => void;
  children?: React.ReactNode; // For crop overlay
}

export function VideoPlayer({
  video,
  isPlaying,
  currentTime,
  videoError,
  videoLoaded,
  videoRef,
  videoContainerRef,
  onPlayPause,
  onTimeUpdate,
  onSeek,
  onLoadedMetadata,
  onVideoError,
  onVideoEnded,
  children
}: VideoPlayerProps) {
  const videoUrl = `http://localhost:3000/${video.filepath.replace(/^\/+/, '')}`;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    onSeek(time);
  };

  return (
    <Card className="flex-grow">
      <CardHeader>
        <CardTitle>{video.filename}</CardTitle>
        <CardDescription>
          {video.originalWidth}×{video.originalHeight} • {formatTime(video.duration)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Video Element */}
          <div ref={videoContainerRef} className="relative bg-black rounded-lg overflow-hidden">
            {videoError && (
              <div className="absolute inset-0 z-10 bg-red-900/80 flex items-center justify-center">
                <div className="text-white text-center p-4">
                  <p className="text-sm font-medium mb-2">Video Error</p>
                  <p className="text-xs opacity-75">{videoError}</p>
                </div>
              </div>
            )}
            
            <video
              key={`${video.id}-${video.filepath}`}
              ref={videoRef}
              className="w-full h-120 object-contain"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onPlay={() => {}}
              onPause={() => {}}
              onError={onVideoError}
              onLoadStart={() => {}}
              onLoadedData={() => {}}
              onCanPlay={() => {}}
              onStalled={() => {
                console.warn('Video stalled:', video.filename);
              }}
              onAbort={() => {
                console.warn('Video loading aborted:', video.filename);
              }}
              onEnded={onVideoEnded}
              controls={false}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {!videoLoaded && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-sm opacity-75">Loading video...</p>
                  <p className="text-xs opacity-50 mt-1">{video.filename}</p>
                </div>
              </div>
            )}
            
            {/* Crop Overlay */}
            {children}
          </div>

          {/* Video Controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Button 
                size="sm" 
                onClick={onPlayPause}
                disabled={!videoLoaded}
                variant={videoError ? "destructive" : "default"}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={video.duration}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="w-full"
                />
              </div>
              <span className="text-sm text-muted-foreground min-w-0">
                {formatTime(currentTime)} / {formatTime(video.duration)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
