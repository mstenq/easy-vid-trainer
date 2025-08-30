import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Play } from 'lucide-react';
import { getStatusIcon } from '@/lib/video-utils';
import { useProcessing } from '@/hooks/useProcessing';
import type { Video, ProcessingProgress } from '@/types';

interface ProcessingPanelProps {
  datasetId: number;
  videos: Video[];
}

export function ProcessingPanel({ datasetId, videos }: ProcessingPanelProps) {
  const [fps, setFps] = useState(16);
  const [frameCount, setFrameCount] = useState(81);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const getConfiguredVideosCount = () => {
    return videos.filter(isVideoConfigured).length;
  };

  const getProcessedVideosCount = () => {
    return videos.filter((video: Video) => video.status === 'processed').length;
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    
    // Immediately show all videos as "processing" for instant feedback
    const initialProgress = videos.map((video: Video) => ({
      videoId: video.id,
      progress: video.status === 'processed' ? 100 : 25,
      status: video.status === 'processed' ? 'completed' as const : 'processing' as const,
      message: video.status === 'processed' ? 'Already processed' : 'Starting processing...',
    }));
    setProcessingProgress(initialProgress);

    try {
      // Start polling immediately to catch processing states
      pollIntervalRef.current = setInterval(async () => {
        try {
          const updatedDataset = await api.datasets.get(datasetId);
          if (!updatedDataset || !updatedDataset.videos) return;

          setProcessingProgress(currentProgress => {
            const updatedProgress = (updatedDataset.videos || []).map((video: Video) => {
              const prevProgress = currentProgress.find(p => p.videoId === video.id);
              
              let status: ProcessingProgress['status'] = 'idle';
              let progress = 0;
              let message = '';

              switch (video.status) {
                case 'processed':
                  status = 'completed';
                  progress = 100;
                  message = 'Processing complete';
                  break;
                case 'error':
                  status = 'error';
                  progress = prevProgress?.progress || 0;
                  message = 'Processing failed';
                  break;
                case 'pending':
                  // Pending means it's currently being processed
                  status = 'processing';
                  progress = 75; // Show higher progress for processing state
                  message = 'Processing video...';
                  break;
                default:
                  // If we were processing and now back to default, keep processing state briefly
                  if (prevProgress?.status === 'processing') {
                    status = 'processing';
                    progress = prevProgress.progress;
                    message = prevProgress.message || 'Processing video...';
                  } else {
                    status = 'idle';
                    progress = 0;
                  }
              }

              return {
                videoId: video.id,
                progress,
                status,
                message,
              };
            });

            // Check if all videos are done processing
            const allDone = updatedProgress.every(p => 
              p.status === 'completed' || p.status === 'error'
            );

            if (allDone) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              setIsProcessing(false);
            }

            return updatedProgress;
          });
        } catch (error) {
          console.error('Failed to poll progress:', error);
        }
      }, 500); // Poll every 500ms for faster response

      // Start the processing (this runs in background on server)
      await api.processing.processDataset(datasetId, { fps, frameCount });

      // Set a timeout to stop polling after a reasonable time (5 minutes)
      setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsProcessing(false);
      }, 300000);

    } catch (error) {
      console.error('Processing failed:', error);
      setProcessingProgress(prev => 
        prev.map(p => ({ ...p, status: 'error', message: 'Processing failed' }))
      );
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsProcessing(false);
    }
  };

  const getProcessingStatusIcon = (status: ProcessingProgress['status']) => {
    const IconComponent = getStatusIcon(status === 'completed' ? 'processed' : status === 'error' ? 'error' : 'pending');
    const colorClass = status === 'completed' ? 'text-green-500' : 
                      status === 'error' ? 'text-red-500' : 
                      status === 'processing' ? 'text-blue-500' : 'text-gray-400';
    
    return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
  };

  const canProcess = videos.length > 0 && getConfiguredVideosCount() > 0 && !isProcessing;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing</CardTitle>
        <CardDescription>
          Configure processing settings and start video processing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Processing Settings */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fps">Frame Rate (FPS)</Label>
            <Input
              id="fps"
              type="number"
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value) || 30)}
              min="1"
              max="60"
              disabled={isProcessing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="frameCount">Frame Count</Label>
            <Input
              id="frameCount"
              type="number"
              value={frameCount}
              onChange={(e) => setFrameCount(parseInt(e.target.value) || 100)}
              min="1"
              max="1000"
              disabled={isProcessing}
            />
          </div>
            <div className="space-y-2">
              <div>Seconds</div>
              <div>{ ((frameCount -1) / fps) }</div>
            </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{videos.length}</div>
            <div className="text-sm text-muted-foreground">Total Videos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{getConfiguredVideosCount()}</div>
            <div className="text-sm text-muted-foreground">Configured</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{getProcessedVideosCount()}</div>
            <div className="text-sm text-muted-foreground">Processed</div>
          </div>
        </div>

        {/* Processing Progress */}
        {processingProgress.length > 0 && (
          <div className="space-y-3">
            <Label>Processing Progress</Label>
            
            {/* Overall Progress */}
            {isProcessing && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">Overall Progress</span>
                  <span>{processingProgress.filter(p => p.status === 'completed').length} / {processingProgress.length} completed</span>
                </div>
                <Progress 
                  value={(processingProgress.filter(p => p.status === 'completed').length / processingProgress.length) * 100} 
                  className="h-2" 
                />
              </div>
            )}
            
            <div className="space-y-2">
              {processingProgress.map((progress) => {
                const video = videos.find((v: Video) => v.id === progress.videoId);
                if (!video) return null;

                return (
                  <div key={progress.videoId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getProcessingStatusIcon(progress.status)}
                        <span>{video.filename}</span>
                      </div>
                      <span>{progress.progress}%</span>
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                    {progress.message && (
                      <p className="text-xs text-muted-foreground">{progress.message}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Process Button */}
        <div className="pt-4 border-t">
          <Button 
            onClick={handleProcess} 
            disabled={!canProcess}
            className="w-full"
          >
            <Play className="mr-2 h-4 w-4" />
            {isProcessing ? 'Processing Videos...' : 'Process Videos'}
          </Button>
          {!canProcess && videos.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Configure at least one video before processing
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
