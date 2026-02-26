/**
 * Clip Generator Service
 * Creates 30-60 second viral video clips from source content
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class ClipGenerator {
  constructor(outputDir = './output', tempDir = './temp') {
    this.outputDir = outputDir;
    this.tempDir = tempDir;
  }

  async analyzeVideo(videoPath) {
    return new Promise((resolve, reject) => {
      const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`ffprobe error: ${error.message}`));
          return;
        }
        try {
          const info = JSON.parse(stdout);
          const format = info.format;
          const videoStream = info.streams.find(s => s.codec_type === 'video');
          resolve({
            duration: parseFloat(format.duration),
            width: videoStream?.width || 1920,
            height: videoStream?.height || 1080,
            hasAudio: !!info.streams.find(s => s.codec_type === 'audio'),
          });
        } catch (e) {
          reject(new Error('Failed to parse video info'));
        }
      });
    });
  }

  async generateClips(videoPath, segments, videoId, options = {}) {
    const videoInfo = await this.analyzeVideo(videoPath);
    const generatedClips = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const duration = segment.end - segment.start;
      
      if (duration < 5 || duration > 60) continue;

      const clipName = `${videoId}_clip_${i + 1}_${Math.round(segment.start)}s`;
      const outputPath = path.join(this.outputDir, `${clipName}.mp4`);
      
      try {
        await this.createClip(videoPath, outputPath, segment, videoInfo, options);
        generatedClips.push({
          id: i + 1,
          name: clipName,
          path: outputPath,
          startTime: segment.start,
          endTime: segment.end,
          duration: duration,
        });
      } catch (err) {
        console.error(`Error creating clip ${i + 1}:`, err.message);
      }
    }
    return generatedClips;
  }

  async createClip(inputPath, outputPath, segment, videoInfo, options) {
    return new Promise((resolve, reject) => {
      let filters = [];
      if (options.verticalFormat) {
        const aspectRatio = 9 / 16;
        const cropWidth = videoInfo.height * aspectRatio;
        filters.push(`crop=${cropWidth}:${videoInfo.height}:(ow)/2:(oh)/2`);
        filters.push('scale=1080:1920');
      }
      const filterComplex = filters.length > 0 ? `-vf "${filters.join(',')}"` : '';
      const cmd = `ffmpeg -y -ss ${segment.start} -t ${segment.end - segment.start} -i "${inputPath}" ${filterComplex} -c:v libx264 -crf 23 -c:a aac -b:a 192k -preset fast "${outputPath}"`;
      exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error) => {
        if (error && !fs.existsSync(outputPath)) {
          reject(new Error(`ffmpeg error: ${error.message}`));
          return;
        }
        resolve(outputPath);
      });
    });
  }

  generateSmartSegments(totalDuration, numClips, targetDuration) {
    const buffer = 30;
    const availableDuration = Math.max(0, totalDuration - (buffer * 2));
    if (availableDuration < targetDuration) {
      return [{ start: 0, end: totalDuration }];
    }
    const segments = [];
    const spacing = availableDuration / numClips;
    for (let i = 0; i < numClips; i++) {
      const start = buffer + (spacing * i);
      const end = Math.min(totalDuration, start + targetDuration);
      if (end - start >= 30) {
        segments.push({ start: Math.round(start * 10) / 10, end: Math.round(end * 10) / 10 });
      }
    }
    return segments;
  }
}

module.exports = ClipGenerator;
