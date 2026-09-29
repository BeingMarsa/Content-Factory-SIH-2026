# Content Factory (SIH 2026) [SIH26154]

> **An enterprise-grade, multi-modal content transformation engine designed to ingest raw manuscripts, research papers, data sheets, and executive circulars, transforming them into publication-ready, format-specialized deliverables.**

[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.x_Flash-8e75ff?style=flat&logo=google)](https://ai.google.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-Mongoose_9-47a248?style=flat&logo=mongodb)](https://www.mongodb.com/atlas)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features & Deliverables](#-key-features--deliverables)
- [Architecture & Processing Pipeline](#-architecture--processing-pipeline)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Local Installation & Setup](#-local-installation--setup)
- [Environment Variables](#-environment-variables)
- [Deployment on Vercel](#-deployment-on-vercel)
- [Usage Guide](#-usage-guide)
- [Resilience & Failover Design](#-resilience--failover-design)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [License](#-license)

---

## 🏛️ Overview

**Content Factory** is an intelligent synthesis platform built for the **Smart India Hackathon (SIH 2026)**. In modern operations, knowledge workers, policymakers, and corporate executives spend countless hours reformatting dense documents into tailored outputs for distinct stakeholder audiences.

Content Factory solves this bottleneck:
1. **Universal Document Ingestion**: Upload raw text, PDFs, Word documents (`.docx`), Excel spreadsheets (`.xlsx`, `.csv`), or financial reports.
2. **Contextual Calibration**: Calibrate audience (e.g., C-Suite, Regulators, Developers), tone (Authoritative, Technical, Conversational), language, and detail level.
3. **Format-Isolated Synthesis**: The AI engine generates *strictly* the selected communication channels without prompt leakage or cross-format pollution.
4. **Interactive Artifacts & Export**: Preview keynote slides in-browser and export to `.pptx`; preview monochrome infographic posters and export 2× high-res `.png`; preview video scripts with browser TTS narration; or copy Markdown text assets directly to the clipboard.

---

## 🎯 Key Features & Deliverables

Content Factory supports 7 distinct, publication-grade output formats:

| Deliverable | Key Capabilities & Features | Export Format |
| :--- | :--- | :--- |
| **Keynote Presentation** | 5-slide strategic deck, interactive slide carousel, expandable presenter discourse/script, left/right keyboard navigation | Programmatic `.pptx` (via `pptxgenjs`) |
| **Monochrome Infographic** | High-contrast Black & White data architecture, 6 modular entity cards, overarching executive theme, 7-step alternating flow (Alpha/Beta columns) | High-Res 2× `.png` (via `html2canvas`) |
| **Video Package** | Full scene-by-scene script with timecode timestamps, audio/visual cues, visual storyboard grid, synthetic speech preview | Formatted `.txt` & Web Speech TTS |
| **Executive Summary** | In-depth strategic briefing: Strategic Context, Empirical Findings, Actionable Roadmap (no prompt boilerplate) | One-Click Clipboard Copy |
| **Executive Advisory** | High-priority risk assessment: Situational Assessment, Operational Vulnerabilities, Concrete Mandatory Directives | One-Click Clipboard Copy |
| **LinkedIn Post** | Professional thought leadership post with clean spacing, hook, strategic bullet points, and authoritative hashtags | One-Click Clipboard Copy |
| **Twitter/X Post** | Single high-impact standalone tweet constrained strictly within 280 characters (no multi-threaded clutter) | One-Click Clipboard Copy |

---

## 🏗️ Architecture & Processing Pipeline

```mermaid
flowchart TD
    User["Client Browser (React 19 + Tailwind v4)"] -->|"Multipart / JSON Payload"| NextAPI["/api/transform (Next.js Serverless Route)"]
    
    subgraph Ingestion ["Subsystem 1: Ingestion & Normalization"]
        NextAPI --> FileParser["lib/file-parser.ts"]
        FileParser -->|"PDF"| PDFParse["pdf-parse (Buffer Extraction)"]
        FileParser -->|"DOCX"| Mammoth["mammoth (Raw Text Parser)"]
        FileParser -->|"XLSX/CSV"| SheetJS["xlsx (Sheet-to-CSV Converter)"]
        FileParser -->|"TXT"| UTF8["UTF-8 Stream Buffer"]
        FileParser --> PromptBuilder["Structured Context Aggregator"]
    end

    subgraph AI_Engine ["Subsystem 2: AI Core & Failover Cascade"]
        PromptBuilder --> Router["Multi-Model Failover Controller"]
        Router -->|"Priority 1"| M1["gemini-3.6-flash (Fast, Low Latency)"]
        M1 -->|"503 / 429 (Wait 10s Retry)"| M1_Retry["gemini-3.6-flash Retry"]
        M1_Retry -->|"Failover"| M2["gemini-3.7-flash"]
        M2 -->|"Failover"| M3["gemini-3.8-flash"]
        
        M3 -->|"Exhausted / Key Missing"| Fallback["Dynamic Heuristic Synthesizer (Offline Engine)"]
    end

    subgraph Persistence ["Subsystem 3: Asynchronous Audit Logging"]
        NextAPI -.->|"Non-Blocking"| Mongo["MongoDB Atlas (TransformationHistory)"]
    end

    subgraph Artifact_Gen ["Subsystem 4: Client Artifact Renderers"]
        AI_Engine -->|"XML Tagged Payload"| TagParser["Deliverable Tag Extractor"]
        TagParser -->|"Presentation"| PPTXEngine["Interactive Carousel & pptxgenjs"]
        TagParser -->|"Infographic"| InfographicEngine["Monochrome Canvas & html2canvas"]
        TagParser -->|"Video"| VideoEngine["Storyboard & Web Speech Synthesis"]
        TagParser -->|"Text"| MarkdownEngine["ReactMarkdown + remarkGfm"]
    end
```

---

## 🛠️ Technology Stack

* **Framework**: [Next.js 16.3.5](https://nextjs.org/) (App Router, Turbopack, Serverless API Routes)
* **Frontend**: [React 19.3.0](https://react.dev/), [TypeScript 7](https://www.typescriptlang.org/)
* **Styling**: [Tailwind CSS v4.0](https://tailwindcss.com/), `@tailwindcss/typography`, Radix UI primitives
* **AI Engine**: Google Gemini API (`gemini-3.6-flash`, `gemini-3.7-flash`, `gemini-3.8-flash`) with dynamic XML isolation
* **Document Ingestion**:
  * `pdf-parse`: PDF binary text extraction
  * `mammoth`: Microsoft Word (`.docx`) document extraction
  * `xlsx`: Excel spreadsheet workbook & CSV parsing
* **Artifact Generation**:
  * `pptxgenjs`: Dynamic client-side PowerPoint presentation generation
  * `html2canvas`: High-density client-side canvas rasterization
* **Database & Persistence**: MongoDB Atlas with [Mongoose 9.10](https://mongoosejs.com/) (connection caching & fail-safe execution)
* **Icons**: [Lucide React](https://lucide.dev/)

---

## 📋 Prerequisites

Before setting up the project locally, ensure you have:
* **Node.js**: `v18.18.0` or higher (`v20+` or `v22+` recommended). Check with `node -v`.
* **npm** or **pnpm** or **yarn**: `npm v9+` is bundled with Node.js.
* **Google Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).
* **MongoDB Atlas URI** *(Optional)*: If you want transformation history logged to a database. The app runs smoothly in-memory if MongoDB is omitted.

---

## 🚀 Local Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/BeingMarsa/Content-Factory-SIH-2026.git
cd Content-Factory-SIH-2026
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```bash
# On Linux/macOS
cp .env.example .env.local

# On Windows PowerShell
Copy-Item .env.example .env.local
```

Open `.env.local` and add your credentials:
```env
# Required: Google Gemini API Key
ANTIGRAVITY_API_KEY="your_gemini_api_key_here"
# Alternatively:
# GEMINI_API_KEY="your_gemini_api_key_here"

# Optional: MongoDB Atlas Connection String
# Leave blank or omit if running locally without a database
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/ContentFactory?retryWrites=true&w=majority"
```

### 4. Run the Development Server
```bash
npm run dev
```

Open your browser and navigate to **`http://localhost:3000`**.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## ⚙️ Environment Variables

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `ANTIGRAVITY_API_KEY` | **Yes** (or `GEMINI_API_KEY`) | Google Gemini API key used for synthesis inference | `AIzaSy...` |
| `GEMINI_API_KEY` | Optional | Fallback variable name for Gemini API key | `AIzaSy...` |
| `MONGODB_URI` | Optional | MongoDB Atlas connection string for persistent audit logs | `mongodb+srv://user:pass@cluster.mongodb.net/...` |

> [!IMPORTANT]
> Never commit `.env.local` to version control. The repository's `.gitignore` automatically prevents secret keys from being pushed.

---

## ☁️ Deployment on Vercel

Content Factory is fully optimized for single-click deployment on **[Vercel](https://vercel.com/)**.

### Step 1: Push Code to GitHub
Ensure all your latest changes are pushed to your GitHub repository.

### Step 2: Import into Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Select your `Content-Factory-SIH-2026` repository and click **Import**.

### Step 3: Configure Environment Variables on Vercel
Under the **Environment Variables** section, add:
* **Key**: `ANTIGRAVITY_API_KEY`
* **Value**: *(Your Google Gemini API Key)*
* **Environments**: Select **Production**, **Preview**, and **Development**.

*(Optional)* If using MongoDB Atlas:
* **Key**: `MONGODB_URI`
* **Value**: *(Your MongoDB connection string)*
* In MongoDB Atlas, make sure **Network Access** includes `0.0.0.0/0` (Allow access from anywhere) so Vercel's serverless IP pool can connect.

### Step 4: Deploy
Click **Deploy**. Once the build completes (~1 minute), your application will be live at `https://your-project.vercel.app`.

> [!TIP]
> The transformation API route specifies `export const maxDuration = 60;` and `export const dynamic = "force-dynamic";` to allow serverless execution up to 60 seconds on Vercel.

---

## 💡 Usage Guide

1. **Step 1: Input Primary Discourse**:
   * Type or paste text into the manuscript input box, OR
   * Drag and drop files (PDF, DOCX, XLSX, CSV, TXT) into the deposit dropzone (supports multi-file uploads up to 10 MB).
2. **Step 2: Choose Communication Deliverables**:
   * Check off one or more target formats (e.g. *Keynote Presentation*, *Infographic*, *Executive Advisory*).
3. **Step 3: Calibrate Strategic Parameters**:
   * Set **Target Audience** (C-Suite, Regulators, Public, Investors, etc.).
   * Set **Tone & Style** (Authoritative, Minimalist, Persuasive, Technical).
   * Set **Communication Objective** (Policy Briefing, Risk Mitigation, Strategic Vision).
4. **Step 4: Commission Synthesis**:
   * Click **Commission Synthesis**. The UI smoothly scrolls to the **Exhibition** section upon completion.
5. **Step 5: Inspect & Export**:
   * **Presentation**: Flip slides using arrow keys or buttons, view presenter notes, and click **Download .PPTX**.
   * **Infographic**: Review the Black & White architectural layout and click **Export Black & White PNG**.
   * **Video Package**: Click **Preview Voiceover** for in-browser speech synthesis, and click **Download Script**.
   * **Executive Summary / Posts**: Click **Copy Text** to paste into email, LinkedIn, or Twitter.

---

## 🛡️ Resilience & Failover Design

1. **Multi-Model Failover**:
   The engine attempts models in order of latency and throughput:
   `gemini-3.6-flash` → `gemini-3.7-flash` → `gemini-3.8-flash`.
2. **10-Second Rate-Limit Backoff**:
   If an endpoint responds with HTTP `503` (High Demand) or `429` (Rate Limited), the engine logs the event, waits **10 seconds**, and executes an intelligent retry before falling over.
3. **Bounded Request Timeouts**:
   Individual HTTP requests are guarded with `signal: AbortSignal.timeout(10000)`, preventing stalled network connections from freezing the serverless process.
4. **Zero-Downtime Dynamic Synthesizer**:
   If all live AI models are saturated or an API key is unconfigured, the system automatically activates its procedural fallback synthesizer, extracting actual sentences, key metrics, and themes from your uploaded document without crashing.
5. **Active Fallback Visibility**:
   Whenever the offline fallback is activated, a prominent amber notification banner is displayed at the top of the **Exhibition** gallery, alerting the operator with transparency.

---

## ❓ Troubleshooting & FAQ

#### Q: Why does the output show a "Resilient Fallback Active" notice on Vercel?
**A:** On Vercel, `.env.local` is not deployed for security reasons. You must add `ANTIGRAVITY_API_KEY` (or `GEMINI_API_KEY`) to **Vercel Project Settings → Environment Variables** and click **Redeploy**.

#### Q: How can I change the presentation styling?
**A:** Presentation styling is configured in `src/app/page.tsx` within `PresentationGenerator`. The slides use an editorial dark brutalist palette (`#0a0a0c` dark canvas, `#ffffff` headers, `#a1a1aa` body copy, and gold accent dividers `#eab308`).

#### Q: Can I run Content Factory completely offline?
**A:** Yes. If no API key is supplied, Content Factory operates in offline heuristic mode using the procedural text extraction pipeline.

---

## 📄 License

Developed for the **Smart India Hackathon (SIH 2026)**. Distributed under the MIT License. See `LICENSE` for details.
