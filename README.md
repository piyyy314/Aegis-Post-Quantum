# Aegis Post-Quantum Cybersecurity Suite

An interactive cybersecurity dashboard and post-quantum cryptography (PQC) simulation control center. It includes automated breach response, self-healing, API fuzzers, a honeypot service and an AI-powered cryptographic audit engine backed by the Gemini API.

## Stack

- React, Vite, Tailwind CSS, Recharts, Motion
- Express and Socket.IO server (`server.ts`, `server/honeypot.ts`)
- Gemini API through `@google/genai`
- Optional Tauri desktop shell (`src-tauri/`)

## Getting started

```bash
cp .env.example .env     # then set GEMINI_API_KEY
npm install
npm run dev              # tsx server.ts
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Run the server in development |
| `npm run build` | Build the front end and bundle the server to `dist/server.cjs` |
| `npm start` | Run the built server |
| `npm run lint` | Type-check with `tsc --noEmit` |

## Configuration

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Required for Gemini API calls |
| `APP_URL` | URL where the app is hosted, used for self-referential links |

Never commit a real `.env` file.

## Notes

This suite is a simulation and demonstration environment. Only test against systems you own or are authorised to test.
