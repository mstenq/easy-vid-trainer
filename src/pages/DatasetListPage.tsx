import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateDatasetModal } from '@/components/CreateDatasetModal';
import { Header } from '@/components/Header';
import { Plus, Folder, Video, Calendar, Sparkles } from 'lucide-react';
import { useDatasets, useCreateDataset } from '@/hooks/useQueries';

export function DatasetListPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  const { data: datasets = [], isLoading, error } = useDatasets();
  const createDatasetMutation = useCreateDataset();

  const handleCreateDataset = async (name: string) => {
    try {
      const newDataset = await createDatasetMutation.mutateAsync(name);
      setIsCreateModalOpen(false);
      // Navigate to the newly created dataset
      navigate(`/dataset/${newDataset.id}`);
    } catch (error) {
      console.error('Failed to create dataset:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
              <p className="text-lg font-medium">Loading datasets...</p>
              <p className="text-sm text-muted-foreground">Preparing your video training workspace</p>
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
              <p className="text-lg font-medium text-destructive">Failed to load datasets</p>
              <p className="text-sm text-muted-foreground">There was an error loading your datasets</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
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
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Dataset
        </Button>
      </Header>

      <main className="container mx-auto px-6 py-8">
        {datasets.length === 0 ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="max-w-md w-full text-center border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="py-12">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Folder className="h-10 w-10 text-primary" />
                  </div>
                  <Sparkles className="h-5 w-5 text-yellow-500 absolute top-0 right-1/2 transform translate-x-6 animate-pulse" />
                </div>
                <CardTitle className="mb-3 text-xl">Ready to start training?</CardTitle>
                <CardDescription className="mb-6 text-base">
                  Create your first dataset to begin organizing and processing your video training data
                </CardDescription>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Create Your First Dataset
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Your Datasets</h2>
                <p className="text-muted-foreground">
                  {datasets.length} dataset{datasets.length !== 1 ? 's' : ''} ready for training
                </p>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {datasets.map((dataset) => (
                <Card 
                  key={dataset.id} 
                  className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm"
                  onClick={() => navigate(`/dataset/${dataset.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                        <Folder className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                        {dataset.videoCount || 0} videos
                      </div>
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
                        {dataset.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDate(dataset.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <CreateDatasetModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onCreateDataset={handleCreateDataset}
        />
      </main>
    </div>
  );
}
