/**
 * YouTube Downloader Agent
 * Handles YouTube video downloads while avoiding bot detection
 */

const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { randomInt } = require('crypto');

class YouTubeDownloaderAgent {
  constructor() {
    this.currentAgentIndex = 0;
    this.requestCount = 0;
  }

  async getVideoInfo(videoUrl) {
    try {
      console.log(`[YouTube Agent] Fetching info for: ${videoUrl}`);
      
      if (!ytdl.validateURL(videoUrl)) {
        throw new Error('Invalid YouTube URL');
      }

      const info = await ytdl.getInfo(videoUrl, {
        agent: this._getRandomAgent(),
      });

      return {
        success: true,
        data: {
          videoId: info.videoDetails.videoId,
          title: info.videoDetails.title,
          description: info.videoDetails.description,
          duration: parseInt(info.videoDetails.lengthSeconds),
          thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
          author: info.videoDetails.author.name,
          viewCount: info.videoDetails.viewCount,
          publishDate: info.videoDetails.publishDate,
        },
      };
    } catch (error) {
      console.error('[YouTube Agent] Error fetching video info:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async downloadVideo(videoUrl, outputPath) {
    try {
      console.log(`[YouTube Agent] Starting download: ${videoUrl}`);
      
      if (!ytdl.validateURL(videoUrl)) {
        throw new Error('Invalid YouTube URL');
      }

      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      return new Promise((resolve, reject) => {
        const stream = ytdl(videoUrl, {
          quality: 'highestvideo',
          agent: this._getRandomAgent(),
          requestOptions: {
            headers: {
              'User-Agent': this._getRandomAgent(),
              'Accept-Language': 'en-US,en;q=0.9',
            },
          },
        });

        const writeStream = fs.createWriteStream(outputPath);
        
        let downloadedBytes = 0;
        let totalBytes = 0;
        let lastProgress = 0;

        stream.on('info', (info, format) => {
          totalBytes = info.contentLength;
          console.log(`[YouTube Agent] Downloading: ${info.videoDetails.title}`);
        });

        stream.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const progress = Math.round((downloadedBytes / totalBytes) * 100);
          
          if (progress - lastProgress >= 10) {
            console.log(`[YouTube Agent] Download progress: ${progress}%`);
            lastProgress = progress;
          }
        });

        stream.pipe(writeStream);

        writeStream.on('finish', () => {
          console.log(`[YouTube Agent] Download complete: ${outputPath}`);
          resolve({ success: true, path: outputPath });
        });

        stream.on('error', (error) => {
          console.error('[YouTube Agent] Download error:', error.message);
          reject({ success: false, error: error.message });
        });

        writeStream.on('error', (error) => {
          console.error('[YouTube Agent] Write error:', error.message);
          stream.destroy();
          reject({ success: false, error: error.message });
        });
      });
    } catch (error) {
      console.error('[YouTube Agent] Download failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  _getRandomAgent() {
    const agents = config.YOUTUBE.USER_AGENTS;
    return agents[Math.floor(Math.random() * agents.length)];
  }

  async _randomDelay() {
    const delay = randomInt(config.YOUTUBE.MIN_DELAY, config.YOUTUBE.MAX_DELAY);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

module.exports = YouTubeDownloaderAgent;
