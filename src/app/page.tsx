"use client";

import React, { useState, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Loader2,
  ArrowUpRight,
  Upload,
  FileText,
  FileSpreadsheet,
  Film,
  Image as ImageIcon,
  X,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Asterisk,
  BarChart3,
  Presentation as PresentationIcon,
  Video as VideoIcon,
  Volume2,
  VolumeX,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  TransformationConfig,
  TransformResponse,
  TransformErrorResponse,
  OutputType,
} from "@/lib/types";
import {
  OUTPUT_TYPES,
  CONFIG_OPTIONS,
  ACCEPTED_MIME_TYPES,
  MAX_TOTAL_UPLOAD_BYTES,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Deliverable Catalog
// ---------------------------------------------------------------------------
const CATALOG_ITEMS: Record<
  OutputType,
  { num: string; category: string; subtitle: string; format: string }
> = {
  "Executive Summary": {
    num: "01",
    category: "SYNTHESIS",
    subtitle: "High-level strategic briefing & decision vector",
    format: "Monograph",
  },
  "LinkedIn Post": {
    num: "02",
    category: "DISCOURSE",
    subtitle: "Public narrative with hook & dialogue drivers",
    format: "Editorial Dispatch",
  },
  "Twitter/X Post": {
    num: "03",
    category: "MICRO-TRANSMISSION",
    subtitle: "5-part serialized thread structured for retention",
    format: "Thread",
  },
  "Video Package": {
    num: "04",
    category: "AUDIOVISUAL",
    subtitle: "Visual storyboard, camera cues & narrated voiceover player",
    format: "Storyboard & Audio",
  },
  "Infographic": {
    num: "05",
    category: "ARCHITECTURE",
    subtitle: "Visual metric poster, comparison cards & roadmap pillars",
    format: "Visual Infographic",
  },
  "Advisory": {
    num: "06",
    category: "INTELLIGENCE",
    subtitle: "Risk assessment, directives & operational memo",
    format: "Memorandum",
  },
  "Presentation": {
    num: "07",
    category: "ORATION",
    subtitle: "Visual 5-slide keynote deck with speaker guidance",
    format: "Interactive Slides",
  },
};

const INITIAL_CONFIG: TransformationConfig = {
  targetAudience: "Industry Professionals",
  toneStyle: "Authoritative & Expert",
  language: "English",
  levelOfDetail: "Moderate Detail",
  communicationObjective: "Drive Action / CTA",
};

// ---------------------------------------------------------------------------
// FILE GENERATOR 1: Presentation — Interactive Slide Canvas & Styled .pptx
// ---------------------------------------------------------------------------
interface SlideItem {
  id: number;
  slideNumber: number;
  title: string;
  category: string;
  bullets: string[];
  speakerNotes?: string;
}

function parseSlidesFromMarkdown(rawText: string): SlideItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Split on slide markers
  const rawBlocks = rawText
    .split(/(?=###?\s*Slide\s*\d|###?\s*\d+\.\s*Slide|\*\*Slide\s*\d|Slide\s*\d+[:\-]|(?=###?\s*(?:Title|Executive Briefing|Context|Market|Evidence|Strategic|Next Steps|Summary|Conclusion|Keynote)))/i)
    .filter((b) => b.trim().length > 15);

  if (rawBlocks.length === 0) {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    return [
      {
        id: 1,
        slideNumber: 1,
        title: lines[0]?.replace(/[#*]+/g, '').trim() || 'Strategic Briefing',
        category: 'EXECUTIVE BRIEFING',
        bullets: lines.slice(1, 5).map((l) => l.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim()).filter(Boolean),
        speakerNotes: 'Welcome to this strategic presentation. Today we review our primary directives and core findings.',
      },
    ];
  }

  return rawBlocks.map((block, idx) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

    // Title line extraction
    const rawTitle = lines[0] || `Slide ${idx + 1}`;
    const cleanTitle = rawTitle
      .replace(/^###?\s*/, '')
      .replace(/^Slide\s*\d*[:\-]?\s*/i, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/\*\*/g, '')
      .trim();

    // Speaker notes extraction
    let speakerNotes = '';
    const noteLineIdx = lines.findIndex((l) =>
      l.toLowerCase().includes('speaker note') || l.toLowerCase().startsWith('notes:')
    );
    if (noteLineIdx !== -1) {
      speakerNotes = lines
        .slice(noteLineIdx)
        .join(' ')
        .replace(/\*\*speaker\s*notes?:?\*\*/i, '')
        .replace(/speaker\s*notes?:?/i, '')
        .replace(/\*\*/g, '')
        .trim();
    }

    // Bullets extraction
    const contentLines = noteLineIdx !== -1 ? lines.slice(1, noteLineIdx) : lines.slice(1);
    const bullets: string[] = [];

    contentLines.forEach((line) => {
      const trimmed = line.replace(/^[-*•\d.)\s]+/, '').replace(/\*\*/g, '').trim();
      if (trimmed.length > 0 && !trimmed.toLowerCase().includes('speaker note')) {
        bullets.push(trimmed);
      }
    });

    const category =
      idx === 0
        ? 'EXECUTIVE OVERVIEW'
        : idx === rawBlocks.length - 1
        ? 'STRATEGIC OUTLOOK & NEXT STEPS'
        : `INSIGHT PILLAR 0${idx}`;

    return {
      id: idx + 1,
      slideNumber: idx + 1,
      title: cleanTitle || `Slide ${idx + 1}`,
      category,
      bullets: bullets.length > 0 ? bullets : ['Key strategic insight synthesized from primary discourse.'],
      speakerNotes: speakerNotes || undefined,
    };
  });
}

function PresentationGenerator({ rawText }: { rawText: string }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');

  // Parse slides
  const slides = React.useMemo(() => parseSlidesFromMarkdown(rawText), [rawText]);

  // Handle slide index bounds
  const activeIndex = Math.min(Math.max(0, currentSlide), Math.max(0, slides.length - 1));
  const activeSlide = slides[activeIndex] || {
    id: 1,
    slideNumber: 1,
    title: 'Executive Presentation',
    category: 'EXECUTIVE BRIEFING',
    bullets: ['Synthesizing presentation materials...'],
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  // Export elegant, modern, minimalist PPTX
  const generatePPTX = async () => {
    setStatus('generating');
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'Content Factory Studio';
      pptx.title = activeSlide.title || 'Executive Keynote Deck';

      slides.forEach((slideItem, idx) => {
        const slide = pptx.addSlide();
        slide.background = { color: '0A0A0E' };

        // Subtle top category tag
        slide.addText(`// 0${idx + 1}  •  ${slideItem.category}`, {
          x: 0.8,
          y: 0.6,
          w: '80%',
          h: 0.3,
          fontSize: 10,
          fontFace: 'Arial',
          color: '8E8E96',
          bold: true,
        });

        // Elegant Title in serif
        slide.addText(slideItem.title, {
          x: 0.8,
          y: 0.95,
          w: '88%',
          h: 1.1,
          fontSize: idx === 0 ? 34 : 26,
          fontFace: 'Georgia',
          color: 'F7F7F5',
          valign: 'top',
        });

        // Hairline accent line under title
        slide.addShape(pptx.ShapeType.line, {
          x: 0.8,
          y: 2.1,
          w: 1.5,
          h: 0,
          line: { color: '4E4E56', width: 1 },
        });

        // Bullet point cards
        if (slideItem.bullets && slideItem.bullets.length > 0) {
          const bulletObjects = slideItem.bullets.map((b) => ({
            text: b,
            options: {
              fontSize: 15,
              color: 'D4D4D8',
              bullet: { code: '25C7' }, // Diamond symbol ◇
              lineSpacingMultiple: 1.4,
              paraSpaceAfter: 12,
              fontFace: 'Arial',
            },
          }));

          slide.addText(bulletObjects, {
            x: 0.8,
            y: 2.4,
            w: '86%',
            h: 4.2,
            valign: 'top',
          });
        }

        // Slide counter stamp bottom right
        slide.addText(`0${idx + 1} / 0${slides.length}`, {
          x: '85%',
          y: '90%',
          w: 1.0,
          h: 0.4,
          fontSize: 10,
          fontFace: 'Arial',
          color: '6B7280',
          align: 'right',
        });

        // Add native speaker notes
        if (slideItem.speakerNotes) {
          slide.addNotes(slideItem.speakerNotes);
        }
      });

      await pptx.writeFile({ fileName: `ContentFactory_Keynote_${Date.now()}.pptx` });
      setStatus('done');
    } catch (err) {
      console.error('PPTX generation failed:', err);
      setStatus('error');
    }
  };

  return (
    <div className="border border-white/[0.12] bg-white/[0.025] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 sm:p-10 space-y-6 rounded-2xl">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <PresentationIcon className="h-4 w-4 text-[#f7f7f5]" />
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#f7f7f5]">
              Presentation Deck &middot; Interactive Studio Preview
            </span>
            <span className="block font-mono text-[10px] text-[#8e8e96] uppercase tracking-wider mt-0.5">
              SLIDE 0{activeIndex + 1} OF 0{slides.length} &middot; WIDESCREEN 16:9
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={generatePPTX}
          disabled={status === 'generating'}
          className="flex items-center justify-center gap-2 font-mono text-xs border border-white/[0.15] bg-white/[0.04] backdrop-blur-md px-5 py-2.5 text-[#f7f7f5] hover:bg-white/[0.1] hover:border-white/[0.25] transition-all disabled:opacity-50 rounded-xl shadow-sm"
        >
          {status === 'generating' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting .pptx...</>
          ) : status === 'done' ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> [ Downloaded .pptx ]</>
          ) : status === 'error' ? (
            <><RotateCcw className="h-3.5 w-3.5 text-rose-400" /> [ Retry Export ]</>
          ) : (
            <><Download className="h-3.5 w-3.5" /> [ Download .pptx ]</>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Interactive 16:9 Slide Canvas Preview                         */}
      {/* ------------------------------------------------------------- */}
      <div className="relative w-full aspect-[16/9] min-h-[380px] sm:min-h-[460px] bg-[#0c0c10]/85 backdrop-blur-xl border border-white/[0.14] p-8 sm:p-14 flex flex-col justify-between overflow-hidden shadow-2xl rounded-2xl">
        {/* Subtle grid backdrop */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Corner registration marks */}
        <span className="absolute top-3 left-3 font-mono text-[9px] text-white/20 select-none">+</span>
        <span className="absolute top-3 right-3 font-mono text-[9px] text-white/20 select-none">+</span>
        <span className="absolute bottom-3 left-3 font-mono text-[9px] text-white/20 select-none">+</span>
        <span className="absolute bottom-3 right-3 font-mono text-[9px] text-white/20 select-none">+</span>

        {/* Slide Top Metadata */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/[0.08] pb-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8e8e96]">
            // 0{activeIndex + 1} &middot; {activeSlide.category}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#8e8e96]">
            CONTENT FACTORY // KEYNOTE
          </span>
        </div>

        {/* Slide Body */}
        <div className="relative z-10 my-auto py-4">
          <h3 className="font-serif text-2xl sm:text-4xl text-[#f7f7f5] font-normal tracking-tight leading-snug mb-3">
            {activeSlide.title}
          </h3>
          <div className="w-12 h-[1px] bg-white/30 mb-6" />

          <div className="space-y-3.5 max-w-4xl">
            {activeSlide.bullets.map((bullet, bIdx) => (
              <div
                key={bIdx}
                className="flex items-start gap-3.5 p-3.5 bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl shadow-sm"
              >
                <span className="text-[#8e8e96] text-xs font-mono select-none mt-0.5">◇</span>
                <p className="font-sans text-xs sm:text-sm text-[#d4d4d8] leading-relaxed">
                  {bullet}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Slide Footer */}
        <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="font-mono text-[10px] uppercase tracking-widest text-[#8e8e96] hover:text-[#f7f7f5] transition-colors flex items-center gap-1.5 px-2.5 py-1 hover:bg-white/5 rounded-md"
          >
            <span>🎙️</span>
            {showNotes ? '[ Hide Speaker Notes ]' : '[ View Speaker Notes ]'}
          </button>

          <span className="font-mono text-[11px] text-[#8e8e96] tracking-widest">
            0{activeIndex + 1} / 0{slides.length}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Slide Navigation Strip                                         */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.02] backdrop-blur-md p-4 border border-white/[0.1] rounded-xl shadow-inner">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
            disabled={activeIndex === 0}
            className="flex items-center gap-1 font-mono text-xs border border-white/[0.12] bg-white/[0.02] px-3 py-1.5 text-[#f7f7f5] hover:bg-white/[0.08] disabled:opacity-30 transition-all rounded-lg"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>

          <button
            type="button"
            onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
            disabled={activeIndex === slides.length - 1}
            className="flex items-center gap-1 font-mono text-xs border border-white/[0.12] bg-white/[0.02] px-3 py-1.5 text-[#f7f7f5] hover:bg-white/[0.08] disabled:opacity-30 transition-all rounded-lg"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Slide Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {slides.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`font-mono text-[11px] px-3 py-1 border transition-all rounded-lg ${
                idx === activeIndex
                  ? 'bg-[#f7f7f5] text-[#0a0a0c] border-[#f7f7f5] font-bold shadow-md'
                  : 'bg-white/[0.02] text-[#8e8e96] border-white/[0.08] hover:text-[#f7f7f5] hover:border-white/20 hover:bg-white/[0.05]'
              }`}
            >
              0{idx + 1}
            </button>
          ))}
        </div>

        <span className="font-mono text-[10px] text-[#8e8e96] uppercase tracking-widest hidden md:inline">
          Use ← / → keys to flip
        </span>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Expandable Speaker Notes Drawer                               */}
      {/* ------------------------------------------------------------- */}
      {showNotes && (
        <div className="border border-amber-500/20 border-l-2 border-l-amber-400/80 bg-amber-500/[0.04] backdrop-blur-md p-5 space-y-2 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-300">
              PRESENTER DISCOURSE // SPEAKER SCRIPT (SLIDE 0{activeIndex + 1})
            </span>
            <button
              type="button"
              onClick={() => {
                if (activeSlide.speakerNotes) {
                  navigator.clipboard.writeText(activeSlide.speakerNotes);
                }
              }}
              className="font-mono text-[10px] text-[#8e8e96] hover:text-[#f7f7f5] uppercase tracking-widest px-2 py-1 hover:bg-white/5 rounded-md"
            >
              [ Copy Notes ]
            </button>
          </div>
          <p className="font-serif italic text-sm text-[#e4e4e7] leading-relaxed">
            "{activeSlide.speakerNotes || 'No specific presenter notes provided for this slide.'}"
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FILE GENERATOR 2: Infographic — Dynamic Parsing & Export as PNG
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// FILE GENERATOR 2: Infographic — Standardized B&W Architecture & PNG Export
// ---------------------------------------------------------------------------
interface InfographicModuleItem {
  iconEntity: string;
  metricActor: string;
  points: string[];
}

interface InfographicFlowNode {
  number: number;
  title: string;
  desc: string;
}

interface StandardizedInfographicData {
  title: string;
  subtitle: string;
  section1Heading: string;
  items: InfographicModuleItem[];
  summary: string;
  section2Heading: string;
  flowTitle: string;
  leftNodes: InfographicFlowNode[];
  rightNodes: InfographicFlowNode[];
}

function parseStandardizedInfographic(rawText: string): StandardizedInfographicData {
  if (!rawText || !rawText.trim()) {
    return {
      title: 'STRATEGIC INFORMATION ARCHITECTURE',
      subtitle: 'STANDARDIZED MONOCHROME DATA BLUEPRINT',
      section1Heading: 'CORE DATA CARDS',
      items: [],
      summary: '',
      section2Heading: 'STRUCTURAL PROCESS FLOW',
      flowTitle: 'EXECUTION PROTOCOL',
      leftNodes: [],
      rightNodes: [],
    };
  }

  // Clean out XML tags, Markdown fences, and stray text
  const cleanText = rawText
    .replace(/<DELIVERABLE[^>]*>/gi, '')
    .replace(/<\/DELIVERABLE>/gi, '')
    .replace(/```(?:markdown|xml)?/gi, '')
    .trim();

  // 1. Title & Subtitle
  const titleMatch = cleanText.match(/Infographic Title:\s*([^:\n]+)(?::\s*([^\n]+))?/i);
  let title = titleMatch ? titleMatch[1].replace(/[\[\]]/g, '').trim() : 'STRATEGIC INFORMATION ARCHITECTURE';
  let subtitle = titleMatch && titleMatch[2] ? titleMatch[2].replace(/[\[\]]/g, '').trim() : 'EXECUTIVE DATA BLUEPRINT & SEQUENTIAL FLOW';

  // 2. Section 1 Heading
  const sec1Match = cleanText.match(/([^\n]+?)\s*\(Data Cards\/Modules/i) || cleanText.match(/\[SECTION 1 HEADING\]:?\s*([^\n]+)/i);
  const section1Heading = sec1Match ? sec1Match[1].replace(/[\[\]]/g, '').trim() : 'PERFORMANCE MODULES & METRICS';

  // 3. Items (Top Section Data Modules)
  const items: InfographicModuleItem[] = [];
  const itemLines = cleanText.split('\n').filter((l) => /^\s*Item\s*\d+:/i.test(l));

  itemLines.forEach((line, idx) => {
    const rawContent = line.replace(/^\s*Item\s*\d+:\s*/i, '').trim();
    // Split on commas not inside brackets
    const tokens = rawContent.split(/,\s*(?![^\[]*\])/).map((t) => t.replace(/[\[\]]/g, '').trim()).filter(Boolean);
    if (tokens.length >= 2) {
      items.push({
        iconEntity: tokens[0] || `MODULE 0${idx + 1}`,
        metricActor: tokens[1] || 'KEY METRIC',
        points: tokens.slice(2).filter((p) => p.length > 0),
      });
    }
  });

  // Fallback for items if earlier format was output
  if (items.length === 0) {
    const blocks = cleanText.split(/(?=###?\s)/g).filter((s) => s.trim().length > 15);
    blocks.forEach((b, idx) => {
      if (idx > 0 && items.length < 6) {
        const lines = b.trim().split('\n').map((l) => l.trim()).filter(Boolean);
        const heading = lines[0]?.replace(/^###?\s*/, '').replace(/\*\*/g, '').trim() || `MODULE 0${items.length + 1}`;
        const metric = lines[1]?.replace(/\*\*/g, '').trim() || 'INDICATOR';
        const points = lines.slice(2, 5).map((l) => l.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
        items.push({
          iconEntity: heading,
          metricActor: metric,
          points: points.length > 0 ? points : [lines.slice(2).join(' ').slice(0, 100)],
        });
      }
    });
  }

  // 4. Summary statement
  const summaryMatch = cleanText.match(/(?:Summary statement(?: placeholder)?:\s*|Summary:\s*)(?:\[([^\]]+)\]|([^\n]+))/i);
  const summary = summaryMatch ? (summaryMatch[1] || summaryMatch[2] || '').replace(/[\[\]]/g, '').trim() : '';

  // 5. Section 2 Heading
  const sec2Match = cleanText.match(/([^\n]+?)\s*\(Bottom Section\)/i) || cleanText.match(/\[SECTION 2 HEADING\]:?\s*([^\n]+)/i);
  const section2Heading = sec2Match ? sec2Match[1].replace(/[\[\]]/g, '').trim() : 'STRUCTURAL FLOW & PROCESS';

  // 6. Flow Title
  const flowTitleMatch = cleanText.match(/Title:\s*(?:\[([^\]]+)\]|([^\n]+))/i);
  const flowTitle = flowTitleMatch ? (flowTitleMatch[1] || flowTitleMatch[2] || '').replace(/[\[\]]/g, '').trim() : 'SEQUENTIAL EXECUTION TIMELINE';

  // 7. Left and Right Flow Nodes
  const leftNodes: InfographicFlowNode[] = [];
  const rightNodes: InfographicFlowNode[] = [];
  const nodeLines = cleanText.split('\n').filter((l) => /^\s*Node\s*\d+:/i.test(l));

  nodeLines.forEach((line) => {
    const match = line.match(/^\s*Node\s*(\d+):\s*(?:\[([^\]]+)\]|([^,\n]+))\s*,\s*(?:\[([^\]]+)\]|([^\n]+))/i);
    if (match) {
      const num = parseInt(match[1], 10);
      const nodeTitle = (match[2] || match[3] || '').replace(/[\[\]]/g, '').trim();
      const nodeDesc = (match[4] || match[5] || '').replace(/[\[\]]/g, '').trim();
      if (nodeTitle && nodeDesc) {
        const nodeObj: InfographicFlowNode = { number: num, title: nodeTitle, desc: nodeDesc };
        if (num % 2 !== 0) {
          leftNodes.push(nodeObj);
        } else {
          rightNodes.push(nodeObj);
        }
      }
    }
  });

  leftNodes.sort((a, b) => a.number - b.number);
  rightNodes.sort((a, b) => a.number - b.number);

  return { title, subtitle, section1Heading, items, summary, section2Heading, flowTitle, leftNodes, rightNodes };
}

function InfographicGenerator({ rawText }: { rawText: string }) {
  const infographicRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');

  // Parse structured infographic data
  const data = React.useMemo(() => parseStandardizedInfographic(rawText), [rawText]);

  const downloadPNG = async () => {
    if (!infographicRef.current) return;
    setStatus('generating');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(infographicRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `ContentFactory_Infographic_BW_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setStatus('done');
    } catch (err) {
      console.error('Infographic export failed:', err);
      setStatus('error');
    }
  };

  const hasFlowNodes = data.leftNodes.length > 0 || data.rightNodes.length > 0;

  return (
    <div className="border border-white/[0.12] bg-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 sm:p-10 space-y-6 rounded-2xl">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.12] pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-4 w-4 text-[#ffffff]" />
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#ffffff]">
              Infographic &middot; Black &amp; White Architecture
            </span>
            <span className="block font-mono text-[10px] text-[#8e8e96] uppercase tracking-wider mt-0.5">
              PURE MONOCHROME &middot; HIGH-RESOLUTION POSTER
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadPNG}
          disabled={status === 'generating'}
          className="flex items-center justify-center gap-2 font-mono text-xs border border-white/[0.2] bg-white/[0.04] backdrop-blur-md px-5 py-2.5 text-[#ffffff] hover:bg-white hover:text-black transition-all disabled:opacity-50 rounded-xl shadow-sm"
        >
          {status === 'generating' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting PNG...</>
          ) : status === 'done' ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-white" /> [ Downloaded PNG ]</>
          ) : status === 'error' ? (
            <><RotateCcw className="h-3.5 w-3.5 text-white" /> [ Retry Export ]</>
          ) : (
            <><Download className="h-3.5 w-3.5" /> [ Export Black &amp; White PNG ]</>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Rendered Poster: Captured as High-Res Black & White Image     */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={infographicRef}
        style={{
          backgroundColor: '#000000',
          color: '#ffffff',
          padding: '60px 48px',
          minHeight: '880px',
          width: '100%',
          maxWidth: '960px',
          margin: '0 auto',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          boxSizing: 'border-box',
        }}
      >
        {/* Subtle monochrome geometric grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.025,
            pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />

        {/* Corner registration marks */}
        <span style={{ position: 'absolute', top: 12, left: 14, fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', userSelect: 'none' }}>+</span>
        <span style={{ position: 'absolute', top: 12, right: 14, fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', userSelect: 'none' }}>+</span>
        <span style={{ position: 'absolute', bottom: 12, left: 14, fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', userSelect: 'none' }}>+</span>
        <span style={{ position: 'absolute', bottom: 12, right: 14, fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', userSelect: 'none' }}>+</span>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header Block */}
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.25)', paddingBottom: '32px', marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                STUDIO EDITION // BLACK &amp; WHITE ARCHITECTURE
              </span>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.15em' }}>
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
              </span>
            </div>

            <h2
              style={{
                fontSize: '40px',
                fontWeight: 300,
                color: '#ffffff',
                margin: '0 0 12px 0',
                fontFamily: 'Georgia, serif',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
              }}
            >
              {data.title}
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: 'rgba(255, 255, 255, 0.65)',
                fontFamily: 'Arial, sans-serif',
                margin: 0,
                maxWidth: '85%',
                lineHeight: 1.5,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {data.subtitle}
            </p>
          </div>

          {/* Section 1: Top Data Cards/Modules */}
          <div style={{ marginBottom: '44px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.45)', letterSpacing: '0.25em' }}>
                // 01
              </span>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 400,
                  color: '#ffffff',
                  margin: 0,
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                }}
              >
                {data.section1Heading}
              </h3>
            </div>

            {data.items.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: data.items.length === 1 ? '1fr' : data.items.length === 2 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '18px',
                }}
              >
                {data.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '16px',
                      padding: '22px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      {/* Entity / Icon Tag */}
                      <div
                        style={{
                          display: 'inline-block',
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          letterSpacing: '0.15em',
                          textTransform: 'uppercase',
                          marginBottom: '12px',
                        }}
                      >
                        {item.iconEntity}
                      </div>

                      {/* Primary Metric / Actor */}
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: 400,
                          color: '#ffffff',
                          fontFamily: 'Georgia, serif',
                          lineHeight: 1.2,
                          marginBottom: '14px',
                        }}
                      >
                        {item.metricActor}
                      </div>

                      <div style={{ width: '100%', height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.12)', marginBottom: '14px' }} />

                      {/* 3 Key Points */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {item.points.map((pt, pIdx) => (
                          <div key={pIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px', userSelect: 'none', lineHeight: '1.4' }}>—</span>
                            <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.75)', fontFamily: 'Arial, sans-serif', lineHeight: 1.45 }}>
                              {pt}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '24px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
                  NO DISCRETE MODULE METRICS IN SOURCE TEXT
                </span>
              </div>
            )}
          </div>

          {/* Center Section: Overarching Theme / Executive Summary */}
          {data.summary && (
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                borderRadius: '16px',
                padding: '24px 28px',
                marginBottom: '44px',
              }}
            >
              <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.45)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '8px' }}>
                // OVERARCHING THEME &middot; EXECUTIVE ARCHITECTURE
              </div>
              <p
                style={{
                  fontSize: '15px',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  color: '#ffffff',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                "{data.summary}"
              </p>
            </div>
          )}

          {/* Section 2: Bottom Section - Structural Flow */}
          {hasFlowNodes && (
            <div style={{ marginBottom: '40px' }}>
              <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '12px', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.45)', letterSpacing: '0.25em' }}>
                    // 02
                  </span>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 400,
                      color: '#ffffff',
                      margin: 0,
                      fontFamily: 'Georgia, serif',
                      textTransform: 'uppercase',
                    }}
                  >
                    {data.section2Heading}
                  </h3>
                </div>
                {data.flowTitle && (
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '0.15em', marginTop: '4px', textTransform: 'uppercase' }}>
                    {data.flowTitle}
                  </div>
                )}
              </div>

              {/* Alternating Dual Column Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {/* Left Column (Nodes 1, 3, 5, 7) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    PHASE ALPHA &middot; LEFT FLOW
                  </div>
                  {data.leftNodes.map((node) => (
                    <div
                      key={node.number}
                      style={{
                        backgroundColor: '#000000',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '14px',
                        padding: '16px 18px',
                      }}
                    >
                      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#ffffff', letterSpacing: '0.15em', marginBottom: '6px' }}>
                        // NODE 0{node.number}
                      </div>
                      <div style={{ fontSize: '14px', fontFamily: 'Georgia, serif', fontWeight: 500, color: '#ffffff', marginBottom: '6px', lineHeight: 1.3 }}>
                        {node.title}
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'Arial, sans-serif', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.45 }}>
                        {node.desc}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Column (Nodes 2, 4, 6) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    PHASE BETA &middot; RIGHT FLOW
                  </div>
                  {data.rightNodes.map((node) => (
                    <div
                      key={node.number}
                      style={{
                        backgroundColor: '#000000',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '14px',
                        padding: '16px 18px',
                      }}
                    >
                      <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#ffffff', letterSpacing: '0.15em', marginBottom: '6px' }}>
                        // NODE 0{node.number}
                      </div>
                      <div style={{ fontSize: '14px', fontFamily: 'Georgia, serif', fontWeight: 500, color: '#ffffff', marginBottom: '6px', lineHeight: 1.3 }}>
                        {node.title}
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'Arial, sans-serif', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.45 }}>
                        {node.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Monochrome Footer */}
          <div
            style={{
              marginTop: '40px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace', letterSpacing: '0.2em' }}>
              CONTENT FACTORY // MONOCHROME DATA ARCHITECTURE
            </span>
            <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)', fontFamily: 'monospace', letterSpacing: '0.2em' }}>
              CLASSIFICATION: STRICTLY CONFIDENTIAL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FILE GENERATOR 3: Video Package — storyboard + downloadable script + TTS
// ---------------------------------------------------------------------------
function VideoPackageGenerator({ rawText }: { rawText: string }) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Parse the video script into scenes
  const scenes = React.useMemo(() => {
    const rawScenes = rawText
      .split(/(?=\[\d\d:\d\d|Scene\s*\d|###\s*Scene|SCENE\s*\d)/i)
      .filter((s) => s.trim().length > 15);

    if (rawScenes.length === 0) {
      return [{ title: 'Opening', time: '00:00 - 00:30', body: rawText.slice(0, 300), duration: 30 }];
    }

    return rawScenes.map((s, idx) => {
      const timeMatch = s.match(/\[(\d\d:\d\d\s*[-\u2013]\s*\d\d:\d\d)\]/);
      const time = timeMatch ? timeMatch[1] : `00:${String(idx * 15).padStart(2, '0')} - 00:${String((idx + 1) * 15).padStart(2, '0')}`;
      const titleMatch = s.match(/(?:###?\s*|Scene\s*\d+\s*[:\-\u2013]?\s*|SCENE\s*\d+\s*[:\-\u2013]?\s*|\[\s*Scene\s*\d+\s*\]\s*)(.*)/i);
      const title = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : `Scene ${idx + 1}`;
      const body = s.replace(/(?:###?\s*|Scene\s*\d+\s*[:\-\u2013]?\s*|SCENE\s*\d+\s*[:\-\u2013]?\s*|\[\s*Scene\s*\d+\s*\]\s*).*/, '').replace(/[#*\[\]]/g, '').trim();
      return { title, time, body, duration: Math.max(5, Math.ceil(body.length / 30)) };
    });
  }, [rawText]);

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  // Download formatted script as text file
  const downloadScript = () => {
    const content = [
      '========================================================',
      '         CONTENT FACTORY — VIDEO SCRIPT                  ',
      '========================================================',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Estimated Duration: ${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`,
      `Total Scenes: ${scenes.length}`,
      '',
      '========================================================',
      '',
      ...scenes.flatMap((scene, i) => [
        `SCENE ${i + 1}: ${scene.title}`,
        `Timestamp: ${scene.time}  |  Duration: ~${scene.duration}s`,
        '----------------------------------------',
        scene.body,
        '',
        '',
      ]),
      '========================================================',
      'END OF SCRIPT',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = 'ContentFactory_VideoScript.txt';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // Browser TTS voiceover preview
  const toggleNarration = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const fullScript = scenes.map((s) => s.body).join('. ');
      const utterance = new SpeechSynthesisUtterance(fullScript.substring(0, 5000));
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="border border-white/[0.12] bg-white/[0.025] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6 sm:p-10 space-y-6 rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-[#f7f7f5]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#f7f7f5]">
            Video Package — Script &amp; Storyboard
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#8e8e96]">
          ~{Math.floor(totalDuration / 60)}m {totalDuration % 60}s &bull; {scenes.length} SCENES
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={toggleNarration}
          className="flex items-center gap-2 font-mono text-xs border border-white/[0.15] bg-white/[0.03] backdrop-blur-md px-4 py-2.5 text-[#f7f7f5] hover:bg-white/[0.08] hover:border-white/[0.25] transition-all rounded-xl shadow-sm"
        >
          {isPlaying ? (
            <><VolumeX className="h-3.5 w-3.5 text-rose-400" /> [ Stop Voiceover ]</>
          ) : (
            <><Volume2 className="h-3.5 w-3.5 text-emerald-400" /> [ Preview Voiceover ]</>
          )}
        </button>
        <button
          type="button"
          onClick={downloadScript}
          className="flex items-center gap-2 font-mono text-xs border border-white/[0.15] bg-white/[0.03] backdrop-blur-md px-4 py-2.5 text-[#f7f7f5] hover:bg-white/[0.08] hover:border-white/[0.25] transition-all rounded-xl shadow-sm"
        >
          <Download className="h-3.5 w-3.5" /> [ Download Script ]
        </button>
      </div>

      {/* Visual Storyboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.slice(0, 9).map((scene, idx) => (
          <div key={idx} className="border border-white/[0.1] bg-white/[0.025] backdrop-blur-md p-5 flex flex-col justify-between space-y-3 rounded-xl hover:border-white/[0.2] hover:bg-white/[0.04] transition-all shadow-sm">
            {/* Fake video frame */}
            <div className="aspect-video bg-gradient-to-br from-white/[0.05] to-white/[0.01] backdrop-blur-sm flex items-center justify-center relative overflow-hidden rounded-lg border border-white/[0.06]">
              <span className="text-3xl opacity-15">&#127916;</span>
              <span className="absolute top-2 left-2 font-mono text-[9px] text-[#8e8e96] bg-black/60 px-1.5 py-0.5 rounded">
                SCENE {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="absolute bottom-2 right-2 font-mono text-[9px] text-[#8e8e96]">
                {scene.time}
              </span>
            </div>
            <h4 className="font-serif text-sm text-[#f7f7f5] truncate">{scene.title}</h4>
            <p className="text-[#8e8e96] text-[11px] font-sans leading-relaxed line-clamp-3">
              {scene.body.substring(0, 180)}
            </p>
          </div>
        ))}
      </div>

      {scenes.length > 9 && (
        <p className="text-[#8e8e96] text-xs text-center font-mono">
          + {scenes.length - 9} additional scenes in download
        </p>
      )}

      {/* Limitation Note */}
      <div className="border border-amber-500/25 bg-amber-500/[0.04] backdrop-blur-md p-4 rounded-xl shadow-sm">
        <p className="text-amber-200/60 text-xs font-mono">
          [ NOTE ] Actual .mp4 video generation requires specialized AI services (Runway ML, HeyGen, Synthesia).
          This package provides the complete production-ready script &amp; storyboard for your video team.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
export default function EditorialDashboard() {
  const [sourceContent, setSourceContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [config, setConfig] = useState<TransformationConfig>(INITIAL_CONFIG);
  const [selectedOutputs, setSelectedOutputs] = useState<Set<OutputType>>(
    new Set(["Presentation", "Infographic"])
  );

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfigChange = useCallback((key: keyof TransformationConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleOutputToggle = useCallback((outputType: OutputType) => {
    setSelectedOutputs((prev) => {
      const next = new Set(prev);
      if (next.has(outputType)) next.delete(outputType);
      else next.add(outputType);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedOutputs(new Set(OUTPUT_TYPES));
  const deselectAll = () => setSelectedOutputs(new Set());

  const addFiles = useCallback((incomingFiles: FileList | File[]) => {
    const validList: File[] = [];
    let cumulativeSize = 0;
    for (const file of Array.from(incomingFiles)) {
      cumulativeSize += file.size;
      validList.push(file);
    }
    if (cumulativeSize > MAX_TOTAL_UPLOAD_BYTES) {
      setError("Document payload exceeds the 10 MB limit.");
      return;
    }
    setAttachedFiles((prev) => [...prev, ...validList]);
    setError(null);
  }, []);

  const removeFile = useCallback((idxToRemove: number) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  }, []);

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setResult(null);
      setIsFallback(false);
      setFallbackReason(null);

      if (!sourceContent.trim() && attachedFiles.length === 0) {
        setError("Please supply primary source text or attach reference documents.");
        return;
      }

      if (selectedOutputs.size === 0) {
        setError("Please select at least one deliverable format from the index.");
        return;
      }

      setIsLoading(true);

      try {
        const formData = new FormData();
        const payload = {
          sourceContent,
          configurations: config,
          requestedOutputs: Array.from(selectedOutputs),
        };

        formData.append("payload", JSON.stringify(payload));
        attachedFiles.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/transform", {
          method: "POST",
          body: formData,
        });

        const rawText = await response.text();
        let data: TransformResponse | TransformErrorResponse;
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error(`Server returned non-JSON (${response.status}): ${rawText || "Empty body."}`);
        }

        if (!data.success) {
          setError(data.error);
        } else {
          setResult(data.generatedResult);
          setIsFallback(Boolean(data.isFallback));
          setFallbackReason(data.fallbackReason || null);
          setTimeout(() => {
            document.getElementById("editorial-exhibition")?.scrollIntoView({ behavior: "smooth" });
          }, 150);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Synthesis error.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [sourceContent, attachedFiles, config, selectedOutputs]
  );

  // Helper to strictly extract specific deliverables without cross-polluting
  const getDeliverableText = useCallback(
    (type: string) => {
      if (!result) return "";

      // 1. Try flexible case-insensitive XML tag: <DELIVERABLE type="...">...</DELIVERABLE>
      const tagRegex = new RegExp(
        `<DELIVERABLE\\s+type=["']?${type}["']?\\s*>([\\s\\S]*?)<\\/DELIVERABLE>`,
        "i"
      );
      const tagMatch = result.match(tagRegex);
      if (tagMatch && tagMatch[1].trim()) {
        return tagMatch[1].trim();
      }

      // 2. Try markdown headers: ## [Optional Emoji] Type
      const escapedType = type.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const headerRegex = new RegExp(
        `##\\s*(?:[^\\n]*?)\\b${escapedType}\\b.*?\\n([\\s\\S]*?)(?=\\n##\\s|<DELIVERABLE|$)`,
        "i"
      );
      const headerMatch = result.match(headerRegex);
      if (headerMatch && headerMatch[1].trim()) {
        return headerMatch[1].trim();
      }

      // 3. Fallback only if the user selected ONLY this single output format
      if (selectedOutputs.size === 1 && selectedOutputs.has(type as OutputType)) {
        return result.replace(/<\/?DELIVERABLE[^>]*>/gi, "").trim();
      }

      // Never return the entire result if not found — prevents leakage of Executive Summary
      return "";
    },
    [result, selectedOutputs]
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#f7f7f5] antialiased relative overflow-x-hidden">
      {/* Ambient background glows for glassmorphic depth & refraction */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-white/[0.015] rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 -left-32 w-[550px] h-[550px] bg-white/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/[0.08] px-6 lg:px-16 py-6 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <span className="font-serif text-2xl font-normal tracking-tight">
            Content Factory<span className="text-[#8e8e96] font-mono text-xs ml-2">[SIH26154]</span>
          </span>
        </div>
        <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-widest text-[#8e8e96]">
          <span>SIH 2026</span>
          <span className="flex items-center gap-2 text-[#f7f7f5]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f7f7f5] animate-ping" />
            CORE ACTIVE
          </span>
        </div>
      </header>

      {/* Hero Headline */}
      <section className="relative z-10 px-6 lg:px-16 pt-20 pb-16 border-b border-white/[0.08]">
        <div className="max-w-6xl">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#8e8e96] mb-6 flex items-center gap-2">
            <Asterisk className="h-3.5 w-3.5 text-[#f7f7f5]" />
            TRANSFORMATION ENGINE
          </div>
          <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-normal leading-[0.98] tracking-tight text-[#f7f7f5]">
            Transform raw{" "}
            <em className="italic font-serif font-light text-[#8e8e96] selection:text-[#0a0a0c]">
              information
            </em>{" "}
            into{" "}
            <span className="underline underline-offset-[4px] sm:underline-offset-[6px] lg:underline-offset-[8px] decoration-[3px] sm:decoration-[4px] lg:decoration-[5px] decoration-[#f7f7f5]">
              sculpted
            </span>{" "}
            discourse.
          </h1>
          <p className="mt-8 font-sans text-base sm:text-lg text-[#8e8e96] max-w-2xl leading-relaxed">
            Deposit unstructured manuscripts or documents. The engine generates <span className="text-[#f7f7f5] font-medium">only</span> the exact communication formats chosen below.
          </p>
        </div>
      </section>

      {/* Studio Workspace */}
      <main className="relative z-10 px-6 lg:px-16 py-16 max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-20">
          {/* Section 01: Input & Docs */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            <div className="lg:col-span-4">
              <div className="font-mono text-sm tracking-widest uppercase text-[#8e8e96] mb-2">( 01 ) // INPUT</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#f7f7f5]">Primary Manuscripts &amp; Archives</h2>
              <p className="font-sans text-sm sm:text-base text-[#a0a0a8] mt-3 leading-relaxed">
                Paste source discourse or deposit files (PDF, DOCX, Spreadsheets, Media).
              </p>
            </div>

            <div className="lg:col-span-8 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sourceContent" className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#d4d4d8] font-medium">
                    Source Discourse &amp; Manuscripts
                  </Label>
                  <span className="font-mono text-[11px] text-[#8e8e96] uppercase tracking-wider">[ Paste text ]</span>
                </div>
                <Textarea
                  id="sourceContent"
                  placeholder="Paste strategic briefings, meeting notes, research, or copy draft here..."
                  className="min-h-[220px] rounded-2xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-xl text-[#f7f7f5] text-base sm:text-lg placeholder:text-base sm:placeholder:text-lg placeholder:text-[#6e6e78] focus-visible:ring-1 focus-visible:ring-[#f7f7f5] font-serif leading-relaxed p-6 sm:p-7 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
                  value={sourceContent}
                  onChange={(e) => setSourceContent(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#d4d4d8] font-medium">
                    File Ingestion &amp; Manuscripts
                  </span>
                  <span className="font-mono text-[11px] text-[#8e8e96] uppercase tracking-wider">[ Up to 10 MB ]</span>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-8 border border-dashed text-center cursor-pointer transition-all rounded-2xl backdrop-blur-md ${
                    isDragging
                      ? "border-[#f7f7f5] bg-white/[0.06] shadow-[0_8px_32px_0_rgba(255,255,255,0.05)]"
                      : "border-white/[0.14] bg-white/[0.02] hover:border-white/[0.3] hover:bg-white/[0.04] shadow-[0_8px_32px_0_rgba(0,0,0,0.25)]"
                  }`}
                >
                  <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_MIME_TYPES} className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} />
                  <Upload className="h-6 w-6 text-[#8e8e96] mb-2.5 stroke-[1.5]" />
                  <span className="font-mono text-sm sm:text-base uppercase tracking-widest text-[#f7f7f5] font-medium">Deposit Archives / Manuscripts</span>
                  <span className="font-sans text-xs sm:text-sm text-[#a0a0a8] mt-1.5">PDF &middot; DOCX &middot; XLSX &middot; PPTX &middot; UP TO 10 MB</span>
                </div>
              </div>

              {attachedFiles.length > 0 && (
                <div className="divide-y divide-white/[0.06] border border-white/[0.1] bg-white/[0.025] backdrop-blur-xl rounded-xl overflow-hidden shadow-sm">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 text-xs sm:text-sm">
                      <span className="font-mono text-xs sm:text-sm text-[#f7f7f5] truncate">{file.name}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="font-mono text-xs text-[#8e8e96] hover:text-[#f7f7f5] px-2.5 py-1 hover:bg-white/10 rounded-md transition-colors">[ Detach ]</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Section 02: Positioning */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-white/[0.08] pt-16">
            <div className="lg:col-span-4">
              <div className="font-mono text-sm tracking-widest uppercase text-[#8e8e96] mb-2">( 02 ) // DIRECTIVES</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#f7f7f5]">Atmosphere &amp; Posture</h2>
            </div>

            <div className="lg:col-span-8 grid gap-6 sm:grid-cols-2">
              <div className="space-y-5.5">
                <Label className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#d4d4d8] font-medium">Target Audience</Label>
                <Select value={config.targetAudience} onValueChange={(v) => handleConfigChange("targetAudience", v)}>
                  <SelectTrigger className="rounded-xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.06] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5]/35 hover:text-[#f7f7f5]/80 shadow-sm transition-all h-9 px-3"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e13]/95 backdrop-blur-2xl rounded-xl border border-white/[0.14] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5] shadow-2xl">{CONFIG_OPTIONS.targetAudience.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-5.5">
                <Label className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#d4d4d8] font-medium">Voice &amp; Posture</Label>
                <Select value={config.toneStyle} onValueChange={(v) => handleConfigChange("toneStyle", v)}>
                  <SelectTrigger className="rounded-xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.06] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5]/35 hover:text-[#f7f7f5]/80 shadow-sm transition-all h-9 px-3"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e13]/95 backdrop-blur-2xl rounded-xl border border-white/[0.14] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5] shadow-2xl">{CONFIG_OPTIONS.toneStyle.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-5.5">
                <Label className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#d4d4d8] font-medium">Language</Label>
                <Select value={config.language} onValueChange={(v) => handleConfigChange("language", v)}>
                  <SelectTrigger className="rounded-xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.06] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5]/35 hover:text-[#f7f7f5]/80 shadow-sm transition-all h-9 px-3"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e13]/95 backdrop-blur-2xl rounded-xl border border-white/[0.14] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5] shadow-2xl">{CONFIG_OPTIONS.language.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-5.5">
                <Label className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#d4d4d8] font-medium">Detail Resolution</Label>
                <Select value={config.levelOfDetail} onValueChange={(v) => handleConfigChange("levelOfDetail", v)}>
                  <SelectTrigger className="rounded-xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.06] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5]/35 hover:text-[#f7f7f5]/80 shadow-sm transition-all h-9 px-3"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e13]/95 backdrop-blur-2xl rounded-xl border border-white/[0.14] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5] shadow-2xl">{CONFIG_OPTIONS.levelOfDetail.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-5.5 sm:col-span-2">
                <Label className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#d4d4d8] font-medium">Strategic Objective</Label>
                <Select value={config.communicationObjective} onValueChange={(v) => handleConfigChange("communicationObjective", v)}>
                  <SelectTrigger className="rounded-xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.06] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5]/35 hover:text-[#f7f7f5]/80 shadow-sm transition-all h-9 px-3"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e13]/95 backdrop-blur-2xl rounded-xl border border-white/[0.14] text-xs sm:text-[13px] font-mono font-normal uppercase tracking-wider text-[#f7f7f5] shadow-2xl">{CONFIG_OPTIONS.communicationObjective.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Section 03: Deliverables Catalog */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-white/[0.08] pt-16">
            <div className="lg:col-span-4">
              <div className="font-mono text-sm tracking-widest uppercase text-[#8e8e96] mb-2">( 03 ) // CATALOG</div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#f7f7f5]">Artifact Editions</h2>
              <div className="mt-6 flex items-center gap-3 font-mono text-sm">
                <button type="button" onClick={selectAll} className="underline text-[#8e8e96] hover:text-[#f7f7f5]">Select All</button>
                <button type="button" onClick={deselectAll} className="underline text-[#8e8e96] hover:text-[#f7f7f5]">Clear All</button>
              </div>
            </div>

            <div className="lg:col-span-8 divide-y divide-white/[0.08] border border-white/[0.12] rounded-2xl overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
              {[...OUTPUT_TYPES]
                .sort((a, b) => CATALOG_ITEMS[a].num.localeCompare(CATALOG_ITEMS[b].num))
                .map((outputType) => {
                const item = CATALOG_ITEMS[outputType];
                const isSelected = selectedOutputs.has(outputType);

                return (
                  <div
                    key={outputType}
                    onClick={() => handleOutputToggle(outputType)}
                    className={`py-5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all ${
                      isSelected ? "bg-white/[0.05] backdrop-blur-sm" : "hover:bg-white/[0.025]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-[#a0a0a8] font-medium">{item.num}</span>
                      <div>
                        <div className="flex items-baseline gap-3">
                          <h3 className={`font-serif text-xl sm:text-2xl ${isSelected ? "text-[#f7f7f5]" : "text-[#8e8e96]"}`}>{outputType}</h3>
                          <span className="font-mono text-xs uppercase tracking-widest text-[#a0a0a8]">[{item.category}]</span>
                        </div>
                        <p className="font-sans text-xs sm:text-sm text-[#8e8e96] mt-1">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <span className="font-mono text-xs uppercase tracking-widest text-[#a0a0a8]">{item.format}</span>
                      <Checkbox checked={isSelected} onCheckedChange={() => handleOutputToggle(outputType)} className="rounded-md border-white/30 data-[state=checked]:bg-[#f7f7f5] data-[state=checked]:text-[#0a0a0c]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {error && <div className="border border-rose-500/50 bg-rose-500/10 p-4 font-mono text-xs text-rose-300 rounded-xl">[ ERROR ] : {error}</div>}

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
            <button
              type="button"
              onClick={() => {
                setSourceContent("");
                setAttachedFiles([]);
                setConfig(INITIAL_CONFIG);
                setSelectedOutputs(new Set(["Presentation", "Infographic"]));
                setResult(null);
                setIsFallback(false);
                setFallbackReason(null);
              }}
              className="font-mono text-xs uppercase tracking-widest text-[#8e8e96] hover:text-[#f7f7f5] px-4 py-2.5 hover:bg-white/[0.05] rounded-xl transition-all"
            >
              [ Reset Parameters ]
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-10 py-5 bg-[#f7f7f5] text-[#0a0a0c] font-mono text-xs uppercase tracking-[0.2em] font-semibold hover:bg-[#dededc] transition-all flex items-center justify-center gap-3 disabled:opacity-50 rounded-xl"
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Synthesizing Visual Deliverables...</> : <>Commission Synthesis ({selectedOutputs.size}) <ArrowUpRight className="h-4 w-4" /></>}
            </button>
          </div>
        </form>

        {/* ------------------------------------------------------------- */}
        {/* Exhibition: Generated Artifacts Gallery                       */}
        {/* ------------------------------------------------------------- */}
        {result && (
          <section id="editorial-exhibition" className="mt-32 pt-16 border-t border-white/[0.1] space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-[#8e8e96] mb-1">( 04 ) // EXHIBITION</div>
                <h2 className="font-serif text-4xl font-normal tracking-tight text-[#f7f7f5]">Synthesized Transmissions</h2>
              </div>
            </div>

            {/* Fallback Notice Banner */}
            {isFallback && (
              <div className="border border-amber-500/30 bg-amber-500/[0.05] backdrop-blur-xl p-5 sm:p-6 flex items-start gap-4 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-mono text-xs uppercase tracking-widest text-amber-300 font-semibold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    [ ENGINE NOTICE: RESILIENT FALLBACK ACTIVE ]
                  </div>
                  <p className="font-sans text-sm text-amber-100/90 leading-relaxed">
                    {fallbackReason || "API is very busy currently, so this is a fallback system working here. Use a paid Gemini API to avoid this issue."}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-14">
              {selectedOutputs.has("Presentation") && (
                <PresentationGenerator rawText={getDeliverableText("Presentation")} />
              )}

              {selectedOutputs.has("Infographic") && (
                <InfographicGenerator rawText={getDeliverableText("Infographic")} />
              )}

              {selectedOutputs.has("Video Package") && (
                <VideoPackageGenerator rawText={getDeliverableText("Video Package")} />
              )}

              {Array.from(selectedOutputs)
                .filter(o => !["Presentation", "Infographic", "Video Package"].includes(o))
                .sort((a, b) => CATALOG_ITEMS[a].num.localeCompare(CATALOG_ITEMS[b].num))
                .map(outputType => {
                  const textContent = getDeliverableText(outputType);
                  if (!textContent.trim()) return null;

                  return (
                    <div key={outputType} className="border border-white/[0.12] bg-white/[0.025] backdrop-blur-xl p-8 sm:p-14 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)]">
                      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
                        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8e8e96]">
                          {outputType} &middot; TEXT ARCHIVE
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(textContent);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="font-mono text-xs uppercase tracking-widest text-[#8e8e96] hover:text-white transition-all flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10"
                        >
                          {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> COPIED</> : <><Copy className="h-3.5 w-3.5" /> COPY TEXT</>}
                        </button>
                      </div>
                      <article className="prose prose-invert max-w-none font-serif prose-h3:text-xl prose-h3:text-[#f7f7f5] prose-h3:mt-8 prose-p:text-[#c4c4c8] prose-p:leading-relaxed prose-li:text-[#c4c4c8]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {textContent}
                        </ReactMarkdown>
                      </article>
                    </div>
                  );
                })}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/[0.08] px-6 lg:px-16 py-12 mt-24 text-center font-mono text-xs uppercase tracking-widest text-[#8e8e96]">
        CONTENT FACTORY &middot; Team NEMESIS
      </footer>
    </div>
  );
}