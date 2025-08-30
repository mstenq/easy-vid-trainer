import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { formatTime, computeCropSizeForResolution } from '@/lib/video-utils';
import type { Video } from '@/types';

interface VideoConfigurationPanelProps {
  video: Video;
  startTime: number;
  currentTime: number;
  resolution: Video['resolution'];
  cropWidth: number;
  cropHeight: number;
  isDeleting: boolean;
  onStartTimeChange: (startTime: number) => void;
  onCurrentAsStart: () => void;
  onResolutionChange: (resolution: Video['resolution']) => void;
  onCropSizeChange: (scale: number) => void;
  onResetCropToMax: () => void;
  onDeleteVideo: () => void;
}

export function VideoConfigurationPanel({
  video,
  startTime,
  currentTime,
  resolution,
  cropWidth,
  cropHeight,
  isDeleting,
  onStartTimeChange,
  onCurrentAsStart,
  onResolutionChange,
  onCropSizeChange,
  onResetCropToMax,
  onDeleteVideo
}: VideoConfigurationPanelProps) {
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStartTimeChange(parseFloat(e.target.value) || 0);
  };

  const handleCropSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const scale = parseInt(e.target.value) / 100;
    onCropSizeChange(scale);
  };

  const getCropSizePercentage = () => {
    const { width: maxW, height: maxH } = computeCropSizeForResolution(
      resolution, 
      video.originalWidth, 
      video.originalHeight
    );
    if (maxW === 0 || maxH === 0) return 100;
    const scaleW = (cropWidth / maxW) * 100;
    const scaleH = (cropHeight / maxH) * 100;
    return Math.min(scaleW, scaleH);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Configuration</CardTitle>
        <CardDescription>
          Configure start time, resolution, and crop settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Start Time */}
        <div className="space-y-2">
          <Label>Start Time</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={startTime}
              onChange={handleStartTimeChange}
              step="0.1"
              min="0"
              max={video.duration}
              className="flex-1"
            />
            <Button size="sm" variant="outline" onClick={onCurrentAsStart}>
              Use Current ({formatTime(currentTime)})
            </Button>
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <Label>Output Resolution</Label>
          <Select value={resolution} onValueChange={onResolutionChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1280x720">1280×720 (16:9 Landscape)</SelectItem>
              <SelectItem value="720x1280">720×1280 (9:16 Portrait)</SelectItem>
              <SelectItem value="768x768">768×768 (1:1 Square)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Crop Dimensions */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Crop Size</Label>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onResetCropToMax}
              className="text-xs"
            >
              Reset to Max
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Size</span>
              <span className="text-sm font-mono">{Math.round(cropWidth)}×{Math.round(cropHeight)}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={getCropSizePercentage()}
              onChange={handleCropSizeChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>
        </div>

        {/* Delete Video */}
        <Button 
          variant="destructive" 
          onClick={onDeleteVideo}
          disabled={isDeleting}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? 'Deleting...' : 'Delete Video'}
        </Button>
      </CardContent>
    </Card>
  );
}
