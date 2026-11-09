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

## Repository Structure
```text
~/.config/hypr/screenshot-indexer/
├── bin/
│   ├── smart-screenshot      # Capture CLI runner (clip, full, clipboard, disk)
│   └── search-screenshots     # Interactive FTS5 search menu
├── src/
│   ├── config.ts              # Path resolution & environment loader
│   ├── db.ts                  # SQLite + FTS5 database engine
│   ├── search.ts              # Search query formatter
│   ├── vision.ts              # Gemini Flash-Lite Vision multimodal client
│   └── worker.ts              # Asynchronous ingestion worker
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Setup & Installation

1. Clone into `~/.config/hypr/screenshot-indexer`:
   ```bash
   git clone https://github.com/<your-user>/screenshot-indexer.git ~/.config/hypr/screenshot-indexer
   cd ~/.config/hypr/screenshot-indexer
   cp .env.example .env
   ```
2. Configure your Gemini API key in `.env`:
   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Link the binaries into your `PATH`:
   ```bash
   ln -sf ~/.config/hypr/screenshot-indexer/bin/smart-screenshot ~/.local/bin/smart-screenshot
   ln -sf ~/.config/hypr/screenshot-indexer/bin/search-screenshots ~/.local/bin/search-screenshots
   ```

4. Recommended Hyprland bindings (`~/.config/hypr/hyprland.lua`):
   ```lua
   local mainMod = "SUPER"

   -- Area selection:
   --   Cmd + Ctrl + /       -> Pure clipboard ONLY
   --   Cmd + Ctrl + Alt + / -> Save to disk (~/ss/clip/) & index with Gemini Vision
   hl.bind(mainMod .. " + CONTROL + slash", hl.dsp.exec_cmd("smart-screenshot --clip --clipboard-only"))
   hl.bind(mainMod .. " + CONTROL + ALT + slash", hl.dsp.exec_cmd("smart-screenshot --clip --disk"))

   -- Full screen:
   --   Cmd + Ctrl + \       -> Pure clipboard ONLY
   --   Cmd + Ctrl + Alt + \ -> Save to disk (~/ss/full/) & index with Gemini Vision
   hl.bind(mainMod .. " + CONTROL + backslash", hl.dsp.exec_cmd("smart-screenshot --full --clipboard-only"))
   hl.bind(mainMod .. " + CONTROL + ALT + backslash", hl.dsp.exec_cmd("smart-screenshot --full --disk"))

   -- Search semantic screenshot index:
   hl.bind(mainMod .. " + CONTROL + SHIFT + slash", hl.dsp.exec_cmd("search-screenshots"))
   ```

## License
MIT
