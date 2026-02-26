/**
 * Clip Extractor Agent
 * Extracts and processes video clips from source video
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class ClipExtractorAgent {
  constructor() {
    this.extractedClips = [];
  }

  async extractClips(videoPath, moments, outputDir) {
    console.log('[Extractor Agent] Starting clip extraction...');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = [];
    const batchSize = 3;
    
    for (let i = 0; i < moments.length; i += batchSize) {
      const batch = moments.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (moment, index) => {
          const clipIndex = i + index + 1;
          return this._extractSingleClip(videoPath, moment, outputDir, clipIndex);
        })
      );
      results.push(...batchResults);
    }

    this.extractedClips = results.filter(r => r.success);
    console.log(`[Extractor Agent] Successfully extracted ${this.extractedClips.length} clips`);
    return { success: true, clips: this.extractedClips, failed: results.filter(r => !r.success) };
  }

  async _extractSingleClip(videoPath, moment, outputDir, clipIndex) {
    const videoName = path.basename(videoPath, path.extname(videoPath));
    const outputPath = path.join(outputDir, `${videoName}_clip_${clipIndex}.mp4`);

    console.log(`[Extractor Agent] Extracting clip ${clipIndex}: ${moment.start}s - ${moment.end}s`);

    return new Promise((resolve) => {
      const startTime = moment.start.toFixed(2);
      const duration = (moment.end - moment.start).toFixed(2);
      
      const cmd = `"${config.FFMPEG.FFMPEG_PATH}" -ss ${startTime} -t ${duration} -i "${videoPath}" ` +
        `-c:v libx264 -preset fast -crf 23 ` +
        `-c:a aac -b:a 128k ` +
        `-vf "scale=if(gt(iw,ih),1280,-2):if(gt(iw,ih),-2,720),fps=30" ` +
        `-movflags +faststart ` +
        `-y "${outputPath}" 2>&1`;

      exec(cmd, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error(`[Extractor Agent] Clip ${clipIndex} extraction error:`, error.message);
          resolve({ success: false, index: clipIndex, error: error.message });
          return;
        }
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`[Extractor Agent] Clip ${clipIndex} created: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
          resolve({
            success: true,
            index: clipIndex,
            path: outputPath,
            startTime: moment.start,
            endTime: moment.end,
            duration: parseFloat(duration),
            size: stats.size,
            score: moment.score,
            reason: moment.reason,
          });
        } else {
          resolve({ success: false, index: clipIndex, error: 'Output file not created' });
        }
      });
    });
  }
}

module.exports = ClipExtractorAgent;
