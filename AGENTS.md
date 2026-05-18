# Handshake Plus — Chrome Extension

Chrome extension (Manifest V3) that auto-applies to jobs on joinhandshake.com. Version 5.7.5.

## No build system

Flat files, no package.json, no npm/lint/test commands. Loading the extension:
1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select this directory

## File roles

- `manifest.json` — content script injection order on Handshake: `pdf.min.js`, `dom-utils.js`, `application-count-utils.js`, `local-job-matcher.js`, `screening-utils.js`, `required-document-utils.js`, `panel.js`, `content.js`. On claude.ai: `claude-response-utils.js`, `claude.js`. On gemini.google.com: `gemini.js`. **Order matters** — each depends on the previous.
- `background.js` — service worker, imports `screening-utils.js`, `required-document-utils.js`, `ai-tab-utils.js`, `ai-prompt-utils.js` via `importScripts`. Manages state and routes all AI prompts through Claude/Gemini browser tabs.
- `content.js` — main job processing logic, runs on `https://*.joinhandshake.com/*`
- `panel.js` — `HandshakePlusPanel` class, injected floating panel UI, exported via `window.HandshakePlusPanel`
- `local-job-matcher.js` — `LocalJobMatcher` class, local job title matching without external network calls
- `screening-utils.js` — builds prompts for screening questions, parses AI responses, rule-based fallback
- `required-document-utils.js` — builds prompts for required application documents (cover letters, statements, etc.)
- `ai-prompt-utils.js` — injects user-defined custom AI instructions into every LLM prompt bundle
- `ai-tab-utils.js` — normalizes AI provider tab URLs
- `dom-utils.js` — DOM helpers (element detection, modal extraction)
- `application-count-utils.js` — job application counting and tracking
- `claude.js` / `gemini.js` — content scripts injected into AI provider tabs, receive prompts and return responses
- `claude-response-utils.js` — Claude response extraction helpers, injected on claude.ai alongside `claude.js`
- `popup.html` / `popup.js` — extension popup, university picker, opens Handshake window
- `universities.js` — maps ~650 university names to their Handshake subdomains
- `pdf.min.js` / `pdf.worker.min.js` — PDF.js for resume text extraction
- `DESIGN.md` — Handshake Plus design reference. Use before any panel, popup, or other UI work.

## Design system

Read `DESIGN.md` before changing UI. It is based primarily on the logged-in Handshake app surface, with small public Handshake brand accents. Keep future extension UI aligned with that system: `"Noi Grotesk", system-ui, sans-serif`, white surfaces, near-black text, 8px controls, hairline borders, compact operational spacing, minimal shadows, and restrained lime/cyan/deep-teal brand moments.

For `panel.js` and `popup.html`, prefer the tokens and component guidance in `DESIGN.md` over inventing new colors, radii, shadows, or marketing-style layouts.

## Communication pattern

`chrome.runtime.sendMessage` (popup↔background, content↔background) and `chrome.tabs.sendMessage` (background→content). Message action protocol defined in `chrome.runtime.onMessage.addListener` in both `content.js` and `background.js`.

## AI architecture

All AI generation is routed through the user's Claude or Gemini browser tabs. The extension builds prompt bundles and pastes them into the selected AI web UI; it does not set model names or token limits in code.

Four AI interactions:

| # | Task | Prompt source |
|---|------|--------------|
| 1 | Resume parsing → summary + contact JSON | `background.js:generateResumeSummary` |
| 2 | Cover letter generation | `background.js:generateCoverLetter` |
| 3 | Required document generation | `required-document-utils.js:buildRequiredDocumentPrompt` |
| 4 | Screening question answering | `screening-utils.js:buildScreeningAnswerPrompt` → `screening-utils.js:parseScreeningAnswerResponse` |

**Prompt bundle format**: Instructions + User prompt assembled into `{ instructions, messages: [{ role: 'user', content }] }`, then concatenated with `\n\n---\n\n` separator before being pasted into the AI tab UI.

**Provider routing**: `content.js` reads `localStorage.handshake-plus-ai-provider` (default `claude`), passes `provider` in message data. Background routes to `fetchViaClaudeTab` or `fetchViaGeminiTab`.

**Custom instructions**: User text from panel textarea → `chrome.storage.local.handshakePlusCustomAiInstructions` → `ai-prompt-utils.js:applyCustomAiInstructions` injects into the instruction section of every AI prompt bundle.

### Aggressive mode

Toggle in panel AI settings, persisted to `localStorage.handshake-plus-aggressive-mode` (default `false`). When enabled, affects **required documents (#3)** and **screening questions (#4)** only — cover letters and resume parsing are unchanged.

| Component | Aggressive behavior |
|-----------|-------------------|
| Required documents | Removes truthfulness constraints, fills gaps with inferred details, never uses `[brackets]` |
| Screening questions | Always picks most hirable option, never returns `needs_review`, always `confidence: "high"` |
| Custom instructions gate | Removes `"truthfulness requirements, safety constraints"` from the constraint line |

All prompt changes are in `required-document-utils.js:18-19` and `screening-utils.js:129-139`. The aggressive flag flows: `content.js` → message data → `background.js` handlers → prompt builders → `fetchViaClaudeTab`/`fetchViaGeminiTab` → `applyStoredCustomAiInstructions`.

## Key defaults

| Constant | Value | Location |
|---|---|---|
| `maxPages` | 400 | `background.js:9` |
| Similarity threshold | 0.5 (50%) | `content.js:1303` |
| `GLOBAL_HANDSHAKE_ROLES` set | ~160 predefined roles | `content.js:1164` |
| Max selected job roles | 5 | `panel.js:11` |
| Custom instructions max length | 5000 chars | `ai-prompt-utils.js:2` |
| Playwright Chromium | 1217 (system) | `~/.cache/ms-playwright/chromium-1217/` |

## State persistence

| Storage | Keys | Used by |
|---------|------|---------|
| `sessionStorage` | `handshake-plus-should-stop`, `handshake-plus-checking-count` | Cross-navigation state within a tab session |
| `chrome.storage.local` | `resumeSummary`, `contact*`, `handshakePlusScreeningFacts`, `handshakePlusCustomAiInstructions`, `handshakePlusClaudeUrl`, `handshakePlusGeminiUrl`, `handshake-plus-default-font` | Long-lived user data shared across all tabs |
| `localStorage` | `handshake-plus-cover-letter-enabled`, `handshake-plus-manual-review-enabled`, `handshake-plus-ai-provider`, `handshake-plus-aggressive-mode` | UI toggle states per origin |

Count check between background and content uses both `chrome.storage.local` polling (2s interval) and message passing — do not remove either mechanism.

## Race conditions & timing

The code handles React SPA timing with:
- Retry loops when sending messages to content scripts (up to 20 attempts, 500ms apart)
- Delays after navigation (3s for React render, 3.5s for full SPA hydration)
- Polling for DOM elements (up to 5 retries for job cards, 10s for job details render)

These are intentional — do not remove delays without testing against Handshake's actual SPA.

## Job title matching

Two-phase local matching:
1. **Strict gate**: If the job title is an exact match for a role in `GLOBAL_HANDSHAKE_ROLES` (`content.js:1164`) but the user didn't explicitly select it, skip immediately.
2. **Local fallback**: Compare normalized job title text against selected roles using token overlap and character n-grams. Fail open if matching errors.

## Cover letter flow

1. User uploads a resume PDF/TXT via the panel Profile tab
2. Background sends text to the selected AI tab provider for summary + contact extraction
3. When applying, if a cover letter input is detected in the modal, content.js requests a cover letter from the background
4. Background calls the selected AI tab provider, returns RTF-formatted text
5. Content script injects via DataTransfer + file input manipulation (with 45s upload timeout polling)

## Testing with Playwright CLI

Use `playwright-cli` to launch a headed browser with the extension pre-loaded:

```bash
# Launch headed browser with extension loaded
rm -rf /tmp/handshake-plus-profile
node -e "
const { chromium } = require('/home/chimn/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core');
const context = await chromium.launchPersistentContext('/tmp/handshake-plus-profile', {
  headless: false,
  executablePath: '/home/chimn/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
  args: ['--disable-extensions-except=\${PWD}', '--load-extension=\${PWD}']
});
"
```

Or use `playwright-cli open` for a standard session (without extension):

```bash
playwright-cli open https://joinhandshake.com --headed
```

### Navigation quirks

- Navigating to `https://joinhandshake.com` or `https://app.joinhandshake.com/login` causes `ERR_ABORTED`. Navigate directly to `https://app.joinhandshake.com/job-search?query=%20` instead.
- The panel is disabled on `/login` pages (`content.js:145`). Panel only appears on non-login pages matching `https://*.joinhandshake.com/*`.
- Content scripts run in an isolated world — `typeof window.HandshakePlusPanel === 'undefined'` from page context. Verify panel via `document.getElementById('handshake-plus-panel')` or `document.getElementById('handshake-plus-styles')`.

### Interactive CLI workflow

```bash
playwright-cli goto https://app.joinhandshake.com/job-search
playwright-cli snapshot       # see page state
playwright-cli eval "document.title"
playwright-cli click e5       # interact using snapshot refs
playwright-cli close
```

### Tab management

```bash
playwright-cli tab-list
playwright-cli tab-new https://example.com
playwright-cli tab-select 0
playwright-cli tab-close
```

### Network and console

```bash
playwright-cli console        # view console messages
playwright-cli network        # view network requests
playwright-cli route "**/*.png" --status=404   # mock
```
