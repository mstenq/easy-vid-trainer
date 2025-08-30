import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Upload, X, File, AlertCircle } from 'lucide-react';

interface VideoUploadZoneProps {
  onUpload: (files: File[]) => void;
  onClose: () => void;
}

export function VideoUploadZone({ onUpload, onClose }: VideoUploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      console.error('Some files were rejected:', rejectedFiles);
    }
    
    if (acceptedFiles.length > 0) {
      onUpload([...acceptedFiles]);
    }
  }, [onUpload]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    acceptedFiles,
    fileRejections
  } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    },
    multiple: true,
    maxSize: 1024 * 1024 * 1024 * 2 // 2GB max file size
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        resolve(`${mins}:${secs.toString().padStart(2, '0')}`);
      };
      
      video.onerror = () => {
        resolve('Unknown');
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Videos</DialogTitle>
          <DialogDescription>
            Drag and drop video files or click to browse. Supported formats: MP4, AVI, MOV, MKV, WebM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Zone */}
          <Card>
            <CardContent className="p-0">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg font-medium">Drop the videos here...</p>
                ) : (
                  <div>
                    <p className="text-lg font-medium mb-2">
                      Drag & drop videos here, or click to select
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Maximum file size: 2GB per video
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Accepted Files */}
          {acceptedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Selected Files ({acceptedFiles.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {acceptedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <File className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Files */}
          {fileRejections.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-red-600">
                <AlertCircle className="h-4 w-4 inline mr-1" />
                Rejected Files ({fileRejections.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {fileRejections.map((rejection: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rejection.file.name}</p>
                      <p className="text-xs text-red-600">
                        {rejection.errors.map((e: any) => e.message).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} data-testid="upload-cancel-button">
              Cancel
            </Button>
            <Button 
              data-testid="upload-submit-button"
              onClick={() => onUpload([...acceptedFiles])}
              disabled={acceptedFiles.length === 0}
            >
              Upload {acceptedFiles.length} Video{acceptedFiles.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
