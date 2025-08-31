import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { VideoList } from '@/components/VideoList';
import { VideoDetailPanel } from '@/components/VideoDetailPanel';
import { ProcessingPanel } from '@/components/ProcessingPanel';
import { VideoUploadZone } from '@/components/VideoUploadZone';
import { Header } from '@/components/Header';
import { ArrowLeft, Upload, Trash2, Video, Sparkles } from 'lucide-react';
import { useDataset, useDeleteDataset, useUploadVideos } from '@/hooks/useQueries';
import type { Video as VideoType } from '@/types';

export function DatasetDetailPage() {
  const { id, videoId } = useParams<{ id: string; videoId?: string }>();
  const navigate = useNavigate();
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
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

  const handleVideoSelect = (video: VideoType) => {
    setSelectedVideo(video);
    navigate(`/dataset/${id}/video/${video.id}`, { replace: true });
  };

  const handleVideoUpdate = (updatedVideo: VideoType) => {
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
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium">Loading dataset...</p>
              <p className="text-sm text-muted-foreground">Preparing your video workspace</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Video className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-destructive">Failed to load dataset</p>
              <p className="text-sm text-muted-foreground">There was an error loading the dataset</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto">
              <Video className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Dataset not found</h2>
              <p className="text-sm text-muted-foreground">The requested dataset could not be found.</p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Datasets
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Datasets
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowDeleteConfirm(true)}
          className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
        <Button 
          onClick={() => setShowUpload(true)}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload Videos
        </Button>
      </Header>

      <main className="container mx-auto px-6 py-8">
        {/* Dataset Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{dataset.name}</h1>
              <p className="text-muted-foreground">
                {dataset.videos?.length || 0} video{(dataset.videos?.length || 0) !== 1 ? 's' : ''} in this dataset
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Video List */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3">
            <Card className="bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Videos
                  <span className="text-sm font-normal text-muted-foreground ml-auto">
                    {dataset.videos?.length || 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[calc(100vh-280px)] overflow-y-auto">
                <VideoList
                  videos={dataset.videos || []}
                  selectedVideo={selectedVideo}
                  onVideoSelect={handleVideoSelect}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Video Detail and Processing */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9 space-y-8">
            {selectedVideo ? (
              <VideoDetailPanel
                video={selectedVideo}
                onVideoUpdate={handleVideoUpdate}
                onVideoDelete={handleVideoDelete}
              />
            ) : (
              <Card className="bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border-2 border-dashed border-muted-foreground/25">
                <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-muted-foreground">Select a video to begin</p>
                    <p className="text-sm text-muted-foreground">Choose a video from the list to configure and process</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <ProcessingPanel
              datasetId={dataset.id}
              videos={dataset.videos || []}
            />
          </div>
        </div>
      </main>

      {showUpload && (
        <VideoUploadZone
          onUpload={handleVideoUpload}
          onClose={() => setShowUpload(false)}
        />
      )}

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Dataset
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{dataset?.name}"</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-medium text-destructive mb-2">This will permanently delete:</p>
              <ul className="list-disc list-inside text-sm space-y-1 text-destructive/80">
                <li>The dataset and all video records</li>
                <li>All uploaded video files</li>
                <li>All processed output files</li>
              </ul>
            </div>
            <p className="text-sm font-medium">This action cannot be undone.</p>
          </div>
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
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Dataset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
