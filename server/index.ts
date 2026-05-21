import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { meetingsRouter } from './routes/meetings.js';
import { webhookRouter } from './routes/webhook.js';
import { analysisRouter } from './routes/analysis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/meetings', meetingsRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/analysis', analysisRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🔍 Meeting Bullshit Detector running on port ${PORT}`);
});
