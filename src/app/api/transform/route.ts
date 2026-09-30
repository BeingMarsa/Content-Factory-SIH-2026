// ---------------------------------------------------------------------------
// POST /api/transform
// Handles both multipart/form-data and JSON payloads safely.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import TransformationHistory from "@/models/TransformationHistory";
import { parseUploadedFile, buildFileContext } from "@/lib/file-parser";
import type {
  TransformRequest,
  TransformResponse,
  TransformErrorResponse,
  TransformationConfig,
  OutputType,
  ParsedFileInfo,
} from "@/lib/types";
import { OUTPUT_TYPES } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DELIVERABLE_GENERATORS: Record<
  OutputType,
  (source: string, cfg: TransformationConfig, files: ParsedFileInfo[]) => string
> = {
  "Executive Summary": (source, cfg) => `
## 📝 Executive Summary
**Strategic Focus:** ${cfg.communicationObjective} &middot; **Audience:** ${cfg.targetAudience}

### Core Strategic Overview
- **Primary Finding:** Strategic consolidation indicates high opportunity in streamlining operational cadence.
- **Risk & Mitigation:** Maintaining a **${cfg.toneStyle}** posture ensures alignment across internal and external stakeholders.
- **Immediate Mandate:** Execute the primary objective to **${cfg.communicationObjective}** within the current planning cycle.

> **Decision Memo:** Cross-functional leadership should review and integrate these key principles into active workflows.
`,

  "LinkedIn Post": (source, cfg) => `
## 💼 LinkedIn Post
*Targeted for ${cfg.targetAudience} (${cfg.toneStyle})*

Clarity in communication is no longer optional—it is a strategic differentiator.

Key takeaways from our latest briefing:
🔹 **The Mandate:** Aligning resources directly to ${cfg.communicationObjective.toLowerCase()}.
🔹 **The Shift:** Turning fragmented data into structured, decision-grade assets.
🔹 **The Audience:** Built for ${cfg.targetAudience.toLowerCase()} who value actionable insight over noise.

How is your team evolving its content operations this quarter? Drop your thoughts below. 👇

#StrategicLeadership #Innovation #ContentTransformation #FutureOfWork
`,

  "Twitter/X Post": (source, cfg) => `
## 🧵 Twitter/X Post (Serialized Thread)
*High-engagement distillation for ${cfg.targetAudience.toLowerCase()}*

1/5 The modern challenge isn't acquiring information—it's distilling it into signal.

2/5 The core objective: ${cfg.communicationObjective}.

3/5 Here is the operational shift:
→ Eliminate repetitive manual drafting
→ Deliver precision deliverables tailored to context
→ Empower ${cfg.targetAudience.toLowerCase()} with immediate takeaways

4/5 Every communication artifact must have a singular purpose, calibrated tone, and zero fluff.

5/5 What's your biggest bottleneck in content repurposing right now? Let's discuss. 💡
`,

  "Video Package": (source, cfg) => `
## 🎥 Video Package
*Screenplay & Production Storyboard*

- **Format:** 90-Second Executive Video
- **Tone:** ${cfg.toneStyle}
- **Target:** ${cfg.targetAudience}

### Storyboard & Script
1. **[00:00 - 00:15] Title Card & Opening Hook:**
   - *Visual:* Clean typography animation on deep charcoal background.
   - *Voiceover:* "What if your team could transform complex data into actionable deliverables in minutes?"
2. **[00:15 - 00:50] Problem & Context:**
   - *Visual:* High-speed breakdown of source materials and extracted metrics.
   - *Voiceover:* "Addressing the critical goal to ${cfg.communicationObjective.toLowerCase()} for ${cfg.targetAudience.toLowerCase()}."
3. **[00:50 - 01:15] Core Directive:**
   - *Visual:* Bulleted milestone cards displaying key insights.
4. **[01:15 - 01:30] Call to Action:**
   - *Visual:* Brand outro and next-step links.
   - *Voiceover:* "Discover how continuous intelligence drives modern execution."
`,

  "Infographic": (source, cfg) => `
## 📊 Infographic Architecture
*Visual Hierarchy & Information Blueprint*

### Header Section
- **Title:** Strategic Intelligence Matrix
- **Audience:** ${cfg.targetAudience}
- **KPI Highlight:** +80% Synthesis Velocity

### Structural Pillars
| Section | Focus Area | Visual Encoding |
| :--- | :--- | :--- |
| **Pillar 1: Ingestion** | Multi-Format Document Ingestion | Funnel Architecture |
| **Pillar 2: Synthesis** | ${cfg.levelOfDetail} Detail Calibration | Radial Spectrum Diagram |
| **Pillar 3: Execution** | ${cfg.communicationObjective} | Metric Scorecard |
`,

  "Advisory": (source, cfg) => `
## ⚠️ Executive Advisory & Action Notice
**Classification:** Confidential &middot; **Priority:** High &middot; **Recipient:** ${cfg.targetAudience}

### Directive Statement
This advisory is commissioned to enforce the strategic goal: **${cfg.communicationObjective}**.

### Key Observations
1. **Governance Alignment:** Review underlying documents to ensure consistent messaging.
2. **Execution Timing:** Immediate operational rollout is recommended.
3. **Voice Calibration:** Maintain strict compliance with the **${cfg.toneStyle}** standard.
`,

  "Presentation": (source, cfg) => `
## 🎤 Keynote Presentation Deck
*5-Slide Executive Architecture*

- **Slide 1:** *Title & Positioning* &mdash; Prepared for ${cfg.targetAudience}
- **Slide 2:** *The Challenge & Context* &mdash; Why we must ${cfg.communicationObjective.toLowerCase()}
- **Slide 3:** *Data Deep Dive* &mdash; Resolution: ${cfg.levelOfDetail}
- **Slide 4:** *Strategic Execution Plan* &mdash; Three core tactical milestones
- **Slide 5:** *Q&A & Operational Next Steps*
`,
};

function buildAntigravityPrompt(
  data: TransformRequest,
  parsedFiles: ParsedFileInfo[]
): string {
  const { configurations: cfg, requestedOutputs, sourceContent } = data;
  const fileContext = buildFileContext(parsedFiles);

  return `
You are an expert Content Transformation Engine.

### CRITICAL INSTRUCTION:
Generate output ONLY for the requested deliverables below. Do NOT include any unselected formats.

### Target Deliverables:
${requestedOutputs.map((o) => `- ${o}`).join("\n")}

### Parameters:
- Audience: ${cfg.targetAudience}
- Tone: ${cfg.toneStyle}
- Language: ${cfg.language}
- Detail: ${cfg.levelOfDetail}
- Objective: ${cfg.communicationObjective}

### Source Input:
${sourceContent || "(Refer to attached documents below)"}

${fileContext ? `\n${fileContext}` : ""}
`.trim();
}

// ---------------------------------------------------------------------------
// Self-Discovering Gemini API Caller (Updated for Gemini 3.6 Flash)
// ---------------------------------------------------------------------------
async function discoverActiveGeminiEndpoint(apiKey: string): Promise<string> {
  for (const apiVer of ["v1beta", "v1"]) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${apiVer}/models?key=${encodeURIComponent(apiKey)}`
      );
      if (res.ok) {
        const data = await res.json();
        const models: Array<{ name: string; supportedGenerationMethods?: string[] }> =
          data.models || [];

        // Filter out deprecated models like 2.5
        const usable = models.filter(
          (m) =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            !m.name.includes("2.5")
        );

        // Prioritize gemini-3.6-flash directly
        const chosen =
          usable.find((m) => m.name.includes("3.6-flash")) ||
          usable.find((m) => m.name.includes("3.6")) ||
          usable.find((m) => m.name.includes("flash") && !m.name.includes("8b")) ||
          usable.find((m) => m.name.includes("pro")) ||
          usable[0];

        if (chosen) {
          console.log(`[AI Core] Auto-selected active model: ${chosen.name} (${apiVer})`);
          return `https://generativelanguage.googleapis.com/${apiVer}/${chosen.name}:generateContent`;
        }
      }
    } catch {
      // Continue to next version
    }
  }

  // Official current model recommended by Google API
  return "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
}

// ---------------------------------------------------------------------------
// Zero-Downtime AI Engine with Intelligent Content Fallback
// ---------------------------------------------------------------------------
async function callAntigravityAPI(
  prompt: string,
  requestedOutputs: OutputType[],
  sourceContent: string,
  configurations: TransformationConfig,
  parsedFiles: ParsedFileInfo[]
): Promise<{
  result: string;
  isFallback: boolean;
  fallbackReason?: string;
}> {
  const rawKey = (process.env.ANTIGRAVITY_API_KEY || process.env.GEMINI_API_KEY)?.trim().replace(/^["']|["']$/g, "");

  const systemInstruction = `You are an elite content strategist and transformation engine.
Your mission is to transform the provided source content into publication-grade, decision-ready communication deliverables.

CRITICAL INSTRUCTIONS:
1. ONLY produce the deliverables explicitly requested. Do NOT generate unrequested formats.
2. Output ACTUAL, substantive, publication-ready content derived strictly from the source facts.
3. NEVER regurgitate system parameters, prompt instructions, engine labels, or internal commentary. Do NOT include phrases like "Posture & Voice", "maintaining the Authoritative standard", or generic "Decision Memo" labels.
4. VERY IMPORTANT: You MUST wrap each requested deliverable in a specific XML-style tag so our system can parse it. Example:
<DELIVERABLE type="Presentation">
...content here...
</DELIVERABLE>

FORMAT SPECIFICATIONS:
- "Executive Summary": Provide an in-depth, elaborative executive analysis. Write 3-4 rich, well-developed paragraphs covering:
  ### Strategic Context & Imperative
  [Elaborate on the background, core thesis, and strategic environment using facts from the input.]
  ### Empirical Findings & Analytical Breakdown
  [Detail the key findings, data points, operational realities, and friction points with clear, comprehensive sentences.]
  ### Strategic Recommendations & Roadmap
  [Actionable strategic roadmap detailing specific steps to execute the objective.]
  (DO NOT include "Decision Memo", "Posture & Voice", or engine boilerplate.)

- "Advisory": Write an authoritative Executive Advisory Notice.
  ### Executive Advisory Statement
  [Clear situational assessment based on the source facts.]
  ### Operational Vulnerabilities & Risks
  [Concrete risks or vulnerabilities identified in the source discourse.]
  ### Mandatory Directives
  [Provide concrete, high-priority operational action items derived strictly from the facts. If no specific operational directives are justified by the source data, omit the "Mandatory Directives" section entirely. DO NOT write meta-instructions like "maintain the tone standard" or "review manuscripts".]

- "Twitter/X Post": Write a SINGLE standalone concise tweet. Under 280 characters. High-impact, punchy, and engaging.
  CRITICAL: Must be a SINGLE tweet, NOT a thread, NOT multi-threaded, NO "1/5", "2/5", etc. Just one complete, powerful tweet.

- "LinkedIn Post": Write an engaging, professional post tailored for LinkedIn with clear spacing and bulleted insights. Write as an industry authority.

- "Presentation": Write a complete 5-slide deck. Format each slide strictly like:
### Slide [Number]: [Title]
- [Bullet Point 1]
- [Bullet Point 2]
- [Bullet Point 3]
**Speaker Notes:** [2-3 sentences of conversational presenter notes for this slide]

- "Infographic": You are an expert Information Designer and Data Architect. Analyze the provided input text and distill the most critical information into this standardized structural template for a high-impact, black-and-white visual infographic.

INSTRUCTIONS:
1. Adapt the bracketed section headings (e.g. "[SECTION 1 HEADING]" -> e.g. "Q4 FINANCIAL HIGHLIGHTS", "NEW POLICY DIRECTIVES", or "MARKET CASE STUDIES") to accurately reflect the data type.
2. Extract Top Section Data (Up to 6 Key Modules): Identify up to 6 key entities (companies, financial quarters, government departments, product features, or metrics). For each, provide a relevant Icon/Entity symbol, the primary metric or actor, and exactly 3 concise, punchy data points or benefits.
   IMPORTANT: If there is only enough data for fewer than 6 items (e.g. 2, 3, or 4 items), include ONLY those items. DO NOT invent filler items or dummy headings.
3. Summary Statement: Write a 1-2 sentence overarching executive summary that bridges the top modules and bottom flow.
4. Extract Bottom Section Data (The Structural Flow): Identify a 7-step sequential process, chronological timeline, or logical breakdown. Distribute these into alternating left/right structural flow nodes. Keep descriptions under 15 words per node.
   IMPORTANT: If the source only supports fewer steps (e.g. 3, 4, or 5 steps), include ONLY those nodes. DO NOT add headings for nodes that lack data.
5. All content is for a pure black-and-white minimalist infographic. Output *only* the filled-out template wrapped in the deliverable tag:

Format:
Infographic Title: [MAIN INFOGRAPHIC TITLE: RELEVANT SUBTITLE]

[SECTION 1 HEADING] (Data Cards/Modules, Top Section):
Item 1: [ICON/ENTITY 1], [PRIMARY ACTOR/METRIC 1], [KEY POINT 1.1], [KEY POINT 1.2], [KEY POINT 1.3]
Item 2: [ICON/ENTITY 2], [PRIMARY ACTOR/METRIC 2], [KEY POINT 2.1], [KEY POINT 2.2], [KEY POINT 2.3]
Item 3: [ICON/ENTITY 3], [PRIMARY ACTOR/METRIC 3], [KEY POINT 3.1], [KEY POINT 3.2], [KEY POINT 3.3]
Item 4: [ICON/ENTITY 4], [PRIMARY ACTOR/METRIC 4], [KEY POINT 4.1], [KEY POINT 4.2], [KEY POINT 4.3]
Item 5: [ICON/ENTITY 5], [PRIMARY ACTOR/METRIC 5], [KEY POINT 5.1], [KEY POINT 5.2], [KEY POINT 5.3]
Item 6: [ICON/ENTITY 6], [PRIMARY ACTOR/METRIC 6], [KEY POINT 6.1], [KEY POINT 6.2], [KEY POINT 6.3]

Summary statement placeholder: [OVERARCHING THEME / EXECUTIVE SUMMARY TEXT BLOCK]

[SECTION 2 HEADING] (Bottom Section):
Title: [SUPPORTING DATA / PROCESS CATEGORY TITLE]

Structural Flow (Left Column):
Node 1: [BOX 1 TITLE], [BOX 1 DESCRIPTION / DATA POINT]
Node 3: [BOX 3 TITLE], [BOX 3 DESCRIPTION / DATA POINT]
Node 5: [BOX 5 TITLE], [BOX 5 DESCRIPTION / DATA POINT]
Node 7: [BOX 7 TITLE], [BOX 7 DESCRIPTION / DATA POINT]

Structural Flow (Right Column):
Node 2: [BOX 2 TITLE], [BOX 2 DESCRIPTION / DATA POINT]
Node 4: [BOX 4 TITLE], [BOX 4 DESCRIPTION / DATA POINT]
Node 6: [BOX 6 TITLE], [BOX 6 DESCRIPTION / DATA POINT]

- "Video Package": Write a scene-by-scene script with timestamps [00:00 - 00:15] and voiceovers.`;

  const fullPrompt = `${systemInstruction}\n\n${prompt}`;
  let liveResult: string | null = null;

  // 1. Attempt live Google Gemini call with multi-model failover
  if (rawKey && rawKey !== "your-api-key-here") {
    const candidateModels = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash"];

    for (const model of candidateModels) {
      if (liveResult) break;
      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(rawKey)}`;
      
      // 10-second delay between retrying models
      const delays = [10000];

      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          const response = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
            }),
            signal: AbortSignal.timeout(10000), // 10s fetch timeout per request
          });

          if (response.ok) {
            const json = await response.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              console.log(`[AI Core] Generation succeeded with model ${model}`);
              liveResult = text;
              break;
            }
          }

          if (response.status === 503 || response.status === 429) {
            console.warn(`[AI Core] ${model} status ${response.status} (High Demand/Busy). Retrying in 10 seconds...`);
            if (attempt < delays.length) {
              await new Promise((res) => setTimeout(res, delays[attempt]));
              continue;
            }
          }

          // If other error, move to next model
          break;
        } catch (networkErr: unknown) {
          console.warn(`[AI Core] Network error calling ${model}:`, networkErr);
          if (attempt < delays.length) {
            console.warn(`[AI Core] Waiting 10s before retrying ${model}...`);
            await new Promise((res) => setTimeout(res, delays[attempt]));
          }
        }
      }
    }
  } else {
    console.error(
      "[AI Engine] CRITICAL: Neither ANTIGRAVITY_API_KEY nor GEMINI_API_KEY is defined in the environment!\n" +
      "If running on Vercel, open Vercel Dashboard -> Project -> Settings -> Environment Variables and add ANTIGRAVITY_API_KEY."
    );
  }

  // If Gemini answered successfully, return it!
  if (liveResult) {
    return {
      result: liveResult,
      isFallback: false,
    };
  }

  // 2. Fail-Safe: Dynamic synthesis extracted directly from user's actual sourceContent
  const isKeyMissing = !rawKey || rawKey === "your-api-key-here";
  const fallbackReason = isKeyMissing
    ? "API key is not configured in Vercel environment variables, so this is a fallback system working here."
    : "API is very busy currently, so this is a fallback system working here. Use a paid Gemini API to avoid this issue.";

  console.log(`[AI Engine] ${fallbackReason} Activating Dynamic Content Synthesizer.`);
  return {
    result: generateDynamicDeliverables(sourceContent, configurations, requestedOutputs, parsedFiles, fallbackReason),
    isFallback: true,
    fallbackReason,
  };
}

// ---------------------------------------------------------------------------
// Dynamic Content Synthesizer (Builds real deliverables from your actual text)
// ---------------------------------------------------------------------------
function generateDynamicDeliverables(
  source: string,
  cfg: TransformationConfig,
  requested: OutputType[],
  files: ParsedFileInfo[],
  fallbackReason = "API is very busy currently, so this is a fallback system working here. Use a paid Gemini API to avoid this issue."
): string {
  // Extract sentences and concepts from user's actual text
  const cleanSource = source.trim() || files.map((f) => f.extractedText || "").join("\n");
  const rawSentences = cleanSource
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim().replace(/^[-*•\d.]+\s*/, ""))
    .filter((s) => s.length > 10);

  const sentences = rawSentences.length > 0
    ? rawSentences
    : [
        `Strategic initiative designed to ${cfg.communicationObjective.toLowerCase()}.`,
        `Direct alignment with ${cfg.targetAudience.toLowerCase()} ensures measurable impact.`,
        `Maintaining a disciplined executive standard across key operations.`,
        `Operational roadmap optimized for leadership synthesis and rapid execution.`,
      ];

  const coreThesis = sentences[0] || `Strategic initiative designed to ${cfg.communicationObjective.toLowerCase()}.`;
  const supportingPoint1 = sentences[1] || sentences[0];
  const supportingPoint2 = sentences[2] || sentences[0];
  const supportingPoint3 = sentences[3] || sentences[1] || sentences[0];

  // Dynamically extract real numbers, percentages, currency, or figures
  const numbersFound = cleanSource.match(/\$?\b\d+([.,]\d+)?(%|[xXkKMbB]|(\s*(million|billion|trillion|units|accounts|logos|users)))?\b/gi) || [];
  const metric1 = numbersFound[0] || "88%";
  const metric2 = numbersFound[1] || "3.5x";
  const metric3 = numbersFound[2] || "100%";

  // Derive a dynamic topic title from the user's actual words
  const firstWords = coreThesis.split(/\s+/).slice(0, 6).join(" ").replace(/[,;:.!?]+$/, "");
  const dynamicTitle = firstWords.length > 8 ? firstWords : `Strategic Analysis: ${cfg.communicationObjective}`;

  const sections: string[] = [];

  for (const outputType of requested) {
    let content = "";
    switch (outputType) {
      case "Executive Summary":
        content = `
## 📝 Executive Summary
**Strategic Mandate:** ${cfg.communicationObjective} &middot; **Audience:** ${cfg.targetAudience}

### Strategic Context & Imperative
${coreThesis} This strategic evaluation synthesizes the underlying operational discourse to ensure seamless alignment across cross-functional leadership, establishing a clear analytical foundation for targeted decision-making.

### Empirical Findings & Analytical Breakdown
An examination of current operational conditions reveals that ${supportingPoint1.toLowerCase()} Furthermore, ${supportingPoint2.toLowerCase()} These dynamics highlight critical operational inflection points that demand coordinated execution rather than isolated tactical adjustments.

### Strategic Recommendations & Roadmap
To successfully ${cfg.communicationObjective.toLowerCase()}, leadership must implement a structured execution cadence. Priorities include operationalizing core insights across active workflows, standardizing data-driven milestones, and establishing rigorous oversight to ensure sustained strategic momentum.
`.trim();
        break;

      case "Presentation":
        content = `
### Slide 1: ${dynamicTitle}
- Executive Briefing prepared for ${cfg.targetAudience}
- Core Thesis: ${coreThesis}
- Strategic Horizon: ${cfg.levelOfDetail}
**Speaker Notes:** Welcome everyone. Today we are examining key developments and actionable directives concerning our objective to ${cfg.communicationObjective.toLowerCase()}.

### Slide 2: Context & Primary Findings
- ${supportingPoint1}
- Critical alignment required across all operational divisions
- Addressing audience-specific requirements for ${cfg.targetAudience}
**Speaker Notes:** This slide outlines the primary context. Notice the operational imperatives highlighted here as we transition into execution mode.

### Slide 3: Evidence & Quantifiable Benchmarks
- Benchmark Alpha: **${metric1}** verified impact indicator
- Secondary Multiplier: **${metric2}** performance trajectory
- System Target: **${metric3}** operational adherence threshold
**Speaker Notes:** The quantitative indicators underscore strong validation. These benchmarks represent tangible progress and clear performance leverage.

### Slide 4: Strategic Recommendations
- Implement immediate workflow milestones to ${cfg.communicationObjective.toLowerCase()}
- ${supportingPoint2}
- Ensure sustained cross-functional alignment and milestone tracking
**Speaker Notes:** Moving to execution, these recommendations provide an actionable blueprint for cross-functional teams over the active cycle.

### Slide 5: Operational Next Steps
- ${supportingPoint3}
- Immediate taskforce alignment and milestone tracking
- Open forum for strategic inquiry and leadership review
**Speaker Notes:** Thank you for your leadership attention. Let us now open the discussion for tactical questions and deployment timelines.
`.trim();
        break;

      case "Infographic": {
        const itemsList: string[] = [];
        itemsList.push(`Item 1: [Primary Mandate], [${metric1} Metric], [${coreThesis.slice(0, 50)}], [Operational alignment established], [Performance benchmarked]`);

        if (sentences.length > 1) {
          itemsList.push(`Item 2: [Operational Dynamics], [${metric2} Factor], [${supportingPoint1.slice(0, 50)}], [Workflow velocity accelerated], [Target impact delivered]`);
        }
        if (sentences.length > 2) {
          itemsList.push(`Item 3: [Strategic Governance], [${metric3} Compliance], [${supportingPoint2.slice(0, 50)}], [Oversight standard enforced], [System fidelity verified]`);
        }

        content = `
Infographic Title: ${dynamicTitle.toUpperCase()}: STRATEGIC INTELLIGENCE ARCHITECTURE

CORE DOMAIN BENCHMARKS (Data Cards/Modules, Top Section):
${itemsList.join("\n")}

Summary statement placeholder: ${coreThesis} This synthesis establishes a unified operational architecture across all communication touchpoints.

EXECUTION PROTOCOL & SEQUENCE (Bottom Section):
Title: STRATEGIC EXECUTION SEQUENCE

Structural Flow (Left Column):
Node 1: [FOUNDATIONAL BASELINE], [Establish cross-departmental cadence and milestones.]
Node 3: [RESOURCE CONCENTRATION], [Direct capital and technical focus toward core goals.]
Node 5: [PIPELINE SYNCHRONIZATION], [Unify deliverable generation across all channels.]
Node 7: [CONTINUOUS RIGOR], [Maintain ongoing performance optimization.]

Structural Flow (Right Column):
Node 2: [WORKFLOW AUDIT], [Eliminate manual repetitive drafting overhead.]
Node 4: [DIRECTIVE DEPLOYMENT], [Roll out targeted initiatives to intended stakeholders.]
Node 6: [EMPIRICAL VALIDATION], [Benchmark quantitative performance against target thresholds.]
`.trim();
        break;
      }

      case "Video Package":
        content = `
[00:00 - 00:15]
Scene 01: Title Card & Hook
Visual: Bold typographic motion graphics displaying "${dynamicTitle}" over a dark obsidian canvas.
Voiceover: "${coreThesis.slice(0, 120)}..."

[00:15 - 00:45]
Scene 02: The Problem Space
Visual: Split-screen montage showing operational friction transitioning into structured visual blueprints.
Voiceover: "${supportingPoint1.slice(0, 140)}..."

[00:45 - 01:15]
Scene 03: The Solution Architecture
Visual: Dynamic animated graph highlighting the ${metric1} efficiency milestone and key takeaways.
Voiceover: "${supportingPoint2.slice(0, 140)}..."

[01:15 - 01:30]
Scene 04: Outro & Call to Action
Visual: Brand emblem and directive URL with motion contact card.
Voiceover: "Discover how continuous intelligence drives modern execution. Join the conversation today."
`.trim();
        break;

      case "LinkedIn Post":
        content = `
Clarity in communication isn't just an asset—it's a competitive advantage.

Key insights from our latest briefing:\n
🔹 The Thesis: ${coreThesis}\n
🔹 The Shift: ${supportingPoint1}\n
🔹 The Impact: ${supportingPoint2}\n

When organizations align around ${cfg.communicationObjective.toLowerCase()}, execution velocity compounds exponentially.

`.trim();
        break;

      case "Twitter/X Post": {
        const tweetText = `${coreThesis.slice(0, 180)} — The mandate: ${cfg.communicationObjective.toLowerCase()}. High-signal execution starts now.`;
        content = tweetText.slice(0, 275);
        break;
      }

      case "Advisory":
        content = `
## ⚠️ Executive Advisory & Action Notice
**Classification:** Confidential &middot; **Priority:** High &middot; **Target:** ${cfg.targetAudience}

### Situational Assessment
A comprehensive evaluation was performed to satisfy the strategic directive: **${cfg.communicationObjective}**.

### Core Findings & Observations
1. **Primary Observation:** ${coreThesis}
2. **Operational Vulnerability:** ${supportingPoint1}
3. **Execution Directive:** ${supportingPoint2}

### Mandatory Directives
- Realign operational taskforce assignments directly to satisfy the core strategic mandate.
- Establish active milestone tracking across all cross-functional departments before the next review cycle.
`.trim();
        break;
    }

    sections.push(`<DELIVERABLE type="${outputType}">\n${content}\n</DELIVERABLE>`);
  }

  const notice = `> ⚠️ **Notice:** ${fallbackReason}\n\n---\n\n`;
  return `${notice}${sections.join("\n\n")}`;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let sourceContent = "";
    let configurations: TransformationConfig;
    let requestedOutputs: OutputType[] = [];
    const parsedFiles: ParsedFileInfo[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const payloadString = formData.get("payload");

      if (!payloadString || typeof payloadString !== "string") {
        return NextResponse.json<TransformErrorResponse>(
          { success: false, error: "Missing payload parameter in form data." },
          { status: 400 }
        );
      }

      let parsedPayload: TransformRequest;
      try {
        parsedPayload = JSON.parse(payloadString);
      } catch {
        return NextResponse.json<TransformErrorResponse>(
          { success: false, error: "Malformed JSON payload inside form data." },
          { status: 400 }
        );
      }

      sourceContent = parsedPayload.sourceContent || "";
      configurations = parsedPayload.configurations;
      requestedOutputs = parsedPayload.requestedOutputs || [];

      const files = formData.getAll("files") as File[];
      for (const file of files) {
        if (file && typeof file === "object" && file.size > 0) {
          const parsed = await parseUploadedFile(file);
          parsedFiles.push(parsed);
        }
      }
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json<TransformErrorResponse>(
          { success: false, error: "Invalid JSON in request body." },
          { status: 400 }
        );
      }

      const raw = body as Record<string, unknown>;
      sourceContent = (raw.sourceContent as string) || "";
      configurations = raw.configurations as unknown as TransformationConfig;
      requestedOutputs = (raw.requestedOutputs as OutputType[]) || [];
    }

    if (!sourceContent.trim() && parsedFiles.length === 0) {
      return NextResponse.json<TransformErrorResponse>(
        { success: false, error: "Please provide source content text or attach documents." },
        { status: 400 }
      );
    }

    if (!configurations || typeof configurations !== "object") {
      return NextResponse.json<TransformErrorResponse>(
        { success: false, error: "Configurations parameter is required." },
        { status: 400 }
      );
    }

    const validOutputs = requestedOutputs.filter((o) =>
      OUTPUT_TYPES.includes(o)
    );

    if (validOutputs.length === 0) {
      return NextResponse.json<TransformErrorResponse>(
        { success: false, error: "Please select at least one deliverable format." },
        { status: 400 }
      );
    }

    const payload: TransformRequest = {
      sourceContent,
      configurations,
      requestedOutputs: validOutputs,
    };

    const prompt = buildAntigravityPrompt(payload, parsedFiles);

    const {
      result: generatedResult,
      isFallback,
      fallbackReason,
    } = await callAntigravityAPI(
      prompt,
      validOutputs,
      sourceContent,
      configurations,
      parsedFiles
    );

    // Save to MongoDB if available (never blocks response)
    let historyId = "unsaved";
    try {
      const db = await connectToDatabase();
      if (db) {
        const historyDoc = await TransformationHistory.create({
          sourceContent:
            sourceContent ||
            `[Documents: ${parsedFiles.map((f) => f.filename).join(", ")}]`,
          configurations,
          requestedOutputs: validOutputs,
          generatedResult,
        });
        historyId = historyDoc._id.toString();
      }
    } catch (dbErr) {
      console.warn("[/api/transform] MongoDB logging skipped:", dbErr);
    }

    return NextResponse.json<TransformResponse>(
      {
        success: true,
        generatedResult,
        historyId,
        isFallback,
        fallbackReason,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[/api/transform] Error:", err);
    const message =
      err instanceof Error ? err.message : "Internal transformation error.";
    return NextResponse.json<TransformErrorResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}