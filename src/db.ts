import { Database } from "bun:sqlite";
import * as fs from "fs";
import { config } from "./config";

if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

const db = new Database(config.dbPath);

// Initialize schema with FTS5 table and triggers
db.run(`
  CREATE TABLE IF NOT EXISTS screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE NOT NULL,
    filepath TEXT NOT NULL,
    type TEXT NOT NULL,
    slug TEXT NOT NULL,
    summary TEXT NOT NULL,
    ocr_text TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS screenshots_fts USING fts5(
    filename,
    slug,
    summary,
    ocr_text,
    tags,
    content='screenshots',
    content_rowid='id'
  );

  CREATE TRIGGER IF NOT EXISTS screenshots_ai AFTER INSERT ON screenshots BEGIN
    INSERT INTO screenshots_fts(rowid, filename, slug, summary, ocr_text, tags)
    VALUES (new.id, new.filename, new.slug, new.summary, new.ocr_text, new.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS screenshots_ad AFTER DELETE ON screenshots BEGIN
    INSERT INTO screenshots_fts(screenshots_fts, rowid, filename, slug, summary, ocr_text, tags)
    VALUES('delete', old.id, old.filename, old.slug, old.summary, old.ocr_text, old.tags);
  END;

  CREATE TRIGGER IF NOT EXISTS screenshots_au AFTER UPDATE ON screenshots BEGIN
    INSERT INTO screenshots_fts(screenshots_fts, rowid, filename, slug, summary, ocr_text, tags)
    VALUES('delete', old.id, old.filename, old.slug, old.summary, old.ocr_text, old.tags);
    INSERT INTO screenshots_fts(rowid, filename, slug, summary, ocr_text, tags)
    VALUES (new.id, new.filename, new.slug, new.summary, new.ocr_text, new.tags);
  END;
`);

export interface ScreenshotRecord {
  filename: string;
  filepath: string;
  type: "clip" | "full";
  slug: string;
  summary: string;
  ocr_text: string;
  tags: string[];
}

export function indexScreenshot(record: ScreenshotRecord): void {
  const tagsStr = record.tags.join(", ");

  const stmt = db.prepare(`
    INSERT INTO screenshots (filename, filepath, type, slug, summary, ocr_text, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    record.filename,
    record.filepath,
    record.type,
    record.slug,
    record.summary,
    record.ocr_text,
    tagsStr
  );

  // Append to portable JSONL
  const jsonEntry = JSON.stringify({
    ...record,
    created_at: new Date().toISOString(),
  });
  fs.appendFileSync(config.jsonlPath, jsonEntry + "\n", "utf-8");
}

export function searchScreenshots(query: string, limit = 20): Array<{
  filename: string;
  filepath: string;
  slug: string;
  summary: string;
  created_at: string;
}> {
  try {
    const ftsQuery = query.trim().replace(/['"]/g, "");
    if (!ftsQuery) {
      return db
        .query(
          "SELECT filename, filepath, slug, summary, created_at FROM screenshots ORDER BY id DESC LIMIT ?"
        )
        .all(limit) as any;
    }

    const ftsStmt = db.prepare(`
      SELECT s.filename, s.filepath, s.slug, s.summary, s.created_at
      FROM screenshots_fts f
      JOIN screenshots s ON s.id = f.rowid
      WHERE screenshots_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    const results = ftsStmt.all(`${ftsQuery}*`, limit) as any;
    if (results.length > 0) return results;
  } catch {}

  const likeStmt = db.prepare(`
    SELECT filename, filepath, slug, summary, created_at
    FROM screenshots
    WHERE slug LIKE ? OR summary LIKE ? OR ocr_text LIKE ? OR tags LIKE ?
    ORDER BY id DESC
    LIMIT ?
  `);
  const pattern = `%${query}%`;
  return likeStmt.all(pattern, pattern, pattern, pattern, limit) as any;
}
