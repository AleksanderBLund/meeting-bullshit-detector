import { Router } from 'express';
import { getGraphClient } from '../services/graph.ts';
import type { MeetingTranscript } from '../../shared/types.ts';

export const meetingsRouter = Router();

// List recent meetings with transcripts
meetingsRouter.get('/', async (_req, res) => {
  try {
    const client = getGraphClient();
    const meetings = await client
      .api('/me/onlineMeetings')
      .select('id,subject,startDateTime,endDateTime,participants')
      .top(20)
      .orderby('startDateTime desc')
      .get();

    res.json(meetings.value);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get transcript for a specific meeting
meetingsRouter.get('/:meetingId/transcript', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const client = getGraphClient();

    // Get meeting transcripts
    const transcripts = await client
      .api(`/me/onlineMeetings/${meetingId}/transcripts`)
      .get();

    if (!transcripts.value || transcripts.value.length === 0) {
      return res.status(404).json({ error: 'No transcript found for this meeting' });
    }

    // Get the content of the first transcript
    const transcriptId = transcripts.value[0].id;
    const content = await client
      .api(`/me/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content`)
      .header('Accept', 'text/vtt')
      .get();

    // Get meeting details
    const meeting = await client
      .api(`/me/onlineMeetings/${meetingId}`)
      .select('id,subject,startDateTime,endDateTime,participants')
      .get();

    const transcript: MeetingTranscript = {
      meetingId,
      subject: meeting.subject || 'Untitled Meeting',
      startTime: meeting.startDateTime,
      endTime: meeting.endDateTime,
      organizer: {
        id: meeting.participants?.organizer?.identity?.user?.id || '',
        displayName: meeting.participants?.organizer?.identity?.user?.displayName || 'Unknown',
        email: meeting.participants?.organizer?.upn || '',
      },
      participants: (meeting.participants?.attendees || []).map((a: any) => ({
        id: a.identity?.user?.id || '',
        displayName: a.identity?.user?.displayName || 'Unknown',
        email: a.upn || '',
      })),
      segments: parseVttTranscript(content),
    };

    res.json(transcript);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function parseVttTranscript(vttContent: string): MeetingTranscript['segments'] {
  const segments: MeetingTranscript['segments'] = [];
  const lines = vttContent.split('\n');
  let currentSpeaker = '';
  let currentText = '';
  let currentTimestamp = '';

  for (const line of lines) {
    if (line.includes('-->')) {
      currentTimestamp = line.split('-->')[0].trim();
    } else if (line.startsWith('<v ')) {
      const match = line.match(/<v ([^>]+)>(.+)<\/v>/);
      if (match) {
        if (currentText && currentSpeaker) {
          segments.push({
            speaker: { id: '', displayName: currentSpeaker, email: '' },
            text: currentText,
            timestamp: currentTimestamp,
          });
        }
        currentSpeaker = match[1];
        currentText = match[2];
      }
    } else if (line.trim() && !line.startsWith('WEBVTT') && !line.match(/^\d+$/)) {
      currentText += ' ' + line.trim();
    }
  }

  if (currentText && currentSpeaker) {
    segments.push({
      speaker: { id: '', displayName: currentSpeaker, email: '' },
      text: currentText,
      timestamp: currentTimestamp,
    });
  }

  return segments;
}
