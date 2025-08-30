import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Play, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { Video, ProcessingProgress } from '@/types';
import api from '@/services/api';

interface ProcessingPanelProps {
  datasetId: number;
  videos: Video[];
}

export function ProcessingPanel({ datasetId, videos }: ProcessingPanelProps) {
  const [fps, setFps] = useState(16);
  const [frameCount, setFrameCount] = useState(81);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress[]>([]);

  const getConfiguredVideosCount = () => {
    return videos.filter((video: Video) => 
      video.startTime >= 0 && 
      video.resolution && 
      video.cropWidth > 0 && 
      video.cropHeight > 0
    ).length;
  };

  const getProcessedVideosCount = () => {
    return videos.filter((video: Video) => video.status === 'processed').length;
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    
    // Initialize progress tracking
    const initialProgress = videos.map((video: Video) => ({
      videoId: video.id,
      progress: 0,
      status: 'idle' as const,
    }));
    setProcessingProgress(initialProgress);

    try {
      await api.processing.processDataset(datasetId, { fps, frameCount });

      // Mock processing simulation
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i]!;
        
        // Update status to processing
        setProcessingProgress(prev => 
          prev.map(p => 
            p.videoId === video.id 
              ? { ...p, status: 'processing', message: 'Processing video...' }
              : p
          )
        );

        // Simulate progress updates
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setProcessingProgress(prev => 
            prev.map(p => 
              p.videoId === video.id 
                ? { ...p, progress }
                : p
            )
          );
        }

        // Mark as completed
        setProcessingProgress(prev => 
          prev.map(p => 
            p.videoId === video.id 
              ? { ...p, status: 'completed', message: 'Processing complete' }
              : p
          )
        );
      }

    } catch (error) {
      console.error('Processing failed:', error);
      setProcessingProgress(prev => 
        prev.map(p => ({ ...p, status: 'error', message: 'Processing failed' }))
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: ProcessingProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
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
            <div className="space-y-2">
              {processingProgress.map((progress) => {
                const video = videos.find((v: Video) => v.id === progress.videoId);
                if (!video) return null;

                return (
                  <div key={progress.videoId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(progress.status)}
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
