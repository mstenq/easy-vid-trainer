import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import "./index.css";
import { DatasetListPage } from './pages/DatasetListPage';
import { DatasetDetailPage } from './pages/DatasetDetailPage';

export function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<DatasetListPage />} />
          <Route path="/dataset/:id" element={<DatasetDetailPage />} />
          <Route path="/dataset/:id/video/:videoId" element={<DatasetDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
