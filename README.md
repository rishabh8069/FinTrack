# FinTrack — AI Financial Manager

FinTrack is a WhatsApp-first financial management application for small businesses/freelancers. The web dashboard provides financial visibility and management, while the WhatsApp/AI assistant can record transactions and answer financial queries.

## Current architecture

```text
WhatsApp / Web Assistant / Manual Web Entry
                  ↓
             Express API
                  ↓
       Gemini + transaction logic
                  ↓
             MongoDB Atlas
                  ↓
      Clients / Transactions / Chat
                  ↓
             Web Dashboard
```

## Run locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create `.env` from `.env.example`.
3. Add `GEMINI_API_KEY`.
4. Add `MONGODB_URI` for persistent MongoDB storage.
5. Run:
   `npm run dev`

For detailed MongoDB setup, see [MONGODB_SETUP.md](./MONGODB_SETUP.md).

## Important

Never commit `.env` or a MongoDB connection string containing a password. Use Google AI Studio/Cloud Run Secrets for deployed credentials.
