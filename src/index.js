/**
 * ViralClip SAAS - Main Entry Point
 * Multi-agent video clipping system
 */

const { AgentManager } = require('./agents/agent-manager');
const { YouTubeDownloader } = require('./core/youtube-downloader');
const { ClipAnalyzer } = require('./core/clip-analyzer');
const { ClipExtractor } = require('./core/clip-extractor');
const config = require('./core/config');

class ViralClipApp {
    constructor() {
        this.agentManager = new AgentManager();
        this.downloader = new YouTubeDownloader();
        this.analyzer = new ClipAnalyzer();
        this.extractor = new ClipExtractor();
    }

    async processVideo(videoUrl, clipCount = 5) {
        console.log(`🎬 Processing video: ${videoUrl}`);
        console.log(`📊 Requested clips: ${clipCount}`);

        try {
            console.log('⬇️  Phase 1: Downloading video...');
            const videoPath = await this.agentManager.spawnDownloadAgent(videoUrl);
            
            console.log('🔍 Phase 2: Analyzing for viral moments...');
            const viralMoments = await this.agentManager.spawnAnalysisAgent(videoPath, clipCount);
            
            console.log('✂️  Phase 3: Extracting clips...');
            const clipPaths = await this.agentManager.spawnExtractionAgent(videoPath, viralMoments);
            
            console.log('✅ Processing complete!');
            console.log(`📁 Generated ${clipPaths.length} clips:`);
            clipPaths.forEach((path, i) => console.log(`   ${i + 1}. ${path}`));
            
            return {
                success: true,
                videoUrl,
                clipCount: clipPaths.length,
                clips: clipPaths
            };
            
        } catch (error) {
            console.error('❌ Processing failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

if (require.main === module) {
    const app = new ViralClipApp();
    const videoUrl = process.argv[2];
    const clipCount = parseInt(process.argv[3]) || 5;
    
    if (!videoUrl) {
        console.log('Usage: node src/index.js <youtube-url> [clip-count]');
        process.exit(1);
    }
    
    app.processVideo(videoUrl, clipCount);
}

module.exports = { ViralClipApp };
