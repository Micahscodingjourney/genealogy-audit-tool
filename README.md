# Genealogy Record Auditor

A single-page React application that analyzes historical genealogical text snippets using the Anthropic API. Paste a census record, family tree entry, plantation record, or any other genealogical document and receive a structured audit flagging potential issues.

## What it flags

| Category | Description |
|---|---|
| **Missing or Ambiguous Names** | Individuals referred to only by relationship ("wife," "son") or with unresolvable identifiers |
| **Date Gaps & Uncertainties** | Missing dates, approximations (abt., circa, ~), implausible ages, or conflicting timelines |
| **Lineage Gaps** | Missing generational links, unverified parent-child relationships, or breaks in the documented lineage |
| **Incomplete or Contradictory Records** | Facts that conflict with each other or entries that appear internally inconsistent |

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Anthropic API](https://docs.anthropic.com/) (`claude-sonnet-4-20250514`) via `fetch`

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up your API key

Copy the example env file and add your Anthropic API key:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

> **Important:** `.env` is listed in `.gitignore` — never commit your API key.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for production

```bash
npm run build
```

> **Note:** This app calls the Anthropic API directly from the browser using `anthropic-dangerous-direct-browser-access: true`. This is appropriate for local development and personal use. For a production deployment with multiple users, proxy the API call through a backend server to keep the API key private.
