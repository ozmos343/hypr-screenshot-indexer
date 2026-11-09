# screenshot-indexer (Asynchronous Semantic Screenshot Engine)

An asynchronous, zero-latency screenshot ingestion, vision summarization, and semantic search daemon for Arch Linux and Hyprland.

`screenshot-indexer` intercepts Wayland screen captures, instantly copies them to your clipboard in under 100ms, and dispatches background workers that analyze the image with **Gemini 3.5 Flash-Lite Vision**, rename the file with descriptive semantic slugs, and index metadata into a local **SQLite FTS5 (Full-Text Search)** database.

---

## Key Features

- **Sub-100ms Clipboard Availability**:
  - Raw image bytes pipe into `wl-copy` immediately upon capture.
  - The heavy vision analysis and indexing execute in an independent background worker (`nohup bun run ... &`), ensuring zero freeze or lag in your compositor.
- **Context-Aware Vision Analysis**:
  - When capturing a clipped area (`--clip`), the daemon takes a rapid full-screen context snapshot in `/tmp/` before launching `slurp`.
  - Both the crop and the full context are provided to Gemini Flash-Lite Vision so it understands the wider application, active window, and workflow surrounding the crop.
  - The temporary context image is cleaned up immediately after analysis.
- **Structured Storage Segregation**:
  - `~/ss/clip/`: Cropped / area captures.
  - `~/ss/full/`: Full-screen captures.
  - Files are automatically renamed to `YYYY-MM-DD_<descriptive-kebab-slug>.png` (e.g. `2026-11-09_zellij-terminal-gemini-ai.png`).
- **SQLite + FTS5 Full-Text Search Engine**:
  - Automatically indexes file path, semantic slug, OCR text, window names, and relevant category tags.
  - Maintains automatic SQLite triggers to keep the FTS5 virtual table synchronized.
  - Also outputs to a portable JSON Lines log (`~/.local/share/screenshots/index.jsonl`).
- **Interactive Search & Retrieval (`search-screenshots`)**:
  - Launches an interactive searchable list via `wofi` or `walker`.
  - Default: Opens the screenshot in your default viewer (`xdg-open` / `imv`).
  - `--copy` flag: Directs the raw PNG image bytes straight back into the Wayland clipboard (`wl-copy`).

---

## System Prerequisites

- **OS**: Arch Linux (or any Linux distribution running Hyprland under Wayland)
- **Capture Utilities**:
  - `grim` (Wayland image grabber)
  - `slurp` (screen region selector)
  - `wl-clipboard` (`wl-copy`, `wl-paste`)
- **Database & Runtimes**:
  - [Bun](https://bun.sh/) (tested on v1.2+)
  - `sqlite3`
- **Menu & Notifications**:
  - `wofi` or `walker` (for the search menu)
  - `libnotify` (`notify-send` for desktop alerts)

---

## Repository Structure

```text
~/.config/hypr/screenshot-indexer/
├── bin/
│   ├── smart-screenshot      # Dual-mode capture runner (clip/full, clipboard-only/indexed)
│   └── search-screenshots    # Interactive FTS5 fuzzy search menu
├── src/
│   ├── config.ts             # Dynamic path and environment loader
│   ├── db.ts                 # SQLite schema, FTS5 virtual table & indexer
│   ├── search.ts             # FTS5 search formatter for dmenu/wofi
│   ├── vision.ts             # Gemini 3.5 Flash-Lite multimodal analysis client
│   └── worker.ts             # Background asynchronous ingestion worker
├── package.json
├── tsconfig.json
├── .env.example              # Example environment configuration
├── LICENSE                   # WTFPL License
└── README.md
```

---

## Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/<your-user>/screenshot-indexer.git ~/.config/hypr/screenshot-indexer
cd ~/.config/hypr/screenshot-indexer
```

### 2. Configure Your API Key
Copy `.env.example` to `.env` and set your Google Gemini API key:
```bash
cp .env.example .env
chmod 600 .env
```
Edit `.env`:
```ini
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here

# Optional overrides:
# SCREENSHOTS_DIR=/home/user/ss
# SCREENSHOT_MODEL=gemini-3.5-flash-lite
```

### 3. Link Binaries into PATH
```bash
ln -sf ~/.config/hypr/screenshot-indexer/bin/smart-screenshot ~/.local/bin/smart-screenshot
ln -sf ~/.config/hypr/screenshot-indexer/bin/search-screenshots ~/.local/bin/search-screenshots
chmod +x ~/.local/bin/smart-screenshot ~/.local/bin/search-screenshots
```

### 4. Configure Hyprland Bindings

#### For Hyprland Lua (`~/.config/hypr/hyprland.lua`):
```lua
local mainMod = "SUPER"

-- Area selection:
--   Cmd + Ctrl + /       -> Pure clipboard ONLY (no indexing, no disk write)
--   Cmd + Ctrl + Alt + / -> Save to disk (~/ss/clip/) & index with Gemini Vision
hl.bind(mainMod .. " + CONTROL + slash", hl.dsp.exec_cmd("~/.local/bin/smart-screenshot --clip --clipboard-only"))
hl.bind(mainMod .. " + CONTROL + ALT + slash", hl.dsp.exec_cmd("~/.local/bin/smart-screenshot --clip --disk"))

-- Full screen:
--   Cmd + Ctrl + \       -> Pure clipboard ONLY (no indexing, no disk write)
--   Cmd + Ctrl + Alt + \ -> Save to disk (~/ss/full/) & index with Gemini Vision
hl.bind(mainMod .. " + CONTROL + backslash", hl.dsp.exec_cmd("~/.local/bin/smart-screenshot --full --clipboard-only"))
hl.bind(mainMod .. " + CONTROL + ALT + backslash", hl.dsp.exec_cmd("~/.local/bin/smart-screenshot --full --disk"))

-- Search semantic screenshot index:
hl.bind(mainMod .. " + CONTROL + SHIFT + slash", hl.dsp.exec_cmd("~/.local/bin/search-screenshots"))
```

#### For Legacy Hyprland Config (`~/.config/hypr/hyprland.conf`):
```ini
# Area selection:
bind = SUPER CONTROL, slash, exec, ~/.local/bin/smart-screenshot --clip --clipboard-only
bind = SUPER CONTROL ALT, slash, exec, ~/.local/bin/smart-screenshot --clip --disk

# Full screen:
bind = SUPER CONTROL, backslash, exec, ~/.local/bin/smart-screenshot --full --clipboard-only
bind = SUPER CONTROL ALT, backslash, exec, ~/.local/bin/smart-screenshot --full --disk

# Search semantic screenshot index:
bind = SUPER CONTROL SHIFT, slash, exec, ~/.local/bin/search-screenshots
```

Reload Hyprland:
```bash
hyprctl reload
```

---

## How to Operate

| Shortcut | Description | Outcome |
| :--- | :--- | :--- |
| `Cmd + Ctrl + /` | **Instant Area Crop** | Selected area piped directly to clipboard (`wl-copy`). No disk write, zero overhead. |
| `Cmd + Ctrl + Alt + /` | **Smart Area Capture** | Full context + area crop analyzed by Gemini Vision, saved to `~/ss/clip/<slug>.png`, and indexed in SQLite. |
| `Cmd + Ctrl + \` | **Instant Fullscreen** | Full screen copied directly to clipboard (`wl-copy`). |
| `Cmd + Ctrl + Alt + \` | **Smart Fullscreen** | Full screen saved to `~/ss/full/<slug>.png` and indexed in SQLite. |
| `Cmd + Ctrl + Shift + /` | **Search Screenshot Index** | Opens interactive FTS5 search menu. Selecting an item opens it in `xdg-open`. |

---

## License

DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE (WTFPL). See [LICENSE](LICENSE) for details.
