// Application Configuration
module.exports = {
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || 'localhost',
  
  OUTPUT_DIR: './output',
  MIN_CLIP_DURATION: 30,
  MAX_CLIP_DURATION: 60,
  DEFAULT_CLIPS_COUNT: 5,
  
  YOUTUBE: {
    USER_AGENTS: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    ],
    MIN_DELAY: 1000,
    MAX_DELAY: 3000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
  },
  
  FFMPEG: {
    PATH: process.env.FFMPEG_PATH || 'ffmpeg',
    FFPROBE_PATH: process.env.FFPROBE_PATH || 'ffprobe',
  },
  
  AI: {
    ENABLED: process.env.AI_ENABLED === 'true',
    API_KEY: process.env.AI_API_KEY || '',
    MODEL: 'speech-recognition',
  },
  
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
