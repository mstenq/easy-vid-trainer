import { useState, useCallback, useEffect } from 'react';

interface UseDragOptions {
  onDragEnd: (newX: number, newY: number) => void;
  videoDisplayDimensions: { width: number; height: number; offsetX: number; offsetY: number };
  videoContainerRef: React.RefObject<HTMLDivElement | null>;
  originalWidth: number;
  originalHeight: number;
  cropWidth: number;
  cropHeight: number;
}

export function useDrag({
  onDragEnd,
  videoDisplayDimensions,
  videoContainerRef,
  originalWidth,
  originalHeight,
  cropWidth,
  cropHeight
}: UseDragOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempPosition, setTempPosition] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent, currentCropX: number, currentCropY: number) => {
    if (!videoContainerRef.current || !videoDisplayDimensions.width) return;
    
    setIsDragging(true);
    const rect = videoContainerRef.current.getBoundingClientRect();
    
    const cropDisplayX = videoDisplayDimensions.offsetX + (currentCropX / originalWidth) * videoDisplayDimensions.width;
    const cropDisplayY = videoDisplayDimensions.offsetY + (currentCropY / originalHeight) * videoDisplayDimensions.height;
    
    const offsetX = e.clientX - rect.left - cropDisplayX;
    const offsetY = e.clientY - rect.top - cropDisplayY;
    setDragOffset({ x: offsetX, y: offsetY });
    
    e.preventDefault();
  }, [videoContainerRef, videoDisplayDimensions, originalWidth, originalHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !videoContainerRef.current || !videoDisplayDimensions.width) return;
    
    const rect = videoContainerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left - dragOffset.x - videoDisplayDimensions.offsetX;
    const relativeY = e.clientY - rect.top - dragOffset.y - videoDisplayDimensions.offsetY;
    
    const newX = (relativeX / videoDisplayDimensions.width) * originalWidth;
    const newY = (relativeY / videoDisplayDimensions.height) * originalHeight;
    
    // Constrain to video bounds
    const maxX = originalWidth - cropWidth;
    const maxY = originalHeight - cropHeight;
    
    const constrainedX = Math.max(0, Math.min(maxX, newX));
    const constrainedY = Math.max(0, Math.min(maxY, newY));
    
    setTempPosition({ x: constrainedX, y: constrainedY });
  }, [isDragging, dragOffset, originalWidth, originalHeight, cropWidth, cropHeight, videoDisplayDimensions, videoContainerRef]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragEnd(tempPosition.x, tempPosition.y);
    }
  }, [isDragging, tempPosition, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    handleMouseDown,
    tempPosition: isDragging ? tempPosition : null,
  };
}
