import * as fs from "fs";
import { config, getApiKey } from "./config";

export interface VisionAnalysis {
  slug: string;
  summary: string;
  ocr_text: string;
  tags: string[];
}

const SYSTEM_INSTRUCTION = `You are an automated screenshot indexing and categorization engine for Linux/Hyprland.
Analyze the provided screenshot(s).
If two images are provided, the first is a CROPPED/CLIPPED region and the second is the FULLSCREEN context for that crop.
Your task is to understand what is being captured (application, window name, code, error message, UI component, terminal output, diagram, website) and produce a structured description.

Return strictly valid JSON conforming to this schema:
{
  "slug": "kebab-case-descriptive-title",
  "summary": "1-2 sentence concise summary of the visible content, active application, or purpose",
  "ocr_text": "key visible text, error messages, code snippet, headers, or URLs",
  "tags": ["3 to 6 lowercase relevant tags"]
}

Rules for 'slug':
- Strictly lowercase alphanumeric and hyphens.
- Max 5 words. Zero spaces. Zero special characters.
- Must be descriptive of the core content (e.g. 'hyprland-keybind-config', 'rust-compiler-borrow-error', 'spotify-album-art', 'github-pr-diff').`;

export async function analyzeScreenshot(
  targetImagePath: string,
  contextImagePath?: string
): Promise<VisionAnalysis> {
  const apiKey = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`;

  const parts: Array<any> = [];

  // Target image
  const targetBytes = fs.readFileSync(targetImagePath);
  const targetBase64 = targetBytes.toString("base64");
  parts.push({
    inlineData: {
      mimeType: "image/png",
      data: targetBase64,
    },
  });

  // Optional full context image
  if (contextImagePath && fs.existsSync(contextImagePath)) {
    try {
      const contextBytes = fs.readFileSync(contextImagePath);
      parts.push({
        text: "The following image is the full screen context where the above cropped capture was taken from:",
      });
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: contextBytes.toString("base64"),
        },
      });
    } catch {}
  }

  parts.push({
    text: "Analyze the screenshot and output the required JSON descriptor.",
  });

  const requestBody = {
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Vision API error [${response.status}]: ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("No response text from Gemini Vision API");
  }

  const parsed = JSON.parse(rawText) as VisionAnalysis;

  let cleanSlug = (parsed.slug || "screenshot")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!cleanSlug) cleanSlug = "screenshot";

  return {
    slug: cleanSlug.slice(0, 50),
    summary: parsed.summary || "Captured screen region",
    ocr_text: parsed.ocr_text || "",
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).toLowerCase().trim()) : ["screenshot"],
  };
}
