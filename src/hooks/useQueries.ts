import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import type { Dataset, Video, ProcessingConfig } from '@/types';

// Query Keys
export const queryKeys = {
  datasets: () => ['datasets'] as const,
  dataset: (id: number) => ['datasets', id] as const,
  video: (id: number) => ['videos', id] as const,
};

// Dataset Queries
export function useDatasets() {
  return useQuery({
    queryKey: queryKeys.datasets(),
    queryFn: api.datasets.list,
  });
}

export function useDataset(id: number) {
  return useQuery({
    queryKey: queryKeys.dataset(id),
    queryFn: () => api.datasets.get(id),
    enabled: !!id && !isNaN(id),
  });
}

// Dataset Mutations
export function useCreateDataset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.datasets.create,
    onSuccess: (newDataset) => {
      queryClient.setQueryData(queryKeys.datasets(), (old: Dataset[] = []) => [
        newDataset,
        ...old,
      ]);
    },
  });
}

export function useDeleteDataset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.datasets.delete,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(queryKeys.datasets(), (old: Dataset[] = []) =>
        old.filter(dataset => dataset.id !== deletedId)
      );
      queryClient.removeQueries({ queryKey: queryKeys.dataset(deletedId) });
    },
  });
}

// Video Mutations
export function useUpdateVideo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Video> }) =>
      api.videos.update(id, data),
    onSuccess: (updatedVideo) => {
      // Update the video in the dataset cache
      queryClient.setQueryData(
        queryKeys.dataset(updatedVideo.datasetId),
        (old: Dataset | undefined) => {
          if (!old || !old.videos) return old;
          return {
            ...old,
            videos: old.videos.map(video =>
              video.id === updatedVideo.id ? updatedVideo : video
            ),
          };
        }
      );
    },
  });
}

export function useDeleteVideo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.videos.delete,
    onSuccess: (_, deletedId) => {
      // Find which dataset this video belongs to and update its cache
      const datasets = queryClient.getQueriesData<Dataset>({ queryKey: ['datasets'] });
      
      datasets.forEach(([queryKey, dataset]) => {
        if (dataset && dataset.videos) {
          const hasVideo = dataset.videos.some(v => v.id === deletedId);
          if (hasVideo) {
            queryClient.setQueryData(queryKey, {
              ...dataset,
              videos: dataset.videos.filter(v => v.id !== deletedId),
              videoCount: dataset.videos.length - 1,
            });
          }
        }
      });
    },
  });
}

// Processing Mutation
export function useProcessDataset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ datasetId, config }: { datasetId: number; config: ProcessingConfig }) =>
      api.processing.processDataset(datasetId, config),
    onSuccess: (_, { datasetId }) => {
      // Invalidate the dataset to refetch updated video statuses
      queryClient.invalidateQueries({ queryKey: queryKeys.dataset(datasetId) });
    },
  });
}

// Upload Videos Mutation
export function useUploadVideos() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ datasetId, files }: { datasetId: number; files: File[] }) =>
      api.videos.upload(datasetId, files),
    onSuccess: (newVideos, { datasetId }) => {
      // Add new videos to the dataset cache
      queryClient.setQueryData(
        queryKeys.dataset(datasetId),
        (old: Dataset | undefined) => {
          if (!old) return old;
          return {
            ...old,
            videos: [...(old.videos || []), ...newVideos],
            videoCount: (old.videoCount || 0) + newVideos.length,
          };
        }
      );
    },
  });
}
