import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Play, AlertCircle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { useProcessing } from '@/hooks/useProcessing';
import type { Video, ProcessingConfig } from '@/types';

interface ProcessingPanelProps {
  datasetId: number;
  videos: Video[];
}

export function ProcessingPanelSimple({ datasetId, videos }: ProcessingPanelProps) {
  const [fps, setFps] = useState<number>(30);
  const [frameCount, setFrameCount] = useState<number>(3000);

  const {
    isProcessing,
    processingProgress,
    getConfiguredVideosCount,
    getProcessedVideosCount,
    startProcessing,
    canProcess,
    cleanup,
    error
  } = useProcessing({ datasetId, videos });

  const handleStartProcessing = () => {
    const config: ProcessingConfig = { fps, frameCount };
    startProcessing(config);
  };

  // Cleanup polling when component unmounts
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Wrench className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Process Videos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {getConfiguredVideosCount()} of {videos.length} videos configured, {getProcessedVideosCount()} processed
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">Error: {error.message}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">FPS</label>
            <Select value={fps.toString()} onValueChange={(value) => setFps(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 FPS</SelectItem>
                <SelectItem value="25">25 FPS</SelectItem>
                <SelectItem value="30">30 FPS</SelectItem>
                <SelectItem value="60">60 FPS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Frame Count</label>
            <Select value={frameCount.toString()} onValueChange={(value) => setFrameCount(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1,000 frames</SelectItem>
                <SelectItem value="3000">3,000 frames</SelectItem>
                <SelectItem value="5000">5,000 frames</SelectItem>
                <SelectItem value="10000">10,000 frames</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleStartProcessing}
          disabled={!canProcess}
          className="w-full"
        >
          {isProcessing ? 'Processing...' : 'Start Processing'}
        </Button>

        {processingProgress.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Processing Progress</h4>
            {processingProgress.map((progress: any) => {
              const video = videos.find(v => v.id === progress.videoId);
              return (
                <div key={progress.videoId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(progress.status)}
                      <span className="truncate">
                        {video?.filename || `Video ${progress.videoId}`}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {progress.progress}%
                    </span>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {progress.message}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
