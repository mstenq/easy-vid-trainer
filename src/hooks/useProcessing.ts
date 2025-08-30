import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProcessDataset, queryKeys } from './useQueries';
import { isVideoConfigured } from '@/lib/video-utils';
import type { Video, ProcessingProgress, ProcessingConfig } from '@/types';

interface UseProcessingOptions {
  datasetId: number;
  videos: Video[];
}

export function useProcessing({ datasetId, videos }: UseProcessingOptions) {
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress[]>([]);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);

  const processDatasetMutation = useProcessDataset();
  const queryClient = useQueryClient();

  const getConfiguredVideosCount = useCallback(() => {
    return videos.filter(isVideoConfigured).length;
  }, [videos]);

  const getProcessedVideosCount = useCallback(() => {
    return videos.filter((video: Video) => video.status === 'processed').length;
  }, [videos]);

  const startPolling = useCallback(() => {
    if (pollIntervalId) return; // Already polling

    const intervalId = setInterval(async () => {
      try {
        // Refetch the dataset to get updated video statuses
        await queryClient.invalidateQueries({ queryKey: queryKeys.dataset(datasetId) });
        
        // Get the updated data from cache
        const updatedDataset = queryClient.getQueryData(queryKeys.dataset(datasetId)) as any;
        
        if (updatedDataset?.videos) {
          const updatedProgress = updatedDataset.videos.map((video: Video) => {
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
                progress = 0;
                message = 'Processing failed';
                break;
              case 'pending':
                status = 'processing';
                progress = 75;
                message = 'Processing video...';
                break;
              default:
                status = 'idle';
                progress = 0;
                message = 'Waiting to start...';
            }

            return {
              videoId: video.id,
              progress,
              status,
              message,
            };
          });

          setProcessingProgress(updatedProgress);

          // Check if all videos are completed or errored
          const allDone = updatedProgress.every((p: ProcessingProgress) => p.status === 'completed' || p.status === 'error');
          if (allDone) {
            stopPolling();
          }
        }
      } catch (error) {
        console.error('Error polling dataset status:', error);
        stopPolling();
      }
    }, 2000);

    setPollIntervalId(intervalId);

    // Safety net: stop polling after 5 minutes
    setTimeout(() => {
      stopPolling();
    }, 300000);
  }, [datasetId, queryClient, pollIntervalId]);

  const stopPolling = useCallback(() => {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      setPollIntervalId(null);
    }
  }, [pollIntervalId]);

  const startProcessing = useCallback(async (config: ProcessingConfig) => {
    // Initialize progress for all videos
    const initialProgress = videos.map((video: Video) => ({
      videoId: video.id,
      progress: video.status === 'processed' ? 100 : 25,
      status: video.status === 'processed' ? 'completed' as const : 'processing' as const,
      message: video.status === 'processed' ? 'Already processed' : 'Starting processing...',
    }));
    setProcessingProgress(initialProgress);

    try {
      // Start the processing
      await processDatasetMutation.mutateAsync({ datasetId, config });
      
      // Start polling for updates
      startPolling();
    } catch (error) {
      console.error('Processing failed:', error);
      setProcessingProgress(prev => 
        prev.map(p => ({ ...p, status: 'error' as const, message: 'Processing failed' }))
      );
    }
  }, [datasetId, videos, processDatasetMutation, startPolling]);

  // Cleanup function to stop polling
  const cleanup = useCallback(() => {
    stopPolling();
  }, [stopPolling]);

  const canProcess = videos.length > 0 && getConfiguredVideosCount() > 0 && !processDatasetMutation.isPending;

  return {
    isProcessing: processDatasetMutation.isPending || !!pollIntervalId,
    processingProgress,
    getConfiguredVideosCount,
    getProcessedVideosCount,
    startProcessing,
    canProcess,
    cleanup,
    error: processDatasetMutation.error,
  };
}
