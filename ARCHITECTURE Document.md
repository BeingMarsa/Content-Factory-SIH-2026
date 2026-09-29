# Content Factory — Technical Architecture Document
**Target Version:** v1.0.0 &middot; **Standard:** SIH-2026 Production Specification &middot; **Scope:** Max 2 Pages Equivalent

---

### 1. System Topology & Architectural Overview

Content Factory is architected as a hybrid edge-serverless, reactive single-page application built on Next.js 16 (Turbopack Engine), React 19, and Tailwind CSS v4. The system is designed to transform high-entropy, multi-modal documents into structured, publication-grade executive deliverables with strict isolation and zero cross-format contamination.

```
[ Client Browser: React 19 / Canvas / PPTX ]
       │
       ▼ (HTTP POST multipart/form-data | application/json)
[ Next.js Serverless Route: /api/transform ] ──(MaxDuration: 60s, Force-Dynamic)
       ├─► [ Subsystem 1: Document Ingestion & Binary Parser ]
       │     └─► pdf-parse | mammoth (docx) | xlsx (sheets) | UTF-8 streams
       │
       ├─► [ Subsystem 2: Prompt Assembler & XML Deliverable Guard ]
       │     └─► Strict isolation contracts & domain-specific taxonomy injection
       │
       ├─► [ Subsystem 3: Multi-Model Inference Engine & Cascade ]
       │     ├─► Google Gemini API (gemini-3.6-flash ──► 3.7-flash ──► 3.8-flash)
       │     ├─► 10s Rate-Limit / Demand Backoff Loop (HTTP 503 / 429 handling)
       │     └─► Fail-Safe: Dynamic Procedural Synthesizer (Offline Heuristic AST)
       │
       ├─► [ Subsystem 4: Asynchronous Persistence Layer ]
       │     └─► MongoDB Atlas via cached Mongoose singleton (Non-blocking I/O)
       │
       ▼ (JSON Response with XML Deliverable Payloads + Telemetry)
[ Client-Side Artifact Synthesizers ]
       ├─► PPTXGenJS (Programmatic 16:9 Presentation Deck + Presenter Notes)
       ├─► HTML2Canvas (Pure Monochrome High-Density Vector-to-Raster 2× PNG)
       ├─► Web Speech API (Browser-Thread Synthesized Voiceover Preview)
       └─► ReactMarkdown + RemarkGFM (Editorial Brutalist Text Archives)
```

---

### 2. Multi-Format Ingestion & Document Normalization Subsystem

The ingestion engine (`src/lib/file-parser.ts`) intercepts incoming multipart payloads up to 10 MB per transaction. To prevent cold-start bloat and memory exhaustion in ephemeral serverless runtimes, parser libraries are dynamically imported only upon demand:

* **PDF Parsing (`pdf-parse`)**: Buffers incoming binary blobs into memory chunks, extracts unstructured stream objects, normalizes character encoding, and collapses extraneous whitespace into clean semantic paragraphs.
* **Word Processing (`mammoth`)**: Ingests `.docx` archive structures, parsing underlying OpenXML document relationships while stripping extraneous style attributes to extract raw textual signal.
* **Tabular Workbooks (`xlsx`)**: Iterates through workbook sheet registries, parsing active cell matrices and emitting normalized comma-delimited strings (`sheet_to_csv`) with sheet header delimiters.
* **Context Normalization**: Document texts are labeled with source metadata (filename, byte size) and concatenated into a structured context block injected into the transformation prompt under `### Attached Documents`.

---

### 3. Inference Engine, XML Isolation Protocol & Fallback Cascade

#### 3.1 Strict Deliverable Isolation via XML Encapsulation
To eliminate hallucinated format leakage and ensure each deliverable is purely isolated, the system prompt imposes an absolute XML envelope protocol:
```xml
<DELIVERABLE type="Presentation"> ... </DELIVERABLE>
<DELIVERABLE type="Infographic"> ... </DELIVERABLE>
```
On the client, a dedicated parser (`getDeliverableText`) extracts content strictly using type-parameterized regular expressions:
$$\text{Regex} = \texttt{<DELIVERABLE\textbackslash{}s+type=["']?\{Type\}["']?\textbackslash{}s*>([\textbackslash{}s\textbackslash{}S]*?)<\/DELIVERABLE>}$$
If an unrequested format is omitted by the AI, it evaluates to empty string rather than polluting other deliverables.

#### 3.2 Resilient Multi-Model Cascade with 10s Backoff
The inference controller (`src/app/api/transform/route.ts`) executes a deterministic failover across Gemini models:
1. **Primary**: `gemini-3.6-flash` (highest availability, sub-3s response latency).
2. **Secondary**: `gemini-3.7-flash` (balanced reasoning model).
3. **Tertiary**: `gemini-3.8-flash` (advanced reasoning model).

When encountering HTTP `503` (High Demand) or `429` (Rate Limited), the engine:
* Logs diagnostic telemetry to runtime logs.
* Executes an asynchronous backoff pause of **10,000 ms** (`delays = [10000]`), allowing Google API rate windows and load balancers to clear.
* Enforces bounded execution with `AbortSignal.timeout(10000)` per HTTP fetch, guaranteeing that no stalled socket holds the serverless process past platform limits.

#### 3.3 Zero-Downtime Procedural Heuristic Synthesizer (Offline Engine)
If all external endpoints are exhausted or if credentials are not configured, the system shifts into the **Dynamic Heuristic Synthesizer** (`generateDynamicDeliverables`):
* Computes token-density and sentence-boundary splits (`/(?<=[.?!])\s+|\n+/`) to derive core thesis statements and empirical supporting points directly from the user's uploaded text.
* Populates procedural deliverable ASTs matching the exact output schemas (e.g., 5-slide deck, Black & White infographic modules).
* Emits a high-visibility telemetry flag (`isFallback: true`) and warning notices to maintain complete operational transparency.

---

### 4. Client-Side Artifact Engines & Visual Encoding

#### 4.1 Programmatic Presentation Deck Engine (`pptxgenjs`)
Rather than emitting static bullet lists, `PresentationGenerator` parses raw slide delimiters (`### Slide [N]: [Title]`) and presenter discourse blocks (`**Speaker Notes:** [Text]`). Upon trigger:
* Instantiates a custom 16:9 widescreen presentation layout (`LAYOUT_16x9`).
* Applies the editorial brand architecture: `#0a0a0c` dark canvas, `#ffffff` headers, `#a1a1aa` body copy, and `#eab308` gold accent dividers.
* Injects speaker notes directly into PowerPoint's native slide notes metadata stream (`slide.addNotes(notes)`).
* Compiles and streams the file binary as `ContentFactory_Presentation_[timestamp].pptx`.

#### 4.2 Standardized Monochrome Infographic Architecture (`html2canvas`)
The infographic generator (`InfographicGenerator`) follows a strict black-and-white editorial aesthetic:
* **Palette**: 100% monochrome (`#000000` pitch black background, `#ffffff` typography, `rgba(255,255,255,0.18)` hairline structural grids, and corner `+` registration marks). Zero color accents.
* **Top Module Grid**: Dynamically renders up to 6 modular entity cards with icon badges, 24px Georgia serif primary metrics, and 3 punchy points. Empty modules are cleanly omitted.
* **Center Section**: Italicized Georgia overarching theme callout bridging data modules with execution flow.
* **Bottom Alternating Flow**: Dual-column alternating flow (Phase Alpha left: Nodes 1, 3, 5, 7; Phase Beta right: Nodes 2, 4, 6) with `<15` words per step.
* **High-DPI Rasterization**: `html2canvas` captures the DOM tree at `scale: 2` with CORS enabled, rendering a 2× high-resolution PNG for crystal-clear print and digital distribution.

#### 4.3 Audio Scripting & Browser-Thread TTS Engine
The `VideoPackageGenerator` decomposes video treatments into time-stamped visual scenes. It integrates the browser's native `window.speechSynthesis` API, offloading voiceover generation directly to the client's local speech synthesis engine without external API costs or latency.

---

### 5. Persistence, Concurrency & Security Calibration

| Dimension | Architectural Implementation |
| :--- | :--- |
| **Serverless Lifecycle** | Configured with `maxDuration = 60` and `dynamic = "force-dynamic"` to accommodate heavy multi-modal inference and 10s retry cycles within Vercel's execution limits. |
| **Connection Pooling** | Mongoose connections are cached across warm serverless invocations via a global cache singleton (`global.mongooseCache`), utilizing `serverSelectionTimeoutMS: 5000` to prevent lambda freezing. |
| **Non-Blocking Persistence** | Audit logging to MongoDB (`TransformationHistory.create`) executes asynchronously and never blocks the client HTTP response stream. If database connectivity fails, errors are captured and the response completes unhindered. |
| **Security & Secrets** | Zero secrets in client bundles; all AI keys (`ANTIGRAVITY_API_KEY`, `GEMINI_API_KEY`) and database credentials are strictly guarded within the server-side environment boundary and excluded via `.gitignore`. |

---

### 6. Architectural Summary Matrix

```
Input Documents (PDF/DOCX/XLSX/TXT)
  │
  ├─► Serverless Ingestion Buffer (Dynamic imports, memory-bounded)
  ├─► Multi-Model Cascade (gemini-3.6-flash priority, 10s backoff, AbortSignal guards)
  ├─► Failover Heuristic Synthesizer (Zero-downtime offline procedural engine)
  ├─► XML Protocol Parsing (Deterministic format isolation, zero prompt leakage)
  │
  └─► Client Artifact Rendering (pptxgenjs, html2canvas @2x, Web Speech TTS, GFM)
```
