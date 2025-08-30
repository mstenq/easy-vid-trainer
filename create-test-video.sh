#!/bin/bash

# Create test-assets directory if it doesn't exist
mkdir -p test-assets

# Generate a simple 10-second test video using FFmpeg
# This creates a 1280x720 video with baseline profile for better compatibility
ffmpeg -y -f lavfi -i "testsrc2=duration=10:size=1280x720:rate=30" \
  -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='Test Video %{eif\:t\:d}s':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
  -c:v libx264 -preset fast -profile:v baseline -level 3.0 -pix_fmt yuv420p \
  -crf 23 -movflags +faststart \
  test-assets/test-video.mp4

echo "Test video created: test-assets/test-video.mp4"
