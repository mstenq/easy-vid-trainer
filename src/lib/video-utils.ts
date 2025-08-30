import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { Video } from '@/types';

/**
 * Format time in seconds to MM:SS.MS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Format duration in seconds to MM:SS format (simplified)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get status icon component for video status
 */
export function getStatusIcon(status: Video['status']) {
  switch (status) {
    case 'processed':
      return CheckCircle;
    case 'error':
      return AlertCircle;
    case 'pending':
    default:
      return Clock;
  }
}

/**
 * Get status color class for video status
 */
export function getStatusColor(status: Video['status']): string {
  switch (status) {
    case 'processed':
      return 'text-green-500';
    case 'error':
      return 'text-red-500';
    case 'pending':
    default:
      return 'text-yellow-500';
  }
}

/**
 * Get status border color class for video status
 */
export function getStatusBorderColor(status: Video['status']): string {
  switch (status) {
    case 'processed':
      return 'border-l-green-500';
    case 'error':
      return 'border-l-red-500';
    case 'pending':
    default:
      return 'border-l-yellow-500';
  }
}

/**
 * Calculate crop size for a given resolution while maintaining aspect ratio
 */
export function computeCropSizeForResolution(
  resolution: Video['resolution'], 
  originalWidth: number, 
  originalHeight: number
): { width: number; height: number } {
  const [rw, rh] = resolution.split('x').map(Number);
  if (!rw || !rh) return { width: originalWidth, height: originalHeight };
  
  const targetAspect = rw / rh;
  const videoAspect = originalWidth / originalHeight;
  
  let width: number, height: number;
  
  // Choose the largest rectangle inside the original that matches aspect
  if (targetAspect > videoAspect) {
    // Limited by width
    width = originalWidth;
    height = Math.round(width / targetAspect);
  } else {
    // Limited by height
    height = originalHeight;
    width = Math.round(height * targetAspect);
  }
  
  return { width, height };
}

/**
 * Check if crop coordinates are valid (within bounds)
 */
export function isValidCrop(
  cropX: number,
  cropY: number, 
  cropWidth: number,
  cropHeight: number,
  originalWidth: number,
  originalHeight: number
): boolean {
  return (
    cropX >= 0 &&
    cropY >= 0 &&
    cropX + cropWidth <= originalWidth &&
    cropY + cropHeight <= originalHeight
  );
}

/**
 * Center crop within video bounds
 */
export function centerCrop(
  cropWidth: number,
  cropHeight: number,
  originalWidth: number,
  originalHeight: number
): { x: number; y: number } {
  const x = Math.max(0, (originalWidth - cropWidth) / 2);
  const y = Math.max(0, (originalHeight - cropHeight) / 2);
  return { x, y };
}

/**
 * Constrain crop to stay within video bounds
 */
export function constrainCrop(
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  originalWidth: number,
  originalHeight: number
): { x: number; y: number } {
  const maxX = originalWidth - cropWidth;
  const maxY = originalHeight - cropHeight;
  
  return {
    x: Math.max(0, Math.min(maxX, cropX)),
    y: Math.max(0, Math.min(maxY, cropY))
  };
}

/**
 * Check if a video is properly configured for processing
 */
export function isVideoConfigured(video: Video): boolean {
  return (
    video.startTime >= 0 && 
    video.resolution !== undefined && 
    video.cropWidth > 0 && 
    video.cropHeight > 0
  );
}

/**
 * Get video URL for the given video filepath
 */
export function getVideoUrl(filepath: string): string {
  return `http://localhost:3000/${filepath.replace(/^\/+/, '')}`;
}
