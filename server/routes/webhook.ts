import { Router } from 'express';
import crypto from 'crypto';
import { analyzeMeeting } from '../services/analyzer.ts';
import { getGraphClient } from '../services/graph.ts';
import type { WebhookPayload } from '../../shared/types.ts';

export const webhookRouter = Router();

// Microsoft Graph webhook validation
webhookRouter.post('/teams', async (req, res) => {
  // Handle validation token (Graph subscription verification)
  if (req.query.validationToken) {
    return res.status(200).send(req.query.validationToken);
  }

  // Verify webhook signature if secret is configured
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers['x-webhook-signature'] as string;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('base64');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  try {
    const payload = req.body as WebhookPayload;

    if (payload.type === 'meetingEnd' && payload.meetingId) {
      // Trigger analysis asynchronously
      console.log(`📋 Meeting ended: ${payload.meetingId}, triggering analysis...`);

      // Don't await - let it run in the background
      analyzeMeetingFromWebhook(payload.meetingId).catch((err) =>
        console.error('Analysis failed:', err)
      );
    }

    res.status(202).json({ accepted: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Power Automate compatible endpoint
webhookRouter.post('/power-automate', async (req, res) => {
  try {
    const { meetingId, transcript, agenda, subject } = req.body;

    if (!meetingId && !transcript) {
      return res.status(400).json({ error: 'meetingId or transcript required' });
    }

    console.log(`📋 Power Automate trigger: ${subject || meetingId}`);

    const analysis = await analyzeMeeting({
      meetingId,
      transcript,
      agenda,
    });

    res.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Power Automate webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function analyzeMeetingFromWebhook(meetingId: string) {
  const client = getGraphClient();

  // Wait a bit for transcript to be available
  await new Promise((resolve) => setTimeout(resolve, 30000));

  const transcripts = await client
    .api(`/me/onlineMeetings/${meetingId}/transcripts`)
    .get();

  if (transcripts.value?.length > 0) {
    await analyzeMeeting({ meetingId });
  } else {
    console.warn(`No transcript available for meeting ${meetingId}`);
  }
}
