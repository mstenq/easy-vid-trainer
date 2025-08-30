import type { Dataset, Video, ProcessingConfig } from '@/types';

const API_BASE_URL = 'http://localhost:3000/api';

// Utility function to handle API responses
async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Dataset endpoints
  datasets: {
    async list(): Promise<Dataset[]> {
      const response = await fetch(`${API_BASE_URL}/datasets`);
      return handleResponse(response);
    },

    async get(id: number): Promise<Dataset | null> {
      const response = await fetch(`${API_BASE_URL}/datasets/${id}`);
      if (response.status === 404) return null;
      return handleResponse(response);
    },

    async create(name: string): Promise<Dataset> {
      const response = await fetch(`${API_BASE_URL}/datasets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      return handleResponse(response);
    }
  },

  // Video endpoints
  videos: {
    async get(id: number): Promise<Video | null> {
      const response = await fetch(`${API_BASE_URL}/videos/${id}`);
      if (response.status === 404) return null;
      return handleResponse(response);
    },

    async update(id: number, updates: Partial<Video>): Promise<Video> {
      const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      return handleResponse(response);
    },

    async delete(id: number): Promise<void> {
      const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
        method: 'DELETE'
      });
      await handleResponse(response);
    },

    async upload(datasetId: number, files: File[]): Promise<Video[]> {
      const formData = new FormData();
      
      // Add all files to form data
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/videos`, {
        method: 'POST',
        body: formData // Don't set Content-Type header, let browser set it for multipart
      });
      return handleResponse(response);
    }
  },

  // Processing endpoints
  processing: {
    async processDataset(datasetId: number, config: ProcessingConfig): Promise<void> {
      const response = await fetch(`${API_BASE_URL}/datasets/${datasetId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      await handleResponse(response);
    }
  }
};

export default api;