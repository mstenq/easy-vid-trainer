import { useState, useRef, useCallback, useEffect } from 'react';
import { isVideoConfigured } from '@/lib/video-utils';
import type { Video, ProcessingProgress, ProcessingConfig } from '@/types';
import api from '@/services/api';

interface UseProcessingOptions {
  datasetId: number;
  videos: Video[];
}

export function useProcessing({ datasetId, videos }: UseProcessingOptions) {
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

  const getConfiguredVideosCount = useCallback(() => {
    return videos.filter(isVideoConfigured).length;
  }, [videos]);

  const getProcessedVideosCount = useCallback(() => {
    return videos.filter((video: Video) => video.status === 'processed').length;
  }, [videos]);

  const startProcessing = useCallback(async (config: ProcessingConfig) => {
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
                    message = 'Waiting to start...';
                  }
              }

              return {
                videoId: video.id,
                progress,
                status,
                message,
              };
            });

            // Check if all videos are completed or errored
            const allDone = updatedProgress.every(p => p.status === 'completed' || p.status === 'error');
            if (allDone && isProcessing) {
              // Stop polling after a short delay to let final state settle
              setTimeout(() => {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                  pollIntervalRef.current = null;
                }
                setIsProcessing(false);
              }, 2000);
            }

            return updatedProgress;
          });
        } catch (error) {
          console.error('Error polling dataset status:', error);
        }
      }, 2000); // Poll every 2 seconds

      // Call the API to start processing
      await api.processing.processDataset(datasetId, config);

      // Stop processing after 5 minutes (safety net)
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
        prev.map(p => ({ ...p, status: 'error' as const, message: 'Processing failed' }))
      );
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsProcessing(false);
    }
  }, [datasetId, videos, isProcessing]);

  const canProcess = videos.length > 0 && getConfiguredVideosCount() > 0 && !isProcessing;

  return {
    isProcessing,
    processingProgress,
    getConfiguredVideosCount,
    getProcessedVideosCount,
    startProcessing,
    canProcess,
  };
}
