import * as path from "path";
import * as os from "os";
import * as fs from "fs";

export interface ScreenshotConfig {
  apiKey: string;
  model: string;
  screenshotsDir: string;
  clipDir: string;
  fullDir: string;
  dataDir: string;
  dbPath: string;
  jsonlPath: string;
}

const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, ".config/hypr/screenshot-indexer");
const ENV_FILE = path.join(CONFIG_DIR, ".env");

function resolveApiKey(): string {
  if (fs.existsSync(ENV_FILE)) {
    const content = fs.readFileSync(ENV_FILE, "utf-8");
    const m = content.match(/^\s*GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
    if (m && m[1] && !m[1].startsWith("your_")) {
      return m[1].trim();
    }
  }
  if (process.env.SCREENSHOT_GEMINI_API_KEY) {
    return process.env.SCREENSHOT_GEMINI_API_KEY.trim();
  }
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY.trim();
  }
  throw new Error("GEMINI_API_KEY not configured in ~/.config/hypr/screenshot-indexer/.env");
}

const ssBaseDir = process.env.SCREENSHOTS_DIR || path.join(HOME, "ss");
const dataDir = process.env.SCREENSHOTS_DATA_DIR || path.join(HOME, ".local/share/screenshots");

export const config: ScreenshotConfig = {
  apiKey: "", // lazily resolved
  model: process.env.SCREENSHOT_MODEL || "gemini-3.5-flash-lite",
  screenshotsDir: ssBaseDir,
  clipDir: path.join(ssBaseDir, "clip"),
  fullDir: path.join(ssBaseDir, "full"),
  dataDir: dataDir,
  dbPath: path.join(dataDir, "screenshots.db"),
  jsonlPath: path.join(dataDir, "index.jsonl"),
};

export function getApiKey(): string {
  if (!config.apiKey) {
    config.apiKey = resolveApiKey();
  }
  return config.apiKey;
}
