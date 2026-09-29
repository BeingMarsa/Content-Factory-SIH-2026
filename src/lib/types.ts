// ---------------------------------------------------------------------------
// Shared TypeScript interfaces used across the frontend and backend.
// ---------------------------------------------------------------------------

export interface TransformationConfig {
  targetAudience: string;
  toneStyle: string;
  language: string;
  levelOfDetail: string;
  communicationObjective: string;
}

export interface TransformRequest {
  sourceContent: string;
  configurations: TransformationConfig;
  requestedOutputs: OutputType[];
}

export interface TransformResponse {
  success: true;
  generatedResult: string;
  historyId: string;
  isFallback?: boolean;
  fallbackReason?: string;
}

export interface TransformErrorResponse {
  success: false;
  error: string;
}

export interface ParsedFileInfo {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string | null;
  isTextExtracted: boolean;
}

export type OutputType =
  | "Video Package"
  | "LinkedIn Post"
  | "Twitter/X Post"
  | "Advisory"
  | "Infographic"
  | "Executive Summary"
  | "Presentation";

export const OUTPUT_TYPES: OutputType[] = [
  "Video Package",
  "LinkedIn Post",
  "Twitter/X Post",
  "Advisory",
  "Infographic",
  "Executive Summary",
  "Presentation",
];

export const CONFIG_OPTIONS = {
  targetAudience: [
    "General Public",
    "Industry Professionals",
    "C-Suite Executives",
    "Technical Engineers",
    "Policymakers",
    "Students / Academia",
    "Media / Journalists",
  ],
  toneStyle: [
    "Professional & Formal",
    "Conversational & Friendly",
    "Authoritative & Expert",
    "Persuasive & Compelling",
    "Neutral & Informative",
    "Inspirational & Motivational",
  ],
  language: [
    "English",
    "Spanish",
    "French",
    "German",
    "Arabic",
    "Hindi",
    "Mandarin Chinese",
    "Portuguese",
    "Japanese",
  ],
  levelOfDetail: [
    "High-Level Summary",
    "Moderate Detail",
    "Deep Dive / Comprehensive",
    "Technical Specification",
  ],
  communicationObjective: [
    "Inform & Educate",
    "Persuade & Influence",
    "Drive Action / CTA",
    "Build Awareness",
    "Thought Leadership",
    "Crisis Communication",
    "Internal Alignment",
  ],
} as const;

export const ACCEPTED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".mp4",
  ".mov",
  ".webm",
  ".avi",
];

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/*",
  "video/*",
].join(",");

export const MAX_TOTAL_UPLOAD_BYTES = 10 * 1024 * 1024;