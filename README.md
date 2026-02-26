# 🎬 ViralClip - Viral Video Clipping SAAS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.x-blue.svg)](https://python.org/)

**Automatically generate 30-60 second viral video clips from long-form YouTube videos.**

## ✨ Features

- 🎯 **AI-Powered Analysis** - Identifies the most engaging moments automatically
- ⚡ **Multi-Agent Processing** - Parallel processing for faster results
- 🛡️ **Bot Guard Resistant** - Advanced anti-detection for YouTube downloads
- 📱 **Social Media Ready** - 30-60 second clips optimized for TikTok, Reels, Shorts
- 🎨 **Vertical Format** - Optional 9:16 aspect ratio for mobile platforms
- 🌐 **Web Dashboard** - Beautiful, responsive UI for easy use
- 🔌 **REST API** - Easy integration with other applications

## 🚀 Quick Start

```bash
cd clipping
npm install
pip install yt-dlp
npm start
```

Visit **http://localhost:3000** to use the web dashboard!

## 📖 Documentation

- [Setup Guide](SETUP_GUIDE.md) - Complete installation instructions
- [Architecture](docs/architecture.md) - Technical documentation

## 💡 Usage Examples

### Command Line
```bash
node src/index.js "https://youtube.com/watch?v=VIDEO_ID" 5
```

### API
```bash
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://youtube.com/watch?v=VIDEO_ID", "clipCount": 5}'
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          Web Dashboard (React)              │
│              Port 3000                       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           Agent Manager                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Download │ │ Analysis │ │Extraction│    │
│  │  Agent   │ │  Agent   │ │  Agent   │    │
│  └──────────┘ └──────────┘ └──────────┘    │
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
- **Python** 3.x
- **FFmpeg** (video processing)
- **yt-dlp** (YouTube downloading)

## ⚠️ Important Notes

### YouTube Compliance
- Use responsibly and respect YouTube's Terms of Service
- Only download content you have rights to use

### Bot Guard Avoidance
The application includes several anti-detection measures:
- ✅ Rotating user agents
- ✅ Request rate limiting
- ✅ Retry mechanisms
- ✅ Proper browser headers

---

**Built with ❤️ by GravityClaw**