# 💩 Meeting Bullshit Detector

AI-powered Teams meeting analyzer that provides brutally honest assessments of your meetings.

## What it does

After a Teams meeting ends, this tool analyzes the transcript and gives you:

- **🐂 Bullshit Detector** — Rates the corporate BS level (0-100%) with specific quotes
- **💰 Cost Analysis** — What the meeting actually cost (people × time × hourly rate)
- **🎯 Action Points** — Concrete outcomes extracted from the conversation
- **👥 Participant Ranking** — Who was essential, useful, passive, or unnecessary
- **📋 Agenda Alignment** — How well the meeting stuck to the agenda (if one existed)

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Teams Meeting Ends                             │
│  (Power Automate / Graph Webhook)               │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Backend (Express + TypeScript)                 │
│  ├── Microsoft Graph API → Fetch transcript     │
│  ├── OpenAI GPT-4o → Analyze content           │
│  └── Cost Calculator → Financial impact         │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Frontend (React + Tailwind)                    │
│  ├── Meeting list with scores                   │
│  ├── Detailed analysis dashboards               │
│  └── Manual transcript upload                   │
└─────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- An Azure AD app registration (for Teams integration)
- OpenAI API key (or Azure OpenAI)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/meeting-bullshit-detector.git
cd meeting-bullshit-detector

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development
npm run dev
```

The app will be available at `http://localhost:5173` with the API at `http://localhost:3001`.

## Teams Integration

### Option 1: Power Automate (Recommended)

1. Create a new Power Automate flow
2. Trigger: "When a Teams meeting ends"
3. Action: Get meeting transcript
4. Action: HTTP POST to `https://your-app.com/api/webhook/power-automate`
   ```json
   {
     "meetingId": "@{triggerOutputs()?['body/meetingId']}",
     "transcript": "@{body('Get_meeting_transcript')}",
     "subject": "@{triggerOutputs()?['body/subject']}",
     "agenda": "@{triggerOutputs()?['body/agenda']}"
   }
   ```

### Option 2: Microsoft Graph Subscription

1. Register the app in Azure AD with `OnlineMeetings.Read` and `OnlineMeetingTranscript.Read.All` permissions
2. Create a Graph subscription for meeting end events
3. The webhook at `/api/webhook/teams` handles the notification automatically

### Option 3: Manual Upload

Just paste the transcript directly in the web UI. Format:
```
Per: Hei alle, velkommen til det trettende status-møtet denne uken
Kari: Takk. Kan vi snakke om synergiene i vår go-to-market strategi?
Ole: Vi må virkelig være proaktive og pivotere vårt value proposition
```

## Azure AD App Registration

Required permissions:
- `OnlineMeetings.Read`
- `OnlineMeetingTranscript.Read.All`
- `User.Read`

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `AZURE_TENANT_ID` | Azure AD tenant ID | — |
| `AZURE_CLIENT_ID` | App registration client ID | — |
| `AZURE_CLIENT_SECRET` | App registration secret | — |
| `OPENAI_API_KEY` | OpenAI API key | — |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint (optional) | — |
| `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI model deployment | gpt-4o |
| `DEFAULT_HOURLY_RATE` | Default cost per hour per person (NOK) | 1200 |
| `WEBHOOK_SECRET` | Secret for webhook signature verification | — |
| `PORT` | Server port | 3001 |

## Tech Stack

- **Backend**: Express, TypeScript, Microsoft Graph SDK, OpenAI SDK
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **AI**: GPT-4o with structured JSON output
- **Auth**: Azure AD / Entra ID with client credentials

## License

MIT
