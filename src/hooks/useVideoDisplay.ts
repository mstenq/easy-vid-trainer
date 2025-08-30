import { useState, useRef, useCallback, useEffect } from 'react';

interface VideoDisplayDimensions {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

interface UseVideoDisplayOptions {
  originalWidth: number;
  originalHeight: number;
  videoLoaded: boolean;
}

export function useVideoDisplay({ originalWidth, originalHeight, videoLoaded }: UseVideoDisplayOptions) {
  const [videoDisplayDimensions, setVideoDisplayDimensions] = useState<VideoDisplayDimensions>({ 
    width: 0, 
    height: 0, 
    offsetX: 0, 
    offsetY: 0 
  });
  
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  // Calculate actual video display dimensions considering object-contain
  const updateVideoDisplayDimensions = useCallback(() => {
    if (!videoContainerRef.current) return;
    
    const container = videoContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Ensure we have valid dimensions
    if (containerWidth === 0 || containerHeight === 0) {
      console.warn('Container has zero dimensions, delaying update');
      setTimeout(() => updateVideoDisplayDimensions(), 100);
      return;
    }
    
    const videoAspectRatio = originalWidth / originalHeight;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let displayWidth, displayHeight, offsetX, offsetY;
    
    if (videoAspectRatio > containerAspectRatio) {
      // Video is wider than container, fit by width
      displayWidth = containerWidth;
      displayHeight = containerWidth / videoAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Video is taller than container, fit by height
      displayHeight = containerHeight;
      displayWidth = containerHeight * videoAspectRatio;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }
    
    setVideoDisplayDimensions({ width: displayWidth, height: displayHeight, offsetX, offsetY });
  }, [originalWidth, originalHeight]);

  // Update dimensions when video loads or window resizes
  useEffect(() => {
    updateVideoDisplayDimensions();
    window.addEventListener('resize', updateVideoDisplayDimensions);
    return () => window.removeEventListener('resize', updateVideoDisplayDimensions);
  }, [updateVideoDisplayDimensions]);

  // Update dimensions when video loads
  useEffect(() => {
    if (videoLoaded) {
      const timer = setTimeout(() => {
        updateVideoDisplayDimensions();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [videoLoaded, updateVideoDisplayDimensions]);

  // Additional effect for more reliable dimension updates
  useEffect(() => {
    if (videoLoaded) {
      requestAnimationFrame(() => {
        updateVideoDisplayDimensions();
        setTimeout(() => updateVideoDisplayDimensions(), 100);
      });
    }
  }, [videoLoaded, updateVideoDisplayDimensions]);

  return {
    videoDisplayDimensions,
    videoContainerRef,
    updateVideoDisplayDimensions,
  };
}
