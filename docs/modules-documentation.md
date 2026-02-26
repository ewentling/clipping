# Modules Documentation

## Overview

The clipping application uses a modular architecture for easy maintenance and scalability.

## Core Modules

### 1. Agent Manager (`src/agents/agent-manager.js`)
Manages the lifecycle of processing agents.

**Responsibilities:**
- Spawn download, analysis, and extraction agents
- Manage concurrent agent execution
- Handle agent communication

**Usage:**
```javascript
const agentManager = require('./agents/agent-manager');
const agent = agentManager.spawnAgent('download', 'task-1', { videoUrl });
```

### 2. YouTube Downloader (`src/core/youtube-downloader.js`)
Handles YouTube video downloads with anti-bot measures.

**Features:**
- Rotating user agents
- Request rate limiting
- Progress tracking

**Methods:**
- `getVideoInfo(videoUrl)` - Fetch video metadata
- `downloadVideo(videoUrl, outputPath)` - Download video

### 3. Clip Analyzer (`src/core/clip-analyzer.js`)
Analyzes video content for viral moments.

**Analysis Types:**
- Audio energy peaks
- Silence detection
- Scene changes

### 4. Clip Extractor (`src/core/clip-extractor.js`)
Creates video clips using FFmpeg.

**Features:**
- Batch processing
- Parallel extraction
- Vertical format support

## Services

### Clip Generator
High-level clip creation service.

### Video Downloader
Alternative downloader using yt-dlp.

### Viral Analyzer
Advanced viral moment detection.

### Viral Metadata Generator
Generates titles, tags, and hashtags.

## Configuration

All modules read from `src/core/config.js`.

---

**Built by GravityClaw** 🚀
