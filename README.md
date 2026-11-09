# screenshot-indexer (Hyprland / Arch Linux)

An asynchronous, zero-latency screenshot ingestion and semantic indexing daemon for Arch Linux and Hyprland.

It intercepts screen captures, summarizes them via **Gemini 3.5 Flash-Lite Vision**, renames files descriptively (e.g. `2026-11-08_zellij-terminal-gemini-ai.png`), and indexes them in a local SQLite **FTS5 (Full-Text Search)** database for sub-millisecond retrieval.

## Features
- **Zero-Latency Capture**:
  - Pure clipboard captures pipe into `wl-copy` immediately with zero overhead.
  - Indexed captures dispatch background workers asynchronously without stalling your compositor.
- **Context-Aware Vision Analysis**:
  - When taking a cropped screenshot, the daemon automatically supplies full-screen context to Gemini so it understands the application state and window surrounding the crop.
- **Full-Text Search (FTS5)**:
  - Indexes slug, OCR text, tags, and semantic summary.
  - Interactive lookup tool via `walker` / `wofi` with `--copy` option.
- **Structured Storage**:
  - `~/ss/clip/` for cropped/area captures.
  - `~/ss/full/` for full-screen captures.
  - `~/.local/share/screenshots/screenshots.db` for the FTS5 database.
  - `~/.local/share/screenshots/index.jsonl` for portable logs.

## Setup & Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure your Gemini API key in `.env`:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Custom directories (optional):
   ```ini
   # SCREENSHOTS_DIR=/home/user/ss
   # SCREENSHOT_MODEL=gemini-3.5-flash-lite
   ```

4. Recommended Hyprland bindings (`~/.config/hypr/hyprland.conf`):
   ```ini
   # Area selection:
   #   Cmd + Ctrl + /       -> Pure clipboard ONLY
   #   Cmd + Ctrl + Alt + / -> Save to disk (~/ss/clip/) & index with Gemini Vision
   bind = SUPER CONTROL, slash, exec, ~/.local/bin/smart-screenshot --clip --clipboard-only
   bind = SUPER CONTROL ALT, slash, exec, ~/.local/bin/smart-screenshot --clip --disk

   # Full screen:
   #   Cmd + Ctrl + \       -> Pure clipboard ONLY
   #   Cmd + Ctrl + Alt + \ -> Save to disk (~/ss/full/) & index with Gemini Vision
   bind = SUPER CONTROL, backslash, exec, ~/.local/bin/smart-screenshot --full --clipboard-only
   bind = SUPER CONTROL ALT, backslash, exec, ~/.local/bin/smart-screenshot --full --disk

   # Search semantic screenshot index:
   bind = SUPER CONTROL SHIFT, slash, exec, ~/.local/bin/search-screenshots
   ```

## License
MIT
