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
import { Upload, X, File, AlertCircle, Video, Sparkles } from 'lucide-react';

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-center space-y-3">
          <div className="relative mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-xl">Upload Videos</DialogTitle>
            <DialogDescription className="text-base">
              Add videos to your dataset. Supported formats: MP4, AVI, MOV, MKV, WebM
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Zone */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive 
                    ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 scale-[0.98]' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <input {...getInputProps()} />
                <div className="relative">
                  <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center transition-all ${
                    isDragActive ? 'bg-primary/20 scale-110' : 'bg-muted/30'
                  }`}>
                    <Video className={`h-10 w-10 transition-colors ${
                      isDragActive ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  {isDragActive && (
                    <div className="absolute -top-2 -right-2">
                      <Sparkles className="h-6 w-6 text-yellow-500 animate-bounce" />
                    </div>
                  )}
                </div>
                {isDragActive ? (
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-primary">Drop the videos here!</p>
                    <p className="text-sm text-primary/70">Release to add them to your dataset</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-lg font-semibold">
                      Drag & drop videos here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse your files
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      Maximum file size: 2GB per video
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Accepted Files */}
          {acceptedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h4 className="font-semibold">Ready to Upload ({acceptedFiles.length})</h4>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {acceptedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-green-50/50 dark:from-green-950/20 dark:to-green-950/10 rounded-lg border border-green-200/50 dark:border-green-800/50">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <div className="text-green-600 dark:text-green-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Files */}
          {fileRejections.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <h4 className="font-semibold text-destructive">
                  Issues Found ({fileRejections.length})
                </h4>
              </div>
              <div className="space-y-3 max-h-32 overflow-y-auto">
                {fileRejections.map((rejection: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gradient-to-r from-destructive/5 to-destructive/10 rounded-lg border border-destructive/20">
                    <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rejection.file.name}</p>
                      <p className="text-xs text-destructive">
                        {rejection.errors.map((e: any) => e.message).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose} data-testid="upload-cancel-button">
              Cancel
            </Button>
            <Button 
              data-testid="upload-submit-button"
              onClick={() => onUpload([...acceptedFiles])}
              disabled={acceptedFiles.length === 0}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload {acceptedFiles.length} Video{acceptedFiles.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
