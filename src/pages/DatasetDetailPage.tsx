import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { VideoList } from '@/components/VideoList';
import { VideoDetailPanel } from '@/components/VideoDetailPanel';
import { ProcessingPanel } from '@/components/ProcessingPanel';
import { VideoUploadZone } from '@/components/VideoUploadZone';
import { ArrowLeft, Upload, Trash2 } from 'lucide-react';
import { useDataset, useDeleteDataset, useUploadVideos } from '@/hooks/useQueries';
import type { Video } from '@/types';

export function DatasetDetailPage() {
  const { id, videoId } = useParams<{ id: string; videoId?: string }>();
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const datasetId = id ? parseInt(id) : 0;
  const { data: dataset, isLoading, error } = useDataset(datasetId);
  const deleteDatasetMutation = useDeleteDataset();
  const uploadVideosMutation = useUploadVideos();

  // Handle video selection when dataset loads or videoId changes
  useEffect(() => {
    if (dataset?.videos && dataset.videos.length > 0) {
      if (videoId) {
        // Try to find the video with the specified ID
        const video = dataset.videos.find(v => v.id === parseInt(videoId));
        if (video) {
          setSelectedVideo(video);
        } else {
          // Video ID not found, redirect to first video
          navigate(`/dataset/${id}/video/${dataset.videos[0]!.id}`, { replace: true });
        }
      } else {
        // No video ID specified, redirect to first video
        navigate(`/dataset/${id}/video/${dataset.videos[0]!.id}`, { replace: true });
      }
    }
  }, [dataset, videoId, id, navigate]);

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    navigate(`/dataset/${id}/video/${video.id}`, { replace: true });
  };

  const handleVideoUpdate = (updatedVideo: Video) => {
    // The video update is now handled by the useCropManagement hook
    // and the TanStack Query mutations. This handler is kept for compatibility
    // but may be removed as components are updated to use the new hooks directly.
    setSelectedVideo(updatedVideo);
  };

  const handleVideoDelete = (videoId: number) => {
    // Video deletion is now handled by the useDeleteVideo mutation
    // If the deleted video was selected, navigate to another video or back to the dataset
    if (selectedVideo && selectedVideo.id === videoId) {
      const remainingVideos = dataset?.videos?.filter(v => v.id !== videoId) || [];
      if (remainingVideos.length > 0) {
        // Navigate to the first remaining video
        navigate(`/dataset/${id}/video/${remainingVideos[0]!.id}`, { replace: true });
      } else {
        // No videos left, navigate back to the dataset list
        navigate('/', { replace: true });
      }
    }
  };

  const handleVideoUpload = async (files: File[]) => {
    if (!dataset) return;
    
    try {
      const newVideos = await uploadVideosMutation.mutateAsync({ datasetId: dataset.id, files });
      setShowUpload(false);
      
      // Navigate to the first uploaded video if any were uploaded
      if (newVideos.length > 0) {
        navigate(`/dataset/${id}/video/${newVideos[0]!.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to upload videos:', error);
    }
  };

  const handleDatasetDelete = async () => {
    if (!dataset) return;
    
    try {
      await deleteDatasetMutation.mutateAsync(dataset.id);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Failed to delete dataset:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dataset...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load dataset</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Dataset not found</h2>
          <p className="text-muted-foreground mb-4">The requested dataset could not be found.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Datasets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{dataset.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {dataset.videos?.length || 0} videos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Dataset
              </Button>
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Videos
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Video List */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Videos</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[calc(100vh-200px)] overflow-y-auto">
                <VideoList
                  videos={dataset.videos || []}
                  selectedVideo={selectedVideo}
                  onVideoSelect={handleVideoSelect}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Video Detail and Processing */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-6">
            {selectedVideo ? (
              <VideoDetailPanel
                video={selectedVideo}
                onVideoUpdate={handleVideoUpdate}
                onVideoDelete={handleVideoDelete}
              />
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">Select a video to view details</p>
                </CardContent>
              </Card>
            )}

            <ProcessingPanel
              datasetId={dataset.id}
              videos={dataset.videos || []}
            />
          </div>
        </div>
      </div>

      {showUpload && (
        <VideoUploadZone
          onUpload={handleVideoUpload}
          onClose={() => setShowUpload(false)}
        />
      )}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dataset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{dataset?.name}"? This will permanently delete:
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>The dataset and all video records</li>
                <li>All uploaded video files</li>
                <li>All processed output files</li>
              </ul>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDatasetDelete}
            >
              Delete Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
