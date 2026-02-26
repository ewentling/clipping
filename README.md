# 🎬 GravityClaw – Viral Video Clipping SaaS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

**Automatically generate 30-60 second viral video clips from long-form YouTube videos using AI.**

## ✨ Features

### UI
- 🎯 **AI-Powered Analysis** – Identifies the most engaging moments automatically
- ⚡ **Multi-Agent Processing** – Parallel processing for faster results
- 🌙 **Dark Mode** – Full dark/light mode toggle, persisted to localStorage
- 📋 **Copy Link** – One-click copy of clip download URLs to clipboard
- 🐦 **Social Share** – Share clips directly to Twitter/X
- 🔍 **Sort & Filter** – Sort clips by viral score or duration; filter by type
- ✏️ **Inline Title Editing** – Click any clip title to rename it
- ⬇️ **Batch Download with Progress** – Download all clips with live counter
- 🕐 **Recent URLs** – Quick re-use of recently analyzed YouTube URLs
- 🔔 **Toast Notifications** – Friendly success/error/loading notifications
- 📱 **Mobile Responsive** – Full responsive layout for all screen sizes
- ♿ **Accessible** – ARIA labels, roles, keyboard navigation (press `?` for shortcuts)
- 🔄 **Retry Button** – Retry failed operations from the error banner
- 💡 **Rate Limit Feedback** – Friendly message when too many requests are made

### Backend
- 🛡️ **Bot Guard Resistant** – Advanced anti-detection for YouTube downloads
- 🌐 **REST API** – Full API for video analysis, clip generation, status polling, download & thumbnails
- 🔒 **Security** – CORS restrictions, input validation, security headers (CSP, X-Frame-Options, etc.)
- ⚙️ **Rate Limiting** – 100 requests per 15 minutes per IP

## 🚀 Quick Start

```bash
# Backend
cd backend
npm install
node server.js   # runs on http://localhost:3001

# Frontend (new terminal)
cd frontend
npm install
npm start        # runs on http://localhost:3000
```

## 📋 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/clips/analyze` | Analyze a YouTube video |
| POST | `/api/clips/generate` | Start clip generation job |
| GET | `/api/clips/status/:jobId` | Poll job status & progress |
| GET | `/api/clips/download/:clipId` | Download a clip |
| GET | `/api/clips/thumbnail/:clipId` | Get clip thumbnail |
| GET | `/api/clips/list` | List all clips |
| GET | `/api/videos/info?url=` | Get video metadata |
| GET | `/api/videos/validate?url=` | Validate a YouTube URL |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          Web Dashboard (React)              │
│  Dark Mode · Sort/Filter · Preview Modal   │
│           Port 3000                         │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│        Express Backend (Port 3001)           │
│  CORS · Rate Limit · Security Headers       │
│  clipRoutes · videoRoutes                   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Core Services                        │
│  • YouTube Downloader (yt-dlp)              │
│  • Clip Analyzer (FFmpeg + AI)              │
│  • Clip Generator (FFmpeg)                  │
└─────────────────────────────────────────────┘
```

## 📋 Requirements

- **Node.js** 18+
- **Python** 3.x (for yt-dlp)
- **FFmpeg** – video processing
- **yt-dlp** – YouTube downloading (`pip install yt-dlp`)

## ⚠️ Important Notes

Use responsibly and respect YouTube's Terms of Service. Only download content you have rights to use.

---

**Built with ❤️ by GravityClaw**
