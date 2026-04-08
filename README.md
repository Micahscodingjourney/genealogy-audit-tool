<div align="center">

# 📜 Genealogy Record Auditor

**AI-assisted analysis of historical genealogical documents.**  
Surface gaps, ambiguities, and inconsistencies — then get a personalized research roadmap.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Claude](https://img.shields.io/badge/Powered%20by-Claude-D97757?style=flat-square)

</div>

---

## What it does

Paste any historical genealogical text — a census record, church register, Freedmen's Bureau document, plantation Farm Book, or family narrative — and the tool will:

- **Audit the record** across four structured categories
- **Generate a personalized Research Roadmap** of prioritized next steps, tailored to your family and the specific gaps found

### Four audit categories

| Category | What it catches |
|---|---|
| 👤 **Missing or Ambiguous Names** | Individuals unnamed or referred to only by relationship ("wife," "son," "infant") |
| 📅 **Date Gaps & Uncertainties** | Missing dates, approximations (abt., circa), implausible ages, conflicting timelines |
| 🌿 **Lineage Gaps** | Missing generational links, unverified parent-child relationships, orphaned individuals |
| ⚠️ **Incomplete or Contradictory Records** | Facts that conflict with each other or entries that are internally inconsistent |

### Personalized Research Roadmap

Tell the tool who you are and what you already know — your name, known relatives, and what you're trying to find. The AI uses that context to generate next steps that reference your family members by name and point to specific archives, databases, and resources calibrated to your lineage and geography.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone the repository

```bash
git clone https://github.com/Micahscodingjourney/genealogy-audit-tool.git
cd genealogy-audit-tool
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your API key

```bash
cp .env.example .env
```

Open `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

> Your key lives only in `.env` on your machine. It is excluded from version control via `.gitignore` and never touches the browser — requests are proxied through a local server.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## How it works

```
Browser  →  localhost:3001 (Express proxy)  →  Anthropic API
```

The app uses a local Express proxy server so your API key is never embedded in the frontend JavaScript bundle. `npm run dev` starts both the Vite dev server and the proxy together via `concurrently`.

---

## Works well with

- Federal census records (1850–1940)
- Church and vital records
- Freedmen's Bureau documents
- Plantation Farm Books and estate records
- Published family history narratives
- Compiled genealogical abstracts

## Avoid pasting

- Living individuals' personal data
- Documents containing Social Security numbers
- Medical or financial records
- Private correspondence not your own

> This tool is designed for historical records only. All analysis is advisory — verify findings against primary sources.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS 3 |
| Build tool | Vite 6 |
| Proxy server | Express (Node.js) |
| AI model | Claude (`claude-sonnet-4-20250514`) via Anthropic API |

---

## Background

This tool was developed as part of a thesis research project on AI-assisted genealogical research, with particular attention to African American family history — where the archival record is frequently fragmented by enslavement, informal naming practices, and the structural absence of pre-emancipation vital records.

The included sample record documents the **Fossett family of Monticello** — Joseph Fossett (enslaved blacksmith, freed in Jefferson's 1826 will) and Edith Hern Fossett (enslaved cook, not freed) — one of the more thoroughly documented African American families of the antebellum era, and a real-world test case for the kinds of gaps this tool is built to surface.

---

<div align="center">

Built by [Micah Fossett](https://github.com/Micahscodingjourney) · Powered by [Claude](https://anthropic.com)

</div>
