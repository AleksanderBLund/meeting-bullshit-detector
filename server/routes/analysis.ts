import { Router } from 'express';
import { analyzeMeeting, getStoredAnalyses, getStoredAnalysis } from '../services/analyzer.js';
import type { AnalyzeMeetingRequest } from '../../shared/types.js';

export const analysisRouter = Router();

// Trigger analysis for a meeting
analysisRouter.post('/', async (req, res) => {
  try {
    const request: AnalyzeMeetingRequest = req.body;

    if (!request.meetingId && !request.transcript) {
      return res.status(400).json({
        success: false,
        error: 'Either meetingId or transcript text is required',
      });
    }

    const analysis = await analyzeMeeting(request);
    res.json({ success: true, analysis });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all stored analyses
analysisRouter.get('/', async (_req, res) => {
  try {
    const analyses = getStoredAnalyses();
    res.json(analyses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific analysis
analysisRouter.get('/:id', async (req, res) => {
  try {
    const analysis = getStoredAnalysis(req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
