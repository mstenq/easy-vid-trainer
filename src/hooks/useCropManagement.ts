import { useState, useCallback, useEffect, useRef } from 'react';
import { computeCropSizeForResolution, constrainCrop, centerCrop, isValidCrop } from '@/lib/video-utils';
import type { Video } from '@/types';

interface UseCropManagementOptions {
  video: Video;
  onVideoUpdate: (video: Video) => void;
}

export function useCropManagement({ video, onVideoUpdate }: UseCropManagementOptions) {
  const [resolution, setResolution] = useState<Video['resolution']>(video.resolution);
  const [cropX, setCropX] = useState(video.cropX);
  const [cropY, setCropY] = useState(video.cropY);
  const [cropWidth, setCropWidth] = useState(video.cropWidth || video.originalWidth);
  const [cropHeight, setCropHeight] = useState(video.cropHeight || video.originalHeight);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Use refs to avoid stale closure issues
  const cropXRef = useRef(cropX);
  const cropYRef = useRef(cropY);
  const cropWidthRef = useRef(cropWidth);
  const cropHeightRef = useRef(cropHeight);
  const resolutionRef = useRef(resolution);

  // Update refs when state changes
  useEffect(() => {
    cropXRef.current = cropX;
  }, [cropX]);

  useEffect(() => {
    cropYRef.current = cropY;
  }, [cropY]);

  useEffect(() => {
    cropWidthRef.current = cropWidth;
  }, [cropWidth]);

  useEffect(() => {
    cropHeightRef.current = cropHeight;
  }, [cropHeight]);

  useEffect(() => {
    resolutionRef.current = resolution;
  }, [resolution]);

  // Reset state when video changes
  useEffect(() => {
    setResolution(video.resolution);
    setCropX(video.cropX);
    setCropY(video.cropY);
    setCropWidth(video.cropWidth || video.originalWidth);
    setCropHeight(video.cropHeight || video.originalHeight);
  }, [video.id]); // Only depend on video.id to avoid resetting when crop values change

  // Debounced save function
  const debouncedSave = useCallback(async () => {
    const updatedVideo: Video = {
      ...video,
      resolution: resolutionRef.current,
      cropX: cropXRef.current,
      cropY: cropYRef.current,
      cropWidth: cropWidthRef.current,
      cropHeight: cropHeightRef.current,
    };

    try {
      onVideoUpdate(updatedVideo);
    } catch (error) {
      console.error('Failed to update video:', error);
    }
  }, [onVideoUpdate, video]); // Only depend on onVideoUpdate and video

  // Debounced save with timeout
  const scheduleSave = useCallback(() => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(() => {
      debouncedSave();
    }, 500);
    
    setSaveTimeout(timeout);
  }, [saveTimeout, debouncedSave]);

  // Clean up save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  // When resolution changes, adjust crop to fit new aspect ratio
  useEffect(() => {
    // Only recalculate if resolution actually changed
    if (resolution === video.resolution) return;
    
    const { width: newWidth, height: newHeight } = computeCropSizeForResolution(
      resolution, 
      video.originalWidth, 
      video.originalHeight
    );
    
    // Preserve center position
    const centerX = cropX + cropWidth / 2;
    const centerY = cropY + cropHeight / 2;
    
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
    
    setCropWidth(newWidth);
    setCropHeight(newHeight);
    setCropX(constrained.x);
    setCropY(constrained.y);
  }, [resolution, video.resolution, video.originalWidth, video.originalHeight]);

  // Auto-save when resolution changes (immediate)
  useEffect(() => {
    if (resolution !== video.resolution) {
      debouncedSave();
    }
  }, [resolution, video.resolution, debouncedSave]);

  // Center crop when it goes out of bounds (only run when video changes or crop becomes invalid)
  useEffect(() => {
    // Only run this when the video itself changes, not when crop coordinates change
    if (!isValidCrop(cropX, cropY, cropWidth, cropHeight, video.originalWidth, video.originalHeight)) {
      const centered = centerCrop(cropWidth, cropHeight, video.originalWidth, video.originalHeight);
      setCropX(centered.x);
      setCropY(centered.y);
    }
  }, [video.id, video.originalWidth, video.originalHeight]); // Only depend on video properties, not crop state

  const updateCropPosition = useCallback((newX: number, newY: number) => {
    const constrained = constrainCrop(
      newX, 
      newY, 
      cropWidth, 
      cropHeight, 
      video.originalWidth, 
      video.originalHeight
    );
    
    setCropX(constrained.x);
    setCropY(constrained.y);
  }, [cropWidth, cropHeight, video.originalWidth, video.originalHeight]);

  const updateCropSize = useCallback((scale: number) => {
    const { width: maxWidth, height: maxHeight } = computeCropSizeForResolution(
      resolution, 
      video.originalWidth, 
      video.originalHeight
    );
    
    const newWidth = Math.max(1, Math.round(maxWidth * scale));
    const newHeight = Math.max(1, Math.round(maxHeight * scale));
    
    setCropWidth(newWidth);
    setCropHeight(newHeight);
    
    // Adjust position if crop would exceed bounds
    const constrained = constrainCrop(
      cropX, 
      cropY, 
      newWidth, 
      newHeight, 
      video.originalWidth, 
      video.originalHeight
    );
    setCropX(constrained.x);
    setCropY(constrained.y);
    
    scheduleSave();
  }, [resolution, video.originalWidth, video.originalHeight, cropX, cropY, scheduleSave]);

  const resetCropToMax = useCallback(() => {
    const { width, height } = computeCropSizeForResolution(
      resolution, 
      video.originalWidth, 
      video.originalHeight
    );
    const centered = centerCrop(width, height, video.originalWidth, video.originalHeight);
    
    setCropWidth(width);
    setCropHeight(height);
    setCropX(centered.x);
    setCropY(centered.y);
    scheduleSave();
  }, [resolution, video.originalWidth, video.originalHeight, scheduleSave]);

  const handleResolutionChange = useCallback((newResolution: Video['resolution']) => {
    setResolution(newResolution);
  }, []);

  const saveCropChanges = useCallback(async () => {
    await debouncedSave();
  }, [debouncedSave]);

  return {
    // State
    resolution,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    
    // Actions
    updateCropPosition,
    updateCropSize,
    resetCropToMax,
    handleResolutionChange,
    saveCropChanges,
    scheduleSave,
  };
}
