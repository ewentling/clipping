/**
 * Video Downloader Service
 * Handles YouTube video downloads without triggering bot guards
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class VideoDownloader {
  constructor(outputDir = './temp') {
    this.outputDir = outputDir;
    this.userAgent = this.getRandomUserAgent();
  }

  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async getVideoInfo(url) {
    const videoId = this.extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    return new Promise((resolve, reject) => {
      const args = [url, '--dump-json', '--no-warnings', '--user-agent', this.userAgent, '--geo-bypass'];
      const ytDlp = spawn('yt-dlp', args);
      let output = '';

      ytDlp.stdout.on('data', (data) => { output += data.toString(); });
      ytDlp.on('close', (code) => {
        if (code === 0) {
          try {
            const info = JSON.parse(output);
            resolve({
              videoId: info.id,
              title: info.title,
              duration: info.duration,
              uploader: info.uploader,
              viewCount: info.view_count,
              thumbnail: info.thumbnail,
              url: url,
            });
          } catch (e) {
            reject(new Error('Failed to parse video info'));
          }
        } else {
          reject(new Error('Failed to get video info'));
        }
      });
    });
  }

  async downloadVideo(url) {
    const videoId = this.extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    const outputFile = path.join(this.outputDir, `${videoId}.%(ext)s`);
    
    return new Promise((resolve, reject) => {
      const args = [
        url, '-o', outputFile, '-f', 'best', '--no-playlist',
        '--user-agent', this.userAgent, '--geo-bypass', '--no-warnings'
      ];
      const ytDlp = spawn('yt-dlp', args);

      ytDlp.on('close', (code) => {
        if (code === 0) {
          const files = fs.readdirSync(this.outputDir);
          const downloadedFile = files.find(f => f.startsWith(videoId));
          if (downloadedFile) {
            resolve({ videoId, path: path.join(this.outputDir, downloadedFile), originalUrl: url });
          } else {
            reject(new Error('Download completed but file not found'));
          }
        } else {
          reject(new Error(`Download failed with code ${code}`));
        }
      });
    });
  }
}

module.exports = VideoDownloader;
