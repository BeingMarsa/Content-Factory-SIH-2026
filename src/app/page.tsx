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
// FILE GENERATOR 1: Presentation — creates & downloads a real .pptx file
// ---------------------------------------------------------------------------
function PresentationGenerator({ rawText }: { rawText: string }) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');

  const generatePPTX = async () => {
    setStatus('generating');
    try {
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = 'Content Factory';
      pptx.title = 'Content Factory Presentation';

      // Parse slides from AI markdown output
      const slideBlocks = rawText
        .split(/(?=###?\s*Slide|\*\*Slide\s*\d|Slide\s*\d+:)/i)
        .filter((s) => s.trim().length > 20);

      if (slideBlocks.length === 0) {
        // Fallback: treat the whole content as one slide
        const slide = pptx.addSlide();
        slide.background = { color: '0a0a0c' };
        slide.addText('Content Factory', {
          x: 0.5, y: 0.5, w: '90%', h: 1.2,
          fontSize: 36, bold: true, color: 'f7f7f5', fontFace: 'Arial',
        });
        slide.addText(rawText.substring(0, 2000), {
          x: 0.5, y: 2.0, w: '90%', h: 4.5,
          fontSize: 14, color: 'c4c4c8', fontFace: 'Arial', valign: 'top',
          lineSpacingMultiple: 1.4,
        });
      } else {
        slideBlocks.forEach((block, idx) => {
          const slide = pptx.addSlide();
          slide.background = { color: idx === 0 ? '0a0a0c' : '111116' };

          const lines = block.split('\n').filter((l) => l.trim());
          const titleLine = lines[0]
            ?.replace(/^[#*\-:\s\d]+Slide\s*\d*[:\-]?\s*/i, '')
            .replace(/[#*]+/g, '')
            .trim() || `Slide ${idx + 1}`;

          const bullets = lines
            .slice(1)
            .filter((l) =>
              (l.trim().startsWith('-') || l.trim().startsWith('*') || l.trim().startsWith('•')) &&
              !l.toLowerCase().includes('speaker notes')
            )
            .map((l) => l.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim())
            .filter((l) => l.length > 0);

          // Title
          slide.addText(titleLine, {
            x: 0.5, y: 0.3, w: '90%', h: 1.0,
            fontSize: idx === 0 ? 36 : 28, bold: true, color: 'f7f7f5', fontFace: 'Arial',
          });

          // Bullets
          if (bullets.length > 0) {
            slide.addText(
              bullets.map((b) => ({
                text: b,
                options: {
                  fontSize: 16, color: 'c4c4c8',
                  bullet: { code: '2022' },
                  lineSpacingMultiple: 1.5,
                  paraSpaceAfter: 8,
                },
              })),
              { x: 0.5, y: 1.6, w: '90%', h: 5.0, fontFace: 'Arial', valign: 'top' }
            );
          }

          // Slide number
          slide.addText(`${idx + 1}`, {
            x: '90%', y: '92%', w: 0.8, h: 0.4,
            fontSize: 11, color: '8e8e96', fontFace: 'Arial', align: 'right',
          });
        });
      }

      await pptx.writeFile({ fileName: 'ContentFactory_Presentation.pptx' });
      setStatus('done');
    } catch (err) {
      console.error('PPTX generation failed:', err);
      setStatus('error');
    }
  };

  return (
    <div className="border border-white/[0.12] bg-[#111116] p-6 sm:p-10 space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <PresentationIcon className="h-4 w-4 text-[#f7f7f5]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#f7f7f5]">
            Presentation — PowerPoint (.pptx)
          </span>
        </div>
        <button
          type="button"
          onClick={generatePPTX}
          disabled={status === 'generating'}
          className="flex items-center gap-2 font-mono text-xs border border-white/[0.15] px-4 py-2 text-[#f7f7f5] hover:bg-white/10 transition-all disabled:opacity-50"
        >
          {status === 'generating' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating .pptx...</>
          ) : status === 'done' ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> [ Downloaded ]</>
          ) : status === 'error' ? (
            <><RotateCcw className="h-3.5 w-3.5 text-rose-400" /> [ Retry Download ]</>
          ) : (
            <><Download className="h-3.5 w-3.5" /> [ Download .pptx ]</>
          )}
        </button>
      </div>

      {/* Preview of parsed slide content */}
      <div className="border border-white/[0.08] bg-[#0c0c10] p-6 max-h-64 overflow-y-auto">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8e8e96] mb-4">
          SLIDE CONTENT PREVIEW
        </div>
        <pre className="text-[#c4c4c8] text-xs whitespace-pre-wrap font-serif leading-relaxed">
          {rawText.substring(0, 1500)}{rawText.length > 1500 ? '\n...' : ''}
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FILE GENERATOR 2: Infographic — renders HTML canvas and exports as PNG
// ---------------------------------------------------------------------------
function InfographicGenerator({ rawText }: { rawText: string }) {
  const infographicRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');

  // Parse sections from AI output strictly based on new prompt format
  const parsedData = React.useMemo(() => {
    const blocks = rawText.split(/(?=###?\s)/g).filter((s) => s.trim());
    
    let mainTitle = "Strategic Intelligence Matrix";
    let subtitle = "Executive Briefing & Visual Architecture";
    const pillars: Array<{ title: string; metric: string; desc: string }> = [];

    blocks.forEach((block, idx) => {
      const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return;

      const titleMatch = lines[0].match(/###?\s*(.*)/);
      const titleText = titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : lines[0];

      if (idx === 0 && !titleText.toLowerCase().includes('pillar')) {
        // This is the main title block
        mainTitle = titleText;
        if (lines[1]) subtitle = lines[1].replace(/\*\*/g, '').trim();
      } else {
        // This is a pillar block
        const metric = lines[1] ? lines[1].replace(/\*\*/g, '').trim() : "";
        const desc = lines.slice(2).join(' ').replace(/\*\*/g, '').trim();
        pillars.push({ title: titleText, metric, desc: desc || metric });
      }
    });

    return { mainTitle, subtitle, pillars };
  }, [rawText]);

  const downloadPNG = async () => {
    if (!infographicRef.current) return;
    setStatus('generating');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(infographicRef.current, {
        backgroundColor: '#0a0a0c',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = 'ContentFactory_Infographic.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      setStatus('done');
    } catch (err) {
      console.error('Infographic export failed:', err);
      setStatus('error');
    }
  };

  return (
    <div className="border border-white/[0.12] bg-[#111116] p-6 sm:p-10 space-y-6">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[#f7f7f5]" />
          <span className="font-mono text-xs uppercase tracking-widest text-[#f7f7f5]">
            Infographic — PNG Image (2x Resolution)
          </span>
        </div>
        <button
          type="button"
          onClick={downloadPNG}
          disabled={status === 'generating'}
          className="flex items-center gap-2 font-mono text-xs border border-white/[0.15] px-4 py-2 text-[#f7f7f5] hover:bg-white/10 transition-all disabled:opacity-50"
        >
          {status === 'generating' ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Exporting PNG...</>
          ) : status === 'done' ? (
            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> [ Downloaded ]</>
          ) : status === 'error' ? (
            <><RotateCcw className="h-3.5 w-3.5 text-rose-400" /> [ Retry Export ]</>
          ) : (
            <><Download className="h-3.5 w-3.5" /> [ Download PNG ]</>
          )}
        </button>
      </div>

      {/* Rendered infographic — this div gets captured and exported as PNG */}
      <div
        ref={infographicRef}
        style={{
          backgroundColor: '#0a0a0c',
          padding: '60px 50px',
          minHeight: '800px',
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto',
          position: 'relative',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Subtle background grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '40px', marginBottom: '50px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
              <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>
                STUDIO EDITION
              </p>
              <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', margin: 0 }}>
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
              </p>
            </div>
            
            <h2 style={{ fontSize: '48px', fontWeight: 300, color: '#f7f7f5', margin: '0 0 16px 0', fontFamily: 'Georgia, serif', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {parsedData.mainTitle}
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Arial, sans-serif', margin: 0, maxWidth: '80%' }}>
              {parsedData.subtitle}
            </p>
          </div>

          {/* Pillars Layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {parsedData.pillars.map((pillar, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '40px',
                  alignItems: 'flex-start',
                  paddingBottom: '40px',
                  borderBottom: i !== parsedData.pillars.length - 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none',
                }}
              >
                {/* Left side: Pillar Number & Title */}
                <div style={{ flex: '0 0 200px' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
                    // 0{i + 1}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: 400, color: '#f7f7f5', margin: 0, fontFamily: 'Georgia, serif', lineHeight: 1.3 }}>
                    {pillar.title.replace(/^Pillar\s*\d*[:\-]?\s*/i, '')}
                  </h3>
                </div>

                {/* Right side: Metric & Description */}
                <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '30px' }}>
                  <div style={{ fontSize: '42px', fontWeight: 300, color: '#ffffff', fontFamily: 'Georgia, serif', marginBottom: '16px', lineHeight: 1 }}>
                    {pillar.metric || "N/A"}
                  </div>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0, fontFamily: 'Arial, sans-serif' }}>
                    {pillar.desc || "Strategic data point extracted from source material."}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ marginTop: '60px', paddingTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', margin: 0, letterSpacing: '0.2em' }}>
              CONTENT FACTORY // AI SYNTHESIS
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', margin: 0, letterSpacing: '0.2em' }}>
              CONFIDENTIAL &amp; PROPRIETARY
            </p>
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
    <div className="border border-white/[0.12] bg-[#111116] p-6 sm:p-10 space-y-6">
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
          className="flex items-center gap-2 font-mono text-xs border border-white/[0.15] px-4 py-2 text-[#f7f7f5] hover:bg-white/10 transition-all"
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
          className="flex items-center gap-2 font-mono text-xs border border-white/[0.15] px-4 py-2 text-[#f7f7f5] hover:bg-white/10 transition-all"
        >
          <Download className="h-3.5 w-3.5" /> [ Download Script ]
        </button>
      </div>

      {/* Visual Storyboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.slice(0, 9).map((scene, idx) => (
          <div key={idx} className="border border-white/[0.08] bg-[#0c0c10] p-5 flex flex-col justify-between space-y-3">
            {/* Fake video frame */}
            <div className="aspect-video bg-gradient-to-br from-white/[0.04] to-white/[0.01] flex items-center justify-center relative overflow-hidden">
              <span className="text-3xl opacity-15">&#127916;</span>
              <span className="absolute top-2 left-2 font-mono text-[9px] text-[#8e8e96] bg-black/60 px-1.5 py-0.5">
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
      <div className="border border-amber-500/20 bg-amber-500/[0.04] p-4">
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
    new Set(["Executive Summary", "Presentation", "Infographic", "Video Package"])
  );

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
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

  // Helper to extract specific deliverables using the new XML tags
  const getDeliverableText = useCallback((type: string) => {
    if (!result) return "";
    const regex = new RegExp(`<DELIVERABLE type="${type}">([\\s\\S]*?)<\\/DELIVERABLE>`);
    const match = result.match(regex);
    return match ? match[1].trim() : result; // Fallback to full result if tags fail
  }, [result]);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-[#f7f7f5] antialiased">
      {/* Header */}
      <header className="border-b border-white/[0.08] px-6 lg:px-16 py-6 flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <span className="font-serif text-2xl font-normal tracking-tight">
            Content Factory<span className="text-[#8e8e96] font-mono text-xs ml-2">/ STUDIO EDITION</span>
          </span>
        </div>
        <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-widest text-[#8e8e96]">
          <span>PARIS // 2026</span>
          <span className="flex items-center gap-2 text-[#f7f7f5]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f7f7f5] animate-ping" />
            CORE ACTIVE
          </span>
        </div>
      </header>

      {/* Hero Headline */}
      <section className="px-6 lg:px-16 pt-20 pb-16 border-b border-white/[0.08]">
        <div className="max-w-6xl">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#8e8e96] mb-6 flex items-center gap-2">
            <Asterisk className="h-3.5 w-3.5 text-[#f7f7f5]" />
            TRANSFORMATION ENGINE &middot; AN EXPERIMENTAL LABORATORY
          </div>
          <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl font-normal leading-[0.98] tracking-tight text-[#f7f7f5]">
            Synthesize raw thought into{" "}
            <em className="italic font-serif font-light text-[#8e8e96] selection:text-[#0a0a0c]">
              sculpted
            </em>{" "}
            discourse.
          </h1>
          <p className="mt-8 font-sans text-base sm:text-lg text-[#8e8e96] max-w-2xl leading-relaxed">
            Deposit unstructured manuscripts or documents. The engine generates <span className="text-[#f7f7f5] font-medium">only</span> the exact communication formats chosen below.
          </p>
        </div>
      </section>

      {/* Studio Workspace */}
      <main className="px-6 lg:px-16 py-16 max-w-7xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-20">
          {/* Section 01: Input & Docs */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            <div className="lg:col-span-4">
              <div className="font-mono text-xs tracking-widest uppercase text-[#8e8e96] mb-2">( 01 ) // INPUT</div>
              <h2 className="font-serif text-3xl font-normal tracking-tight text-[#f7f7f5]">Primary Manuscripts &amp; Archives</h2>
              <p className="font-sans text-xs sm:text-sm text-[#8e8e96] mt-3 leading-relaxed">
                Paste source discourse or deposit files (PDF, DOCX, Spreadsheets, Media).
              </p>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <Textarea
                id="sourceContent"
                placeholder="Paste strategic briefings, meeting notes, research, or copy draft here..."
                className="min-h-[220px] rounded-none border border-white/[0.12] bg-[#111115] text-[#f7f7f5] placeholder:text-[#55555c] focus-visible:ring-1 focus-visible:ring-[#f7f7f5] font-serif text-base leading-relaxed p-6"
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) addFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-8 border border-dashed text-center cursor-pointer transition-all ${
                  isDragging ? "border-[#f7f7f5] bg-white/[0.04]" : "border-white/[0.12] bg-[#111115]/50 hover:border-white/[0.3]"
                }`}
              >
                <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_MIME_TYPES} className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); }} />
                <Upload className="h-5 w-5 text-[#8e8e96] mb-2 stroke-[1.5]" />
                <span className="font-mono text-xs uppercase tracking-widest text-[#f7f7f5]">Deposit Archives / Manuscripts</span>
                <span className="font-sans text-[11px] text-[#8e8e96] mt-1">PDF &middot; DOCX &middot; XLSX &middot; PPTX &middot; UP TO 10 MB</span>
              </div>

              {attachedFiles.length > 0 && (
                <div className="divide-y divide-white/[0.06] border border-white/[0.08] bg-[#111115]">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 text-xs">
                      <span className="font-mono text-xs text-[#f7f7f5] truncate">{file.name}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="font-mono text-[10px] text-[#8e8e96] hover:text-[#f7f7f5]">[ Detach ]</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Section 02: Positioning */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-white/[0.08] pt-16">
            <div className="lg:col-span-4">
              <div className="font-mono text-xs tracking-widest uppercase text-[#8e8e96] mb-2">( 02 ) // DIRECTIVES</div>
              <h2 className="font-serif text-3xl font-normal tracking-tight text-[#f7f7f5]">Atmosphere &amp; Posture</h2>
            </div>

            <div className="lg:col-span-8 grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-[#8e8e96]">Target Audience</Label>
                <Select value={config.targetAudience} onValueChange={(v) => handleConfigChange("targetAudience", v)}>
                  <SelectTrigger className="rounded-none border border-white/[0.12] bg-[#111115] text-xs font-mono uppercase text-[#f7f7f5]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111115] text-xs font-mono text-[#f7f7f5]">{CONFIG_OPTIONS.targetAudience.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-[#8e8e96]">Voice &amp; Posture</Label>
                <Select value={config.toneStyle} onValueChange={(v) => handleConfigChange("toneStyle", v)}>
                  <SelectTrigger className="rounded-none border border-white/[0.12] bg-[#111115] text-xs font-mono uppercase text-[#f7f7f5]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111115] text-xs font-mono text-[#f7f7f5]">{CONFIG_OPTIONS.toneStyle.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-[#8e8e96]">Language</Label>
                <Select value={config.language} onValueChange={(v) => handleConfigChange("language", v)}>
                  <SelectTrigger className="rounded-none border border-white/[0.12] bg-[#111115] text-xs font-mono uppercase text-[#f7f7f5]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111115] text-xs font-mono text-[#f7f7f5]">{CONFIG_OPTIONS.language.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-[#8e8e96]">Detail Resolution</Label>
                <Select value={config.levelOfDetail} onValueChange={(v) => handleConfigChange("levelOfDetail", v)}>
                  <SelectTrigger className="rounded-none border border-white/[0.12] bg-[#111115] text-xs font-mono uppercase text-[#f7f7f5]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111115] text-xs font-mono text-[#f7f7f5]">{CONFIG_OPTIONS.levelOfDetail.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="font-mono text-[10px] uppercase tracking-widest text-[#8e8e96]">Strategic Objective</Label>
                <Select value={config.communicationObjective} onValueChange={(v) => handleConfigChange("communicationObjective", v)}>
                  <SelectTrigger className="rounded-none border border-white/[0.12] bg-[#111115] text-xs font-mono uppercase text-[#f7f7f5]"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#111115] text-xs font-mono text-[#f7f7f5]">{CONFIG_OPTIONS.communicationObjective.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Section 03: Deliverables Catalog */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-white/[0.08] pt-16">
            <div className="lg:col-span-4">
              <div className="font-mono text-xs tracking-widest uppercase text-[#8e8e96] mb-2">( 03 ) // CATALOG</div>
              <h2 className="font-serif text-3xl font-normal tracking-tight text-[#f7f7f5]">Artifact Editions</h2>
              <div className="mt-6 flex items-center gap-3 font-mono text-xs">
                <button type="button" onClick={selectAll} className="underline text-[#8e8e96] hover:text-[#f7f7f5]">Select All</button>
                <button type="button" onClick={deselectAll} className="underline text-[#8e8e96] hover:text-[#f7f7f5]">Clear All</button>
              </div>
            </div>

            <div className="lg:col-span-8 divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
              {OUTPUT_TYPES.map((outputType) => {
                const item = CATALOG_ITEMS[outputType];
                const isSelected = selectedOutputs.has(outputType);

                return (
                  <div
                    key={outputType}
                    onClick={() => handleOutputToggle(outputType)}
                    className={`py-5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors ${
                      isSelected ? "bg-[#14141a]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-[#8e8e96]">{item.num}</span>
                      <div>
                        <div className="flex items-baseline gap-3">
                          <h3 className={`font-serif text-xl ${isSelected ? "text-[#f7f7f5]" : "text-[#8e8e96]"}`}>{outputType}</h3>
                          <span className="font-mono text-[9px] uppercase tracking-widest text-[#8e8e96]">[{item.category}]</span>
                        </div>
                        <p className="font-sans text-xs text-[#8e8e96] mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#8e8e96]">{item.format}</span>
                      <Checkbox checked={isSelected} onCheckedChange={() => handleOutputToggle(outputType)} className="rounded-none border-white/30 data-[state=checked]:bg-[#f7f7f5] data-[state=checked]:text-[#0a0a0c]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {error && <div className="border border-rose-500/50 bg-rose-500/10 p-4 font-mono text-xs text-rose-300">[ ERROR ] : {error}</div>}

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
            <button
              type="button"
              onClick={() => { setSourceContent(""); setAttachedFiles([]); setConfig(INITIAL_CONFIG); setSelectedOutputs(new Set(["Executive Summary"])); setResult(null); }}
              className="font-mono text-xs uppercase tracking-widest text-[#8e8e96] hover:text-[#f7f7f5]"
            >
              [ Reset Parameters ]
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-10 py-5 bg-[#f7f7f5] text-[#0a0a0c] font-mono text-xs uppercase tracking-[0.2em] font-semibold hover:bg-[#dededc] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
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
                .map(outputType => (
                  <div key={outputType} className="border border-white/[0.1] bg-[#111115] p-8 sm:p-14">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
                      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8e8e96]">
                        {outputType} &middot; TEXT ARCHIVE
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(getDeliverableText(outputType));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="font-mono text-xs uppercase tracking-widest text-[#8e8e96] hover:text-white transition-all flex items-center gap-2"
                      >
                        {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> COPIED</> : <><Copy className="h-3.5 w-3.5" /> COPY TEXT</>}
                      </button>
                    </div>
                    <article className="prose prose-invert max-w-none font-serif prose-h3:text-xl prose-h3:text-[#f7f7f5] prose-h3:mt-8 prose-p:text-[#c4c4c8] prose-p:leading-relaxed prose-li:text-[#c4c4c8]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {getDeliverableText(outputType)}
                      </ReactMarkdown>
                    </article>
                  </div>
                ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/[0.08] px-6 lg:px-16 py-12 mt-24 text-center font-mono text-[11px] uppercase tracking-widest text-[#8e8e96]">
        CONTENT FACTORY &middot; SYSTEM v1.0.0 &middot; VERCEL READY
      </footer>
    </div>
  );
}