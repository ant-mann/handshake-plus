# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Chrome extension (MV3) that auto-applies to jobs on joinhandshake.com. Version 5.7.5. See `AGENTS.md` for the original architecture reference — this file reflects the current state including changes made after that doc was written.

## No build system

Flat directory, no `package.json`. Load the extension:
1. `chrome://extensions` → Enable Developer Mode → "Load unpacked" → select this directory
2. After any change to `manifest.json`, click the reload icon in `chrome://extensions`
3. After changes to content scripts only, reload the extension — existing tabs also need a page refresh

## Testing

Run `node test.js` from the repo root. It launches a headed Chromium with the extension pre-loaded, opens claude.ai and Handshake, enables cover letters, starts applying, and streams status to stdout.

```bash
node test.js
```

The test uses a persistent profile at `/tmp/handshake-plus-profile-2` so login sessions persist across runs.

For interactive browser automation without the full test script, `playwright-cli` is available:
```bash
playwright-cli open --profile=/tmp/handshake-plus-profile-2
playwright-cli goto https://app.joinhandshake.com/job-search?query=%20
playwright-cli snapshot
```

Do NOT navigate to `https://joinhandshake.com` or the login page — those cause `ERR_ABORTED` redirect chains. Go directly to `https://app.joinhandshake.com/job-search?query=%20`.

## Architecture

### Content script injection order (matters — each depends on the previous)
1. `pdf.min.js` — PDF.js library
2. `local-job-matcher.js` — `LocalJobMatcher` class (local job title matching), exported on `window`
3. `panel.js` — `HandshakePlusPanel` class (floating sidebar UI), exported on `window.HandshakePlusPanel`
4. `content.js` — main job processing logic, uses the above three

Also injected separately:
- `claude.js` — into `claude.ai/*` — puppeteers the claude.ai UI (ProseMirror composer)
- `gemini.js` — into `gemini.google.com/*` — puppeteers the Gemini UI (Quill `.ql-editor`)

### Message flow (action names)

**content.js → background.js**: `startApplying`, `stopApplying`, `getState`, `keepalive`, `jobProcessed`, `pageComplete`, `countCheckComplete`, `generateCoverLetter`

**background.js → content.js**: `ping`, `checkTodayApplications`, `processPage`, `goToNextPage`, `updateProgress`, `countCheckFailed`, `aiStatus`, `stopped`

**background.js ↔ claude.js**: `handshakePlusPing` / `handshakePlusPrompt` (bg→tab), `handshakePlusResponse` (tab→bg)

**background.js ↔ gemini.js**: `handshakePlusGeminiPing` / `handshakePlusGeminiPrompt` (bg→tab), `handshakePlusGeminiResponse` (tab→bg)

### AI cover letter pipeline
1. `content.js` detects cover letter input field in Handshake modal → sends `generateCoverLetter` to background
2. `background.js` routes to `fetchViaClaudeTab()` or `fetchViaGeminiTab()` based on `provider` field
3. For Claude: `getReadyClaudeTabId()` pings existing tabs; if none respond, opens a new one and injects `claude.js` programmatically via `chrome.scripting.executeScript` (declarative injection is unreliable on Windows Chrome)
4. For Gemini: same pattern via `getReadyGeminiTabId()` / `gemini.js`
5. The AI tab fills the composer, sends the prompt, waits for streaming to finish, returns the text
6. `background.js` strips extended thinking text (finds last "Hello," before "Sincerely,"), prepends contact header, returns to `content.js`
7. `content.js` optionally shows a manual-review overlay (`promptUserForReview`) before uploading the RTF to the modal

### State storage
- `chrome.storage.local`: resume text, filter states, contact info, saved URL/university, `handshake-plus-applied-today` (`{ date: "YYYY-MM-DD", count: N }` — persists today's applied count across service worker restarts)
- `sessionStorage` (`handshake-plus-*` keys): cross-navigation state during an active run (should-stop, checking-count, page navigation flags)
- `localStorage`: cover letter toggle, manual review toggle, AI provider choice (`claude` or `gemini`), default font

## Key constants

| Constant | Value | Location |
|---|---|---|
| Similarity threshold | 0.5 | `content.js` |

## Important implementation notes

**Timing**: The codebase has intentional delays (1.5–3.5s post-navigation, 500ms retry loops) for Handshake's React SPA. Do not remove them without testing against the live site.

**Double-injection guards**: Both `claude.js` and `gemini.js` start with `if (window.__handshakePlus*Loaded) throw ...` to prevent re-running if `chrome.scripting.executeScript` is called on a tab that already has the declarative injection. This is intentional.

**Cover letter review overlay (`promptUserForReview` in `content.js`)**: Mounted on `document.body` while the Handshake application modal is open. Uses window-level capture listeners for `click`, `mousedown`, `pointerdown`, `focusout`, `focusin`, `blur`, and `focus`. Handshake closes its modal on `focusout` — so `mousedown` must call `preventDefault()` for non-textarea targets (suppresses browser focus transfer), and all four focus events are intercepted whenever either `e.target` or `e.relatedTarget` is inside the overlay. Do not replace these window-level listeners with bubble-phase or overlay-level listeners — those approaches have all been tried and fail.

**Modal liveness guards in `clickApplyAndCloseModal`**: After the AI generation await (~30s) in `fillCoverLetterField`, there is an explicit `if (!document.body.contains(modal)) return "FAILED"` check — the modal may have closed while waiting. Similarly, before clicking the submit button, there is a `document.body.contains(modal)` guard to prevent false-positive success reporting on detached DOM nodes.

**`coverLetterStatus` must be `let`-declared** inside `clickApplyAndCloseModal`. It was previously an undeclared (implicit global) variable; a stale value from a previous job could bleed into the next job's flow.

**`hasCustomQuestions` skip list**: `input[type="checkbox"]` is intentionally skipped alongside `radio`, `hidden`, `file`, `submit`, `button`. Handshake sometimes includes "agree to terms" checkboxes that are not custom questions.

**`appliedCount` persistence**: Background service workers are killed by Chrome after ~5 minutes of inactivity. `appliedCount` is persisted to `chrome.storage.local` (`handshake-plus-applied-today`) on every increment and on initial scrape. The `getState` handler restores from storage when not actively processing, so the panel shows the correct count even after a worker restart.

**Job title matching**: Two-phase — strict exact-match gate against `GLOBAL_HANDSHAKE_ROLES`, then local text similarity against selected roles. Fails open (applies anyway) if matching errors.

**Gemini response capture**: Must use `element.innerText` (not `textContent`) to preserve paragraph breaks from the rendered `model-response` elements. `textContent` concatenates all text nodes into one block.
