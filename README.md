<p align="center">
  <img src="icons/handshake_H_plus.svg" alt="Handshake Plus logo" width="120" height="120">
</p>

<h1 align="center">Handshake Plus</h1>

<p align="center">
  AI-assisted job application automation for Handshake — built like a native product feature.
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Chrome%20Extension-Manifest%20V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white">
  <img alt="No build step" src="https://img.shields.io/badge/Build-none-121212?style=for-the-badge">
  <img alt="Version 1.0.0" src="https://img.shields.io/badge/version-1.0.0-D3FB52?style=for-the-badge">
  <img alt="AI Providers" src="https://img.shields.io/badge/AI-Claude%20%7C%20Gemini-B1F8FF?style=for-the-badge">
</p>

> Unofficial project. Handshake Plus is not affiliated with Handshake, Claude, Gemini, Anthropic, Google, or any university.

---

## What It Does

Handshake Plus is a **Chrome Extension (Manifest V3)** that automates job applications on [joinhandshake.com](https://joinhandshake.com) while giving users full control over every step. It runs as a native-feeling overlay inside the Handshake SPA, not as a separate widget.

**Core capabilities:**

- **Auto-apply loop** — Iterates through job search results, filters by your target roles, detects qualification mismatches, and submits applications automatically
- **AI document generation** — Generates cover letters, required documents, and screening-question answers through your own Claude or Gemini browser tabs (no API keys needed)
- **Manual review workflow** — Every AI-generated document can be reviewed, edited, and previewed in a rich modal before submission
- **Smart job filtering** — Hides promoted/sponsored listings by default; skips jobs that don't match your selected roles or qualifications
- **Resume intelligence** — Extracts text from PDF/TXT resumes, parses them via AI for contact info and screening facts, and uses them to personalize every document

---

## Quick Start

Zero build system. Flat files only.

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this repository folder.
6. Open Handshake job search and use the Handshake Plus panel.

After changing files locally, reload the extension from `chrome://extensions`.

---

## Architecture Overview

The extension coordinates **four runtime contexts** that communicate through Chrome's message passing APIs:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────────┐
│  Handshake   │◄───►│   Content    │◄───►│  Background  │◄───►│ Claude/Gemini │
│    SPA       │     │   Script     │     │  Service     │     │      Tab      │
│              │     │ (content.js) │     │   Worker     │     │  (claude.js/  │
│              │     │              │     │(background.js)│    │   gemini.js)  │
└──────────────┘     └──────────────┘     └──────────────┘     └───────────────┘
       ▲                    ▲
       │                    │
       └──── Injected ──────┘
              Panel
           (panel.js)
```

**Key technical decisions:**

- **No build system** — Pure vanilla JS, CSS-in-JS, flat file structure. Zero dependencies for the runtime.
- **AI through browser tabs** — Instead of calling paid APIs directly, the extension puppeteers the user's own Claude.ai or Gemini tab via `chrome.tabs.sendMessage` and `contentScript` injection. This means users don't need API keys and can leverage their existing AI subscriptions.
- **SPA-aware automation** — Handshake is a React SPA with async navigation. The extension handles React hydration delays, URL changes via `history.pushState` interception, and DOM polling with retry loops.
- **Focus interception** — The manual review modal intercepts `focus`, `blur`, `focusin`, `focusout`, `click`, `mousedown`, and `pointerdown` events at the window capture phase to prevent Handshake's dialog system from stealing focus or closing the modal.
- **ProseMirror integration** — The Claude tab script uses a three-tier fill strategy (`execCommand` → clipboard paste simulation → `innerHTML` with paragraph structure) to reliably populate Claude's ProseMirror composer.

---

## Design System

The entire extension UI follows a **custom design system** (`DESIGN.md`) modeled after Handshake's logged-in app shell:

- **Typography:** `"Noi Grotesk", system-ui, sans-serif` throughout
- **Surfaces:** White (`#FFFFFF`) with `1px rgba(31, 32, 44, 0.2)` hairline borders
- **Radii:** `8px` default for all controls
- **Elevation:** No heavy shadows — borders and spacing carry structure
- **Brand accents:** Lime (`#D3FB52`), cyan (`#B1F8FF`), and deep teal (`#052326`) used sparingly for premium moments

**Visual signature:** The panel has a `2px` deep-teal top border and a lime brand dot next to the title — signaling it's a Handshake Plus feature while staying native to the app.

---

## Panel Tabs

The injected floating panel has three tabs, each organized into bordered "wells":

### Apply
- **Status well** — Shows current state with a pulsing green dot during active automation
- **Actions** — Start/Stop applying with `button-secondary` styling
- **Job Filters** — Hide promoted listings toggle (default ON), hide-after-apply toggle, and optional AI job-fit filter
- **Progress** — Today's application count with large metric display
- **AI Cover Letter** — Enable/disable with conditional provider selector

### Profile
- **Resume Upload** — PDF/TXT upload via bundled PDF.js, with optional raw-resume mode
- **Contact Information** — Name, email, location, phone (auto-extracted from resume via AI)
- **Screening Facts** — Languages, relocation preferences, work authorization, visa sponsorship

### Settings
- **AI Provider** — Claude or Gemini segmented control, optional project/chat URLs
- **Custom AI Instructions** — 5000-char textarea with live character counter
- **Aggressive Mode** — Warning-styled well; AI always picks the most hirable option, never uses `[brackets]`
- **Document Font** — Default font selector (Calibri, Times New Roman, Georgia, etc.) persisted across sessions

---

## AI Integration

The extension performs **five AI-assisted tasks**, all routed through the user's browser tab:

| # | Task | Prompt Source | Output |
|---|------|---------------|--------|
| 1 | Resume parsing | `background.js:generateResumeSummary` | Summary + contact/screening facts JSON |
| 2 | Cover letter generation | `background.js:generateCoverLetter` | RTF-formatted text |
| 3 | Required document generation | `required-document-utils.js:buildRequiredDocumentPrompt` | RTF-formatted text |
| 4 | Screening question answering | `screening-utils.js:buildScreeningAnswerPrompt` | Fenced JSON with confidence |
| 5 | Page-level job-fit filtering | `background.js:filterJobsByFit` | Fenced JSON decisions |

**Structured output:** Resume parsing and screening prompts ask for fenced `json` code blocks. Parsers extract the first JSON block and tolerate raw JSON or extra provider text.

**AI job-fit filtering:** When enabled, visible job cards are evaluated once per page against the stored resume context and dedicated AI filter instructions. Only explicit `apply: true` decisions proceed; all other or malformed decisions are locally hidden and skipped.

**Custom instructions:** User-defined text from the Settings tab is injected into most AI prompt bundles via `ai-prompt-utils.js:applyCustomAiInstructions`. The job-fit filter uses its own dedicated instructions field.

**Aggressive mode:** When enabled, removes truthfulness constraints from required documents and screening questions, fills gaps with inferred details, and always returns `confidence: "high"`.

**Raw resume mode:** Users can toggle "Use raw resume text" to bypass AI summarization entirely. All downstream prompts use the stored `resumeText` instead of `resumeSummary`.

---

## Manual Review

When manual review is enabled, every AI-generated document triggers a full-screen review modal:

- **Rich text editor** — Full textarea with the generated text
- **Font picker** — Pill buttons for instant font switching (applies to both editor and preview)
- **Live preview** — Toggles between edit mode and a formatted preview showing exactly how the RTF will render
- **Approve or skip** — "Approve & Submit" saves the document, "Skip Job" cancels the application

The review modal uses the same DESIGN.md token system as the panel (hairline borders, Noi Grotesk, 8px controls) and is styled to feel like a native Handshake confirmation.

---

## State Persistence

| Storage | Keys | Scope |
|---------|------|-------|
| `chrome.storage.local` | `resumeText`, `resumeSummary`, `contact*`, `handshakePlusScreeningFacts`, `handshakePlusCustomAiInstructions`, `handshakePlusClaudeUrl`, `handshakePlusGeminiUrl`, `handshake-plus-default-font` | Cross-tab, long-lived |
| `localStorage` | `handshake-plus-cover-letter-enabled`, `handshake-plus-manual-review-enabled`, `handshake-plus-ai-provider`, `handshake-plus-aggressive-mode`, `handshake-plus-hide-promoted` | Per-origin UI toggles |
| `sessionStorage` | `handshake-plus-should-stop`, `handshake-plus-checking-count` | Single-session cross-navigation |

---

## SPA Timing & Race Conditions

The extension handles Handshake's React SPA with intentional delays and retry loops:

- **Message retries:** Up to 20 attempts, 500ms apart, when sending to content scripts
- **Navigation delays:** 3s for React render, 3.5s for full SPA hydration
- **DOM polling:** Up to 5 retries for job cards, 25s for job details render, 30s for Apply button discovery
- **Job selection:** After clicking a job, waits 2.5s for SPA navigation and requires job details text to change before trusting the new pane

These are production-hardened against Handshake's actual rendering behavior.

---

## File Structure

| File | Role |
|---|---|
| `manifest.json` | Manifest V3 config and content script injection order |
| `background.js` | Service worker: AI tab routing, prompt orchestration, state management |
| `content.js` | Main Handshake automation: job scanning, modal filling, apply loop |
| `panel.js` | Floating panel UI: 3 tabs, event listeners, drag/resize/minimize |
| `popup.html`, `popup.js` | Toolbar popup: university picker, on-Handshake callout |
| `claude.js`, `gemini.js` | AI provider tab scripts: composer fill, response capture |
| `claude-response-utils.js` | Claude text extraction and cleanup helpers |
| `screening-utils.js` | Screening prompt builder, response parser, rule-based fallback |
| `required-document-utils.js` | Required document prompt and extraction helpers |
| `ai-prompt-utils.js` | Custom AI instruction injection into every prompt bundle |
| `ai-job-fit-filter-utils.js` | Conservative parser/normalizer for page-level AI job-fit decisions |
| `ai-tab-utils.js` | AI provider URL normalization and tab management |
| `job-description-utils.js` | Job description cleanup and collapsed-section expansion |
| `application-count-utils.js` | Daily application count tracking |
| `dom-utils.js` | DOM helpers: element detection, modal extraction |
| `pdf.min.js`, `pdf.worker.min.js` | Bundled PDF.js for resume text extraction |
| `universities.js` | ~650 university names mapped to Handshake subdomains |
| `DESIGN.md` | Design token reference for all UI work |
| `AGENTS.md` | Architecture reference for contributors |

---

## Privacy

- Resume text, contact fields, screening facts, provider URLs, and AI settings are stored **locally** through Chrome storage.
- AI prompts are sent to the **selected AI provider tab that you control** — no third-party backend.
- The extension does **not** include a backend server.
- The extension does **not** set model names or token limits in code.

---

## Third-Party

- **[PDF.js](https://github.com/mozilla/pdf.js)** (Mozilla, Apache-2.0) — bundled as `pdf.min.js` / `pdf.worker.min.js` for client-side resume text extraction.

---

## License

MIT — see [LICENSE](LICENSE).
