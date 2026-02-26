/**
 * Clip Analyzer Agent
 * Analyzes video content to identify viral moments
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class ClipAnalyzerAgent {
  constructor() {
    this.moments = [];
  }

  async analyzeVideo(videoPath) {
    console.log('[Analyzer Agent] Starting video analysis...');

    try {
      const metadata = await this._getVideoMetadata(videoPath);
      console.log('[Analyzer Agent] Video metadata:', { duration: metadata.duration });

      const silenceSegments = await this._detectSilence(videoPath);
      console.log(`[Analyzer Agent] Found ${silenceSegments.length} silence segments`);

      const loudSegments = await this._detectLoudSegments(videoPath);
      console.log(`[Analyzer Agent] Found ${loudSegments.length} loud segments`);

      const energyPeaks = await this._detectEnergyPeaks(videoPath);
      console.log(`[Analyzer Agent] Found ${energyPeaks.length} energy peaks`);

      this.moments = this._findOptimalClips(
        metadata.duration,
        silenceSegments,
        loudSegments,
        energyPeaks
      );

      console.log(`[Analyzer Agent] Identified ${this.moments.length} optimal clip moments`);

      return { success: true, duration: metadata.duration, moments: this.moments };
    } catch (error) {
      console.error('[Analyzer Agent] Analysis error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async _getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      const cmd = `"${config.FFMPEG.FFPROBE_PATH}" -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`ffprobe error: ${stderr}`));
          return;
        }
        try {
          const data = JSON.parse(stdout);
          const format = data.format;
          resolve({
            duration: parseFloat(format.duration),
            format: format.format_name,
          });
        } catch (e) {
          reject(new Error('Failed to parse metadata'));
        }
      });
    });
  }

  async _detectSilence(videoPath) {
    return new Promise((resolve) => {
      const cmd = `"${config.FFMPEG.FFMPEG_PATH}" -i "${videoPath}" -af silencedetect=noise=-30dB:d=2 -f null - 2>&1`;
      exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        const output = stderr || stdout;
        const segments = [];
        const silenceStartRegex = /silence_start: ([\d.]+)/g;
        const silenceEndRegex = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g;
        const starts = [...output.matchAll(silenceStartRegex)].map(m => parseFloat(m[1]));
        const ends = [...output.matchAll(silenceEndRegex)].map(m => parseFloat(m[1]));
        for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
          segments.push({ start: starts[i], end: ends[i], type: 'silence' });
        }
        resolve(segments);
      });
    });
  }

  async _detectLoudSegments(videoPath) {
    return new Promise((resolve) => {
      const cmd = `"${config.FFMPEG.FFMPEG_PATH}" -i "${videoPath}" -af volumedetect -f null - 2>&1`;
      exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        const output = stderr || stdout;
        const segments = [];
        const meanVolRegex = /mean_volume: ([\d.]+) dB/;
        const maxVolRegex = /max_volume: ([\d.]+) dB/;
        const meanMatch = output.match(meanVolRegex);
        const maxMatch = output.match(maxVolRegex);
        if (meanMatch && maxMatch) {
          segments.push({
            start: 0,
            end: parseFloat(meanMatch[1]),
            meanVolume: parseFloat(meanMatch[1]),
            maxVolume: parseFloat(maxMatch[1]),
            type: 'loud',
          });
        }
        resolve(segments);
      });
    });
  }

  async _detectEnergyPeaks(videoPath) {
    return new Promise((resolve) => {
      const cmd = `"${config.FFMPEG.FFMPEG_PATH}" -i "${videoPath}" -af astats=metadata=1:reset=1 -f null - 2>&1`;
      exec(cmd, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
        const output = stderr || stdout;
        const peaks = [];
        const rmsRegex = /RMS level: ([\d.eE+-]+)/g;
        const matches = [...output.matchAll(rmsRegex)];
        matches.forEach((match, index) => {
          const rms = parseFloat(match[1]);
          if (rms > 0.1) {
            peaks.push({ position: index, rms: rms, type: 'peak' });
          }
        });
        resolve(peaks.slice(0, 20));
      });
    });
  }

  _findOptimalClips(duration, silenceSegments, loudSegments, energyPeaks) {
    const moments = [];
    const clipDuration = config.MAX_CLIP_DURATION;
    let currentTime = 30;
    
    while (currentTime < duration - clipDuration) {
      const isSilent = silenceSegments.some(s => 
        currentTime >= s.start - 5 && currentTime <= s.end + 5
      );
      if (!isSilent) {
        const score = this._scoreSegment(currentTime, energyPeaks, silenceSegments);
        if (score > 50) {
          moments.push({
            start: Math.max(0, currentTime - 5),
            end: Math.min(duration, currentTime + clipDuration - 5),
            duration: clipDuration,
            score: score,
            reason: 'High energy segment',
          });
        }
      }
      currentTime += 30;
    }
    return moments.sort((a, b) => b.score - a.score).slice(0, 10);
  }

  _scoreSegment(time, energyPeaks, silenceSegments) {
    let score = 50;
    const nearbyPeak = energyPeaks.some(p => Math.abs(p.position % 100 - time % 100) < 10);
    if (nearbyPeak) score += 30;
    const nearSilence = silenceSegments.some(s => Math.abs((s.start + s.end) / 2 - time) < 15);
    if (nearSilence) score -= 40;
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = ClipAnalyzerAgent;
