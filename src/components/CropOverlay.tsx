import { useMemo } from 'react';

interface CropOverlayProps {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  originalWidth: number;
  originalHeight: number;
  videoDisplayDimensions: {
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
  };
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  videoId: number;
  videoLoaded: boolean;
  tempPosition?: { x: number; y: number } | null;
}

export function CropOverlay({
  cropX,
  cropY,
  cropWidth,
  cropHeight,
  originalWidth,
  originalHeight,
  videoDisplayDimensions,
  isDragging,
  onMouseDown,
  videoId,
  videoLoaded,
  tempPosition
}: CropOverlayProps) {
  const overlayStyle = useMemo(() => {
    if (!videoLoaded || 
        videoDisplayDimensions.width <= 0 || 
        videoDisplayDimensions.height <= 0 || 
        originalWidth <= 0 || 
        originalHeight <= 0 || 
        cropX < 0 || 
        cropY < 0 || 
        cropX >= originalWidth || 
        cropY >= originalHeight) {
      return null;
    }

    // Use temp position during dragging if available
    const displayCropX = tempPosition ? tempPosition.x : cropX;
    const displayCropY = tempPosition ? tempPosition.y : cropY;

    const cropLeft = Math.max(0, videoDisplayDimensions.offsetX + (displayCropX / originalWidth) * videoDisplayDimensions.width);
    const cropTop = Math.max(0, videoDisplayDimensions.offsetY + (displayCropY / originalHeight) * videoDisplayDimensions.height);
    const cropWidthDisplay = Math.max(0, (cropWidth / originalWidth) * videoDisplayDimensions.width);
    const cropHeightDisplay = Math.max(0, (cropHeight / originalHeight) * videoDisplayDimensions.height);

    return {
      left: cropLeft,
      top: cropTop,
      width: cropWidthDisplay,
      height: cropHeightDisplay,
    };
  }, [
    videoLoaded,
    videoDisplayDimensions,
    originalWidth,
    originalHeight,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    tempPosition
  ]);

  if (!overlayStyle) {
    return null;
  }

  return (
    <div 
      key={`crop-${videoId}-${cropX}-${cropY}`}
      data-testid="crop-overlay"
      className={`absolute border-2 border-red-500 bg-red-500/20 cursor-move ${isDragging ? 'border-red-400' : ''}`}
      style={overlayStyle}
      onMouseDown={onMouseDown}
    />
  );
}
