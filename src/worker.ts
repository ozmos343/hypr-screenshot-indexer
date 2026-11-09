import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { config } from "./config";
import { analyzeScreenshot } from "./vision";
import { indexScreenshot } from "./db";

function formatDatePrefix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeSuffix(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `${h}${m}${s}`;
}

async function main() {
  const args = process.argv.slice(2);
  const targetPath = args[0];
  const type = (args[1] || "clip") as "clip" | "full";
  const contextPath = args[2];

  if (!targetPath || !fs.existsSync(targetPath)) {
    console.error(`Target screenshot path not found: ${targetPath}`);
    process.exit(1);
  }

  const destDir = type === "clip" ? config.clipDir : config.fullDir;
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    const analysis = await analyzeScreenshot(targetPath, contextPath);

    const datePrefix = formatDatePrefix();
    let finalFilename = `${datePrefix}_${analysis.slug}.png`;
    let finalPath = path.join(destDir, finalFilename);

    if (fs.existsSync(finalPath)) {
      finalFilename = `${datePrefix}_${analysis.slug}_${formatTimeSuffix()}.png`;
      finalPath = path.join(destDir, finalFilename);
    }

    // Cross-device copy and cleanup
    fs.copyFileSync(targetPath, finalPath);
    fs.unlinkSync(targetPath);

    indexScreenshot({
      filename: finalFilename,
      filepath: finalPath,
      type,
      slug: analysis.slug,
      summary: analysis.summary,
      ocr_text: analysis.ocr_text,
      tags: analysis.tags,
    });

    const proc = spawn(
      "notify-send",
      [
        "-a",
        "Screenshots",
        "-i",
        finalPath,
        `Indexed: ${analysis.slug}`,
        `${analysis.summary}\n[Saved to ${destDir}/]`,
      ],
      { detached: true, stdio: "ignore" }
    );
    proc.unref();
  } catch (err: any) {
    console.error("Worker indexing error:", err);
    const datePrefix = formatDatePrefix();
    const fallbackFilename = `${datePrefix}_screenshot_${formatTimeSuffix()}.png`;
    const fallbackPath = path.join(destDir, fallbackFilename);
    try {
      if (fs.existsSync(targetPath)) {
        fs.copyFileSync(targetPath, fallbackPath);
        fs.unlinkSync(targetPath);
      }
    } catch {}

    const errProc = spawn(
      "notify-send",
      [
        "-a",
        "Screenshots",
        "-u",
        "normal",
        "Screenshot Saved (Unindexed)",
        `Saved to ${destDir}/${fallbackFilename}\nAnalysis error: ${err.message || err}`,
      ],
      { detached: true, stdio: "ignore" }
    );
    errProc.unref();
  } finally {
    if (contextPath && fs.existsSync(contextPath)) {
      try {
        fs.unlinkSync(contextPath);
      } catch {}
    }
  }
}

main();
