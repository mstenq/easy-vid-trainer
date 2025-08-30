import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import "./index.css";
import { DatasetListPage } from './pages/DatasetListPage';
import { DatasetDetailPage } from './pages/DatasetDetailPage';
import { queryClient } from './lib/query-client';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<DatasetListPage />} />
            <Route path="/dataset/:id" element={<DatasetDetailPage />} />
            <Route path="/dataset/:id/video/:videoId" element={<DatasetDetailPage />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
