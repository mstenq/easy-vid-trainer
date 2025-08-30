import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateDatasetModal } from '@/components/CreateDatasetModal';
import { Plus, Folder } from 'lucide-react';
import type { Dataset } from '@/types';
import api from '@/services/api';

export function DatasetListPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      const data = await api.datasets.list();
      setDatasets(data);
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDataset = async (name: string) => {
    try {
      const newDataset = await api.datasets.create(name);
      setDatasets(prev => [newDataset, ...prev]);
      setIsCreateModalOpen(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading datasets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Video Datasets</h1>
            <p className="text-muted-foreground">
              Manage your video training datasets
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Dataset
          </Button>
        </div>

        {datasets.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="mb-2">No datasets yet</CardTitle>
              <CardDescription className="mb-4">
                Create your first dataset to get started with video training
              </CardDescription>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Dataset
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {datasets.map((dataset) => (
              <Card 
                key={dataset.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/dataset/${dataset.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    {dataset.name}
                  </CardTitle>
                  <CardDescription>
                    Created {formatDate(dataset.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {dataset.videoCount || 0} videos
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CreateDatasetModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onCreateDataset={handleCreateDataset}
        />
      </div>
    </div>
  );
}
