# 📋 Requirements Specification

## 1. High-Level Overview
- **Goal:** Build a React SPA (with Tailwind + shadcn/ui) for managing datasets of videos.  
- **Workflow:**  
  1. User creates a dataset.  
  2. User drags and drops videos into the dataset.  
  3. User can browse videos in the dataset, preview them, mark start time, select resolution, and define crop.  
  4. Once all videos are configured, user triggers processing.  
  5. React sends video config data to a Bun API.  
  6. Bun API uses FFMPEG to process videos and saves outputs.  
  7. SQLite DB tracks dataset, video metadata, and processing state.  

---

## 2. Frontend (React + Tailwind + shadcn/ui)

### Pages / Views
1. **Dataset List Page**
   - Sidebar with list of datasets.  
   - Button: "Create Dataset" (modal with name input).  
   - Clicking dataset opens Dataset Detail page.  

2. **Dataset Detail Page**
   - **Layout:**  
     - **Left column:** Scrollable list of videos in the dataset.  
     - **Right column:** Video detail view.  
   - **Video List:**  
     - Thumbnails or filenames.  
     - Click to load video in detail panel.  
   - **Video Detail Panel:**  
     - Video player with play/pause, scrubber, and ability to mark **start time**.  
     - Resolution selector (radio buttons): `1280x720`, `720x1280`, `768x768`.  
     - Crop selection UI:  
       - Preferred: draggable crop overlay.  
       - Fallback: numeric inputs for `x`, `y`, `width`, `height`.  
     - Preview updates dynamically based on crop.  
     - Save button updates DB.  

3. **Processing Panel (per dataset)**
   - FPS input (numeric).  
   - Frame count input (numeric).  
   - "Process Videos" button.  
   - Progress indicators per video.  

---

## 3. Backend (Bun + FFMPEG + SQLite/Drizzle)

### API Endpoints
- **Datasets**
  - `POST /datasets` → create dataset.  
  - `GET /datasets` → list datasets.  
  - `GET /datasets/:id` → get dataset with videos.  
- **Videos**
  - `POST /datasets/:id/videos` → upload video(s).  
  - `GET /videos/:id` → get video metadata.  
  - `PATCH /videos/:id` → update metadata (start time, resolution, crop).  
- **Processing**
  - `POST /datasets/:id/process` → trigger processing with FPS + frame count.  
  - Bun runs FFMPEG, saves output to `output/<datasetName>/vid_0001.mp4`.  

---

## 4. Data Model (SQLite via Drizzle)

### Tables
#### `datasets`
- `id` (PK)  
- `name` (string)  
- `createdAt` (datetime)  

#### `videos`
- `id` (PK)  
- `datasetId` (FK → datasets.id)  
- `filename` (string)  
- `filepath` (string, e.g., `datasets/<datasetName>/vid_0001.mp4`)  
- `duration` (float, seconds)  
- `originalWidth` (int)  
- `originalHeight` (int)  
- `startTime` (float, default 0.0)  
- `resolution` (enum: `1280x720`, `720x1280`, `768x768`)  
- `cropX` (int)  
- `cropY` (int)  
- `cropWidth` (int)  
- `cropHeight` (int)  
- `fps` (int, nullable until processing)  
- `frameCount` (int, nullable until processing)  
- `status` (enum: `pending`, `processed`, `error`)  

---

## 5. File Storage
- Uploaded videos → `datasets/<datasetName>/vid_0001.mp4`.  
- Processed videos → `output/<datasetName>/vid_0001.mp4`.  

---

## 6. Processing Flow
1. User configures start, resolution, crop.  
2. User specifies FPS + frame count at dataset level.  
3. React calls `POST /datasets/:id/process`.  
4. Bun iterates through videos in dataset:  
   - Runs FFMPEG with options:  
     - `-ss <startTime>
