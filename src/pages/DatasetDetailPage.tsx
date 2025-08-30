import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoList } from '@/components/VideoList';
import { VideoDetailPanel } from '@/components/VideoDetailPanel';
import { ProcessingPanel } from '@/components/ProcessingPanel';
import { VideoUploadZone } from '@/components/VideoUploadZone';
import { ArrowLeft, Upload } from 'lucide-react';
import type { Dataset, Video } from '@/types';
import api from '@/services/api';

export function DatasetDetailPage() {
  const { id, videoId } = useParams<{ id: string; videoId?: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDataset(parseInt(id));
    }
  }, [id]);

  // Separate effect to handle video selection after dataset is loaded
  useEffect(() => {
    if (dataset && dataset.videos && dataset.videos.length > 0) {
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

  const fetchDataset = async (datasetId: number) => {
    try {
      const data = await api.datasets.get(datasetId);
      if (!data) return;
      
      setDataset(data);
      // Video selection is now handled by the separate useEffect
    } catch (error) {
      console.error('Failed to fetch dataset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    navigate(`/dataset/${id}/video/${video.id}`, { replace: true });
  };

  const handleVideoUpdate = (updatedVideo: Video) => {
    if (!dataset || !dataset.videos) return;
    
    const updatedVideos = dataset.videos.map(video => 
      video.id === updatedVideo.id ? updatedVideo : video
    );
    
    setDataset({ ...dataset, videos: updatedVideos });
    setSelectedVideo(updatedVideo);
  };

  const handleVideoDelete = (videoId: number) => {
    if (!dataset || !dataset.videos) return;
    
    const updatedVideos = dataset.videos.filter(video => video.id !== videoId);
    setDataset({ ...dataset, videos: updatedVideos, videoCount: updatedVideos.length });
    
    // If the deleted video was selected, navigate to another video or back to the dataset
    if (selectedVideo && selectedVideo.id === videoId) {
      if (updatedVideos.length > 0) {
        // Navigate to the first remaining video
        navigate(`/dataset/${id}/video/${updatedVideos[0]!.id}`, { replace: true });
      } else {
        // No videos left, navigate back to the dataset list
        navigate('/datasets', { replace: true });
      }
    }
  };

  const handleVideoUpload = async (files: File[]) => {
    if (!dataset) return;
    
    try {
      const newVideos = await api.videos.upload(dataset.id, files);
      const updatedVideos = [...(dataset.videos || []), ...newVideos];
      setDataset({ ...dataset, videos: updatedVideos, videoCount: updatedVideos.length });
      setShowUpload(false);
      
      // Navigate to the first uploaded video if any were uploaded
      if (newVideos.length > 0) {
        navigate(`/dataset/${id}/video/${newVideos[0]!.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to upload videos:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dataset...</p>
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
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Videos
            </Button>
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
              <CardContent className="p-0">
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
    </div>
  );
}
