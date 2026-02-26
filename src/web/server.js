const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3230;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

const jobs = new Map();

app.post('/api/process', async (req, res) => {
    try {
        const { videoUrl, clipCount = 5, minDuration = 30, maxDuration = 60 } = req.body;
        
        if (!videoUrl) {
            return res.status(400).json({ error: 'Video URL is required' });
        }

        console.log(`Processing video: ${videoUrl}`);
        console.log(`Clips requested: ${clipCount}, Duration: ${minDuration}-${maxDuration}s`);

        const jobId = uuidv4();
        jobs.set(jobId, { status: 'processing', progress: 0, clips: [] });

        // Start processing (simplified - in production use agent manager)
        setTimeout(() => {
            jobs.set(jobId, { status: 'completed', progress: 100, clips: [] });
        }, 5000);

        res.json({ success: true, jobId });
    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/status/:jobId', (req, res) => {
    try {
        const { jobId } = req.params;
        const status = jobs.get(jobId) || { status: 'not_found' };
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/jobs', (req, res) => {
    try {
        const allJobs = Array.from(jobs.entries()).map(([id, data]) => ({ id, ...data }));
        res.json({ success: true, jobs: allJobs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Video Clipping SAAS running on http://localhost:${PORT}`);
});
