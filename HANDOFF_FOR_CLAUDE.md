# CodePad — Project Handoff Brief
> Give this file + CodePad-v5.html + server.js to Claude Desktop and say: "Read HANDOFF_FOR_CLAUDE.md and continue from there."

---

## What is CodePad?
A web-based iPad IDE (PWA — Progressive Web App) built as a **single HTML file** with no build tools. It installs on iPad from a URL via Safari → Add to Home Screen and runs like a native app.

The goal: a Cursor/VS Code-style iPad IDE with:
- Code editor (currently a styled textarea — CodeMirror was removed due to CDN failures)
- File tree + tabs
- AI coding assistant (Claude API / OpenAI / GitHub Models / Ollama / WebLLM on-device)
- Ghost code completions (Tab to accept)
- Project Wizard (AI generates file structure + starter code)
- Terminal panel (shows real output via Railway server, or AI simulation)
- VS Code-compatible themes (Dracula, Nord, Material, Monokai)
- Install as PWA on iPad home screen

---

## Current File: CodePad-v5.html
This is the **only file the user installs on their iPad**. It's deployed to Netlify Drop (drag + drop = instant URL).

**Architecture:** Single HTML file, zero external CDN dependencies at load time. WebLLM loads dynamically only when user explicitly requests it.

---

## Known Bugs to Fix (Priority Order)

### 🔴 BUG 1 — CRITICAL: Run button doesn't execute code
**Symptom:** User presses ▶ Run, nothing happens — not even `print("hello world")` output.
**Root cause:** The AI simulation fallback calls Claude/OpenAI API but if no key is configured AND no Railway server is set, it silently does nothing or shows a confusing message.
**Fix needed:** 
- When no AI key and no server: show a clear inline terminal message explaining what's needed
- When Claude key IS set: the simulation should ALWAYS work — check why it's not firing
- Add a simple built-in JS evaluator for JavaScript so at least JS runs without any server
- For Python: the Railway server is required for real execution — make this crystal clear in the UI

### 🔴 BUG 2 — WebLLM CDN still failing
**Symptom:** `[WebLLM] Error: Failed to fetch dynamically imported module: https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.82/+esm`
**Context:** This only needs to work on iPad Safari 26 / iPadOS 26 with WebGPU. On Windows PC it's expected to fail (different GPU stack). The error message should reflect this.
**Fix needed:**
- Catch the import error gracefully — show "On-device AI requires iPadOS 26 on iPad — use Claude/GitHub API instead" 
- Don't let this error spam the terminal
- On iPad Safari 26, try `https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm/+esm` (without version pin) as fallback

### 🟡 BUG 3 — Selected file blinking (partially fixed)
**Status:** `.cur` → `.blink-c` rename was done but verify it's fully gone by checking the sidebar renders correctly with no animation on selected file.

### 🟡 BUG 4 — Language dropdown doesn't show current file's language
When switching between files, the language dropdown in the topbar should update to reflect the current file's language.

---

## Architecture Details

### State (localStorage keys)
```
cp5_files    — JSON array of {name, lang, content, folder?}
cp5_prov     — 'local' | 'claude' | 'ollama'
cp5_ghost    — 'true' | 'false'
cp5_model    — WebLLM model ID string
cp5_ant      — Anthropic API key
cp5_oai      — OpenAI API key  
cp5_gh       — GitHub token
cp5_srv      — Railway server URL
cp5_oll      — Ollama URL (e.g. http://192.168.1.42:11434)
cp5_ollm     — Ollama model name
cp5_theme    — 'dracula' | 'nord' | 'material' | 'monokai'
cp5_fs       — font size integer
```

### AI Provider Priority (in callAI())
1. Local WebLLM engine (if loaded)
2. Ollama (if prov==='ollama' and URL set)
3. Claude/Anthropic API (if key set)
4. OpenAI API (if key set)
5. GitHub Models (if token set)

### Run Code Flow
1. Try Railway server POST /run with {code, language}
2. If server unreachable → AI simulation (Claude/OpenAI)
3. If no AI → show error message

### WebLLM Models (for iPad WebGPU)
- `Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC` — ~950MB, fastest
- `Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC` — ~1.8GB, recommended for M4
- `Llama-3.2-3B-Instruct-q4f16_1-MLC` — ~1.9GB, alternative

---

## Server Files (deploy to Railway)
- `server.js` — Node.js Express server, POST /run endpoint
- `package.json` — dependencies: express, cors, express-rate-limit
- `Dockerfile` — Python 3.12 + Node 20, includes numpy/pandas/sklearn/matplotlib
- `railway.json` — Railway deploy config

**To deploy:** Put all 4 files in a GitHub repo → Railway.app → New Project → Deploy from GitHub → Generate Domain → paste URL in CodePad ⚙ Settings → Code Execution Server

---

## Deployment
- **iPad app:** Netlify Drop (app.netlify.com/drop) → drag CodePad-v5.html → get URL → open in Safari on iPad → Share → Add to Home Screen
- **Server:** Railway (see above)
- **No build step needed** — it's a single HTML file

---

## User Context
- Nicky, data scientist / AI engineer, based in Lima Peru
- M4 iPad Pro, iPadOS 26, Safari 26
- Testing also on Windows PC (Netlify URL in browser)
- Wants this to actually work like Cursor/VS Code on her iPad
- Main use case: Python data science code (pandas, sklearn, matplotlib)
- Has Anthropic API key and GitHub account

---

## What's Working ✓
- All buttons and modals open correctly
- File tree, tabs, new file modal
- Theme switching
- AI Setup modal with Claude / OpenAI / GitHub / Ollama / WebLLM options
- Settings modal
- Project Wizard UI (needs AI key to generate)
- Ghost completions logic (needs AI key)
- PWA install flow via Netlify

## What's NOT Working ✗
- ▶ Run button — no output even with API key
- WebLLM download (CDN error — partially expected on Windows, needs graceful error on iPad)
- Real Python execution (needs Railway server deployed)

---

## Suggested Next Steps for Claude Desktop
1. Fix the Run button — add built-in JS execution + better fallback messaging
2. Fix WebLLM error handling so it doesn't spam terminal
3. Test the Claude API simulation path end-to-end
4. Consider adding a proper `netlify.toml` with CORS/CSP headers to ensure CDN imports work
5. Maybe add a syntax-highlighted editor using a self-hosted minimal highlight.js instead of full CodeMirror
