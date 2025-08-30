export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps?: number;
  frameCount?: number;
}

export async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
  const proc = Bun.spawn([
    'ffprobe',
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath
  ], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`FFprobe failed with code ${exitCode}: ${stderr}`);
  }

  try {
    const stdout = await new Response(proc.stdout).text();
    const data = JSON.parse(stdout);
    
    // Find the video stream
    const videoStream = data.streams?.find((stream: any) => stream.codec_type === 'video');
    
    if (!videoStream) {
      throw new Error('No video stream found in file');
    }

    const duration = parseFloat(data.format?.duration || videoStream.duration || '0');
    const width = parseInt(videoStream.width || '0');
    const height = parseInt(videoStream.height || '0');
    
    // Calculate FPS and frame count if available
    let fps: number | undefined;
    let frameCount: number | undefined;
    
    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
      if (den && den !== 0) {
        fps = num / den;
      }
    }
    
    if (fps && duration) {
      frameCount = Math.round(fps * duration);
    } else if (videoStream.nb_frames) {
      frameCount = parseInt(videoStream.nb_frames);
      if (frameCount && duration) {
        fps = frameCount / duration;
      }
    }

    if (!duration || !width || !height) {
      throw new Error('Could not extract required video metadata (duration, width, height)');
    }

    return {
      duration,
      width,
      height,
      fps: fps ? Math.round(fps * 100) / 100 : undefined, // Round to 2 decimal places
      frameCount
    };

  } catch (error) {
    throw new Error(`Failed to parse FFprobe output: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
