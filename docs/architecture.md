# ViralClip Architecture Documentation

## System Overview

ViralClip is a multi-agent SAAS application that automatically generates 30-60 second viral video clips from long-form YouTube videos.

## Architecture

```
┌─────────────────────────────────────────────────┐
│            React Frontend (Port 3230)            │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ VideoInput  │ │ ClipGallery │ │Processing │ │
│  │ Component   │ │ Component   │ │  Status   │ │
│  └─────────────┘ └─────────────┘ └───────────┘ │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│          Express Backend (Port 3230)            │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ Clip Routes │ │Video Routes │ │   Auth    │ │
│  └─────────────┘ └─────────────┘ └───────────┘ │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│               Agent Manager                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │ Download │ │ Analysis │ │  Extraction  │    │
│  │  Agent   │ │  Agent   │ │    Agent     │    │
│  └──────────┘ └──────────┘ └──────────────┘    │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Core Services                       │
│  • YouTube Downloader (ytdl-core/yt-dlp)       │
│  • Clip Analyzer (FFmpeg + Audio Analysis)      │
│  • Clip Extractor (FFmpeg)                      │
└─────────────────────────────────────────────────┘
```

## API Endpoints

### Video Processing
- `POST /api/process` - Submit video for processing
- `GET /api/status/:jobId` - Check job status
- `GET /api/jobs` - List all jobs

### Clips
- `POST /api/clips/analyze` - Analyze video for viral moments
- `POST /api/clips/generate` - Generate clips from analyzed video
- `GET /api/clips/status/:jobId` - Get clip generation status
- `GET /api/clips/download/:clipId` - Download clip
- `GET /api/clips/thumbnail/:clipId` - Get clip thumbnail
- `GET /api/clips/list` - List all clips

### Videos
- `GET /api/videos/info` - Get video information
- `GET /api/videos/validate` - Validate video URL

## Agent System

### Download Agent
- Fetches video from YouTube using ytdl-core
- Implements anti-bot detection with rotating user agents
- Handles rate limiting and retries

### Analysis Agent
- Analyzes video for viral-worthy moments
- Detects audio energy peaks
- Identifies silence segments
- Scores potential clip locations

### Extraction Agent
- Creates 30-60 second clips using FFmpeg
- Supports vertical format for social media
- Handles batch processing

## Bot Guard Avoidance

1. **Rotating User Agents** - Cycles through Chrome, Firefox, Safari agents
2. **Request Delays** - Random 1-3 second delays between requests
3. **Proper Headers** - Sends realistic browser headers
4. **Retry Logic** - Exponential backoff on failures

## Configuration

Edit `src/core/config.js`:

```javascript
{
  MIN_CLIP_DURATION: 30,
  MAX_CLIP_DURATION: 60,
  DEFAULT_CLIPS_COUNT: 5,
  YOUTUBE: {
    USER_AGENTS: [...],
    MIN_DELAY: 1000,
    MAX_DELAY: 3000,
  }
}
```

## Dependencies

- **Node.js** 18+
- **Python** 3.x (for yt-dlp)
- **FFmpeg** (video processing)
- **yt-dlp** (YouTube downloading)

---

**Built by Clipnotic** 🚀
