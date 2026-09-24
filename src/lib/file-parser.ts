// ---------------------------------------------------------------------------
// Server-side file parser
// Extracts text from documents (PDF, DOCX, XLSX/CSV, TXT).
// ---------------------------------------------------------------------------

import type { ParsedFileInfo } from "@/lib/types";

export async function parseUploadedFile(file: File): Promise<ParsedFileInfo> {
  const filename = file.name;
  const mimeType = file.type;
  const sizeBytes = file.size;
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    switch (extension) {
      case "pdf": {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return {
          filename,
          mimeType,
          sizeBytes,
          extractedText: result.text.trim(),
          isTextExtracted: true,
        };
      }
      case "docx": {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        return {
          filename,
          mimeType,
          sizeBytes,
          extractedText: result.value.trim(),
          isTextExtracted: true,
        };
      }
      case "xlsx":
      case "xls":
      case "csv": {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheets: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (sheet) {
            sheets.push(
              `--- Sheet: ${sheetName} ---\n${XLSX.utils.sheet_to_csv(sheet)}`
            );
          }
        }
        return {
          filename,
          mimeType,
          sizeBytes,
          extractedText: sheets.join("\n\n").trim(),
          isTextExtracted: true,
        };
      }
      case "txt": {
        return {
          filename,
          mimeType,
          sizeBytes,
          extractedText: buffer.toString("utf-8").trim(),
          isTextExtracted: true,
        };
      }
      default:
        return {
          filename,
          mimeType,
          sizeBytes,
          extractedText: null,
          isTextExtracted: false,
        };
    }
  } catch (err) {
    console.error(`[file-parser] Failed to parse "${filename}":`, err);
    return {
      filename,
      mimeType,
      sizeBytes,
      extractedText: null,
      isTextExtracted: false,
    };
  }
}

export function buildFileContext(parsedFiles: ParsedFileInfo[]): string {
  if (parsedFiles.length === 0) return "";

  const sections: string[] = ["### Attached Documents"];
  for (const f of parsedFiles) {
    const sizeMB = (f.sizeBytes / (1024 * 1024)).toFixed(2);
    if (f.isTextExtracted && f.extractedText) {
      sections.push(
        `#### 📄 ${f.filename} (${sizeMB} MB)\n\`\`\`\n${f.extractedText}\n\`\`\``
      );
    } else {
      sections.push(
        `#### 📎 ${f.filename} (${sizeMB} MB, ${f.mimeType})\n_Binary attachment — context referenced by document metadata._`
      );
    }
  }
  return sections.join("\n\n");
}