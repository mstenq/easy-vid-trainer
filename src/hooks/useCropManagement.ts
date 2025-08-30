import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { computeCropSizeForResolution, constrainCrop, centerCrop, isValidCrop } from '@/lib/video-utils';
import { useUpdateVideo } from './useQueries';
import type { Video } from '@/types';

interface UseCropManagementOptions {
  video: Video;
}

export function useCropManagement({ video }: UseCropManagementOptions) {
  // Local state for crop values (optimistic updates)
  const [localCrop, setLocalCrop] = useState({
    resolution: video.resolution,
    cropX: video.cropX,
    cropY: video.cropY,
    cropWidth: video.cropWidth || video.originalWidth,
    cropHeight: video.cropHeight || video.originalHeight,
  });

  const updateVideoMutation = useUpdateVideo();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset local state when video changes
  useEffect(() => {
    setLocalCrop({
      resolution: video.resolution,
      cropX: video.cropX,
      cropY: video.cropY,
      cropWidth: video.cropWidth || video.originalWidth,
      cropHeight: video.cropHeight || video.originalHeight,
    });
  }, [video.id, video.resolution, video.cropX, video.cropY, video.cropWidth, video.cropHeight, video.originalWidth, video.originalHeight]);

  // Debounced save function that uses current state
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setLocalCrop(currentCrop => {
        updateVideoMutation.mutate({
          id: video.id,
          data: {
            resolution: currentCrop.resolution,
            cropX: currentCrop.cropX,
            cropY: currentCrop.cropY,
            cropWidth: currentCrop.cropWidth,
            cropHeight: currentCrop.cropHeight,
          },
        });
        return currentCrop; // Return same state to avoid re-render
      });
      saveTimeoutRef.current = null;
    }, 500);
  }, [video.id, updateVideoMutation]);

  // Save immediately (cancel debounce)
  const saveImmediately = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    setLocalCrop(currentCrop => {
      updateVideoMutation.mutate({
        id: video.id,
        data: {
          resolution: currentCrop.resolution,
          cropX: currentCrop.cropX,
          cropY: currentCrop.cropY,
          cropWidth: currentCrop.cropWidth,
          cropHeight: currentCrop.cropHeight,
        },
      });
      return currentCrop;
    });
  }, [video.id, updateVideoMutation]);

  // Reset to video state from props
  const resetToVideoState = useCallback(() => {
    setLocalCrop({
      resolution: video.resolution,
      cropX: video.cropX,
      cropY: video.cropY,
      cropWidth: video.cropWidth || video.originalWidth,
      cropHeight: video.cropHeight || video.originalHeight,
    });
  }, [video.resolution, video.cropX, video.cropY, video.cropWidth, video.cropHeight, video.originalWidth, video.originalHeight]);

  // Update crop position
  const updateCropPosition = useCallback((newX: number, newY: number) => {
    setLocalCrop(currentCrop => {
      const constrained = constrainCrop(
        newX,
        newY,
        currentCrop.cropWidth,
        currentCrop.cropHeight,
        video.originalWidth,
        video.originalHeight
      );

      const newCrop = {
        ...currentCrop,
        cropX: constrained.x,
        cropY: constrained.y,
      };

      // Schedule save after state update
      setTimeout(() => scheduleSave(), 0);
      
      return newCrop;
    });
  }, [video.originalWidth, video.originalHeight, scheduleSave]);

  // Update crop size by scale
  const updateCropSize = useCallback((scale: number) => {
    setLocalCrop(currentCrop => {
      const { width: maxWidth, height: maxHeight } = computeCropSizeForResolution(
        currentCrop.resolution,
        video.originalWidth,
        video.originalHeight
      );

      const newWidth = Math.max(1, Math.round(maxWidth * scale));
      const newHeight = Math.max(1, Math.round(maxHeight * scale));

      // Adjust position if crop would exceed bounds
      const constrained = constrainCrop(
        currentCrop.cropX,
        currentCrop.cropY,
        newWidth,
        newHeight,
        video.originalWidth,
        video.originalHeight
      );

      const newCrop = {
        ...currentCrop,
        cropWidth: newWidth,
        cropHeight: newHeight,
        cropX: constrained.x,
        cropY: constrained.y,
      };

      // Schedule save after state update
      setTimeout(() => scheduleSave(), 0);

      return newCrop;
    });
  }, [video.originalWidth, video.originalHeight, scheduleSave]);

  // Reset crop to maximum size for current resolution
  const resetCropToMax = useCallback(() => {
    setLocalCrop(currentCrop => {
      const { width, height } = computeCropSizeForResolution(
        currentCrop.resolution,
        video.originalWidth,
        video.originalHeight
      );
      const centered = centerCrop(width, height, video.originalWidth, video.originalHeight);

      const newCrop = {
        ...currentCrop,
        cropWidth: width,
        cropHeight: height,
        cropX: centered.x,
        cropY: centered.y,
      };

      // Schedule save after state update
      setTimeout(() => scheduleSave(), 0);

      return newCrop;
    });
  }, [video.originalWidth, video.originalHeight, scheduleSave]);

  // Handle resolution change
  const handleResolutionChange = useCallback((newResolution: Video['resolution']) => {
    setLocalCrop(currentCrop => {
      const { width: newWidth, height: newHeight } = computeCropSizeForResolution(
        newResolution,
        video.originalWidth,
        video.originalHeight
      );

      // Preserve center position
      const centerX = currentCrop.cropX + currentCrop.cropWidth / 2;
      const centerY = currentCrop.cropY + currentCrop.cropHeight / 2;

      let newCropX = Math.max(0, centerX - newWidth / 2);
      let newCropY = Math.max(0, centerY - newHeight / 2);

      // Constrain to video bounds
      const constrained = constrainCrop(
        newCropX,
        newCropY,
        newWidth,
        newHeight,
        video.originalWidth,
        video.originalHeight
      );

      const newCrop = {
        ...currentCrop,
        resolution: newResolution,
        cropWidth: newWidth,
        cropHeight: newHeight,
        cropX: constrained.x,
        cropY: constrained.y,
      };

      // Save immediately for resolution changes
      setTimeout(() => {
        updateVideoMutation.mutate({
          id: video.id,
          data: newCrop,
        });
      }, 0);

      return newCrop;
    });
  }, [video.originalWidth, video.originalHeight, video.id, updateVideoMutation]);

  // Check if crop is valid and centered when needed
  const cropNeedsReset = useMemo(() => {
    return !isValidCrop(
      localCrop.cropX,
      localCrop.cropY,
      localCrop.cropWidth,
      localCrop.cropHeight,
      video.originalWidth,
      video.originalHeight
    );
  }, [localCrop.cropX, localCrop.cropY, localCrop.cropWidth, localCrop.cropHeight, video.originalWidth, video.originalHeight]);

  // Auto-fix invalid crop
  const fixInvalidCrop = useCallback(() => {
    if (cropNeedsReset) {
      setLocalCrop(currentCrop => {
        const centered = centerCrop(
          currentCrop.cropWidth,
          currentCrop.cropHeight,
          video.originalWidth,
          video.originalHeight
        );

        const newCrop = {
          ...currentCrop,
          cropX: centered.x,
          cropY: centered.y,
        };

        setTimeout(() => scheduleSave(), 0);
        return newCrop;
      });
    }
  }, [cropNeedsReset, video.originalWidth, video.originalHeight, scheduleSave]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State (using local optimistic state)
    resolution: localCrop.resolution,
    cropX: localCrop.cropX,
    cropY: localCrop.cropY,
    cropWidth: localCrop.cropWidth,
    cropHeight: localCrop.cropHeight,

    // Actions
    updateCropPosition,
    updateCropSize,
    resetCropToMax,
    handleResolutionChange,
    saveImmediately,
    resetToVideoState,
    fixInvalidCrop,
    cleanup,

    // Status
    isLoading: updateVideoMutation.isPending,
    error: updateVideoMutation.error,
    cropNeedsReset,
  };
}
