# Premium UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the injected panel and extension popup to feel like a native Handshake product feature, restructure the panel into 3 tabs (Apply / Profile / Settings), and add a user-toggle for hiding promoted listings (default ON).

**Architecture:** Complete CSS and HTML rewrite of `panel.js` using DESIGN.md tokens. Extract AI settings into a new Settings tab. Restructure Profile tab into clearly separated wells. Rewrite `popup.html` with matching token styling. Wrap existing promoted-job filtering in `content.js` behind a `localStorage` toggle.

**Tech Stack:** Vanilla JS, inline CSS-in-JS, Chrome Extension Manifest V3, Playwright CLI for verification.

---

## File Structure

| File | Responsibility |
|---|---|
| `panel.js` | Injected floating panel: HTML template, CSS block, drag/resize/tab logic, event listeners, hide-promoted toggle |
| `popup.html` | Extension popup markup: university selector, Handshake redirect button |
| `popup.js` | Popup logic: university datalist filtering, storage read/write, redirect (no structural changes needed) |
| `content.js` | Content script: job scanning loop, promoted job detection and hiding (wrap in toggle) |

---

## Task 1: Rewrite panel.js CSS (`addStyles`)

**Files:**
- Modify: `panel.js` — replace the entire `addStyles()` method body

The new CSS uses DESIGN.md tokens throughout. All old Bootstrap-blue styling, gradients, shadows, and Arial fonts are removed.

- [ ] **Step 1: Replace `addStyles()` CSS block**

Replace the entire body of `addStyles()` (from `style.textContent = \`` to the closing ``;` + `document.head.appendChild(style);`).

Use this exact CSS:

```css
      #handshake-plus-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 360px;
        min-height: 200px;
        max-height: 600px;
        background: #FFFFFF;
        border: 1px solid rgba(31, 32, 44, 0.2);
        border-radius: 8px;
        z-index: 999999;
        font-family: "Noi Grotesk", system-ui, sans-serif;
        transition: none;
        display: flex;
        flex-direction: column;
        color: #121212;
        overflow: hidden;
      }

      #handshake-plus-panel.minimized {
        height: auto !important;
        width: auto !important;
        min-width: unset !important;
        min-height: unset !important;
        max-height: unset !important;
      }

      #handshake-plus-panel.minimized .hsp-header {
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 0 !important;
        border-bottom: none;
      }

      #handshake-plus-panel.minimized .hsp-header-title {
        white-space: nowrap;
      }

      #handshake-plus-panel.minimized .hsp-tabs,
      #handshake-plus-panel.minimized .hsp-body,
      #handshake-plus-panel.minimized .hsp-resize {
        display: none !important;
      }

      .hsp-header {
        background: #FFFFFF;
        color: #121212;
        padding: 12px 16px;
        border-radius: 8px 8px 0 0;
        border-bottom: 1px solid rgba(31, 32, 44, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
      }

      .hsp-header-title {
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 20px;
        font-weight: 700;
        line-height: 24px;
        letter-spacing: -0.15px;
        color: #121212;
      }

      .hsp-header-controls {
        display: flex;
        gap: 8px;
      }

      .hsp-btn-ghost {
        background: transparent;
        border: none;
        color: #121212;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 150ms ease-out;
        font-family: "Noi Grotesk", system-ui, sans-serif;
      }

      .hsp-btn-ghost:hover {
        background: #F6F6F6;
      }

      .hsp-tabs {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        background: transparent;
        border-bottom: 1px solid rgba(31, 32, 44, 0.2);
      }

      .hsp-tab {
        flex: 1;
        padding: 2px 8px;
        border: none;
        background: transparent;
        color: rgba(18, 18, 18, 0.7);
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 17px;
        font-weight: 500;
        line-height: 23.8px;
        cursor: pointer;
        border-radius: 8px;
        transition: background-color 150ms ease-out, color 150ms ease-out;
        text-align: center;
      }

      .hsp-tab:hover {
        background: #F6F6F6;
        color: #121212;
      }

      .hsp-tab.active {
        background: #EAEAEA;
        color: #121212;
      }

      .hsp-tab.disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }

      .hsp-body {
        padding: 0;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .hsp-body::-webkit-scrollbar {
        width: 6px;
      }

      .hsp-body::-webkit-scrollbar-track {
        background: #F6F6F6;
        border-radius: 4px;
      }

      .hsp-body::-webkit-scrollbar-thumb {
        background: rgba(31, 32, 44, 0.2);
        border-radius: 4px;
      }

      .hsp-body::-webkit-scrollbar-thumb:hover {
        background: rgba(18, 18, 18, 0.3);
      }

      .hsp-tab-content {
        display: none;
        padding: 12px 16px;
      }

      .hsp-tab-content.active {
        display: block;
      }

      .hsp-well {
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        border: 1px solid rgba(31, 32, 44, 0.2);
        background: #FFFFFF;
      }

      .hsp-well:last-child {
        margin-bottom: 0;
      }

      .hsp-well-title {
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 15px;
        font-weight: 500;
        line-height: 18px;
        color: #121212;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .hsp-well-warning {
        border-color: rgba(187, 54, 67, 0.3);
        background: rgba(187, 54, 67, 0.03);
      }

      .hsp-status {
        padding: 10px 12px;
        background: #F6F6F6;
        border: 1px solid rgba(31, 32, 44, 0.2);
        border-radius: 8px;
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 15px;
        font-weight: 400;
        line-height: 18px;
        color: #121212;
        text-align: center;
      }

      .hsp-status.success {
        background: rgba(50, 125, 15, 0.08);
        border-color: rgba(50, 125, 15, 0.3);
        color: #327D0F;
      }

      .hsp-status.error {
        background: rgba(187, 54, 67, 0.08);
        border-color: rgba(187, 54, 67, 0.3);
        color: #BB3643;
      }

      .hsp-status-inline {
        margin-top: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        display: none;
      }

      .hsp-status-inline.success {
        display: block;
        background: rgba(50, 125, 15, 0.08);
        border: 1px solid rgba(50, 125, 15, 0.3);
        color: #327D0F;
      }

      .hsp-status-inline.error {
        display: block;
        background: rgba(187, 54, 67, 0.08);
        border: 1px solid rgba(187, 54, 67, 0.3);
        color: #BB3643;
      }

      .hsp-status-inline.loading {
        display: block;
        background: rgba(177, 248, 255, 0.3);
        border: 1px solid rgba(31, 32, 44, 0.2);
        color: #052326;
      }

      .hsp-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .hsp-btn {
        padding: 0 8px;
        border: 1px solid rgba(31, 32, 44, 0.2);
        border-radius: 8px;
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 15px;
        font-weight: 500;
        line-height: 18px;
        cursor: pointer;
        transition: background-color 150ms ease-out, border-color 150ms ease-out;
        width: 100%;
        height: 36px;
        background: #FFFFFF;
        color: #121212;
        text-align: center;
      }

      .hsp-btn:hover:not(:disabled) {
        background: #F6F6F6;
      }

      .hsp-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .hsp-btn-danger {
        border-color: rgba(187, 54, 67, 0.4);
        color: #BB3643;
      }

      .hsp-btn-danger:hover:not(:disabled) {
        background: rgba(187, 54, 67, 0.06);
      }

      .hsp-btn-danger-outline {
        border-color: rgba(187, 54, 67, 0.4);
        color: #BB3643;
      }

      .hsp-btn-danger-outline:hover:not(:disabled) {
        background: rgba(187, 54, 67, 0.06);
      }

      .hsp-progress-label {
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.4;
        color: rgba(18, 18, 18, 0.7);
        margin-bottom: 4px;
      }

      .hsp-progress-count {
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 20px;
        font-weight: 700;
        line-height: 24px;
        letter-spacing: -0.15px;
        color: #121212;
      }

      .hsp-note {
        margin-top: 10px;
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.4;
        color: rgba(18, 18, 18, 0.7);
        text-align: center;
      }

      .hsp-note a {
        color: #1569E0;
        text-decoration: none;
      }

      .hsp-note a:hover {
        text-decoration: underline;
      }

      .hsp-resize {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 24px;
        height: 24px;
        cursor: sw-resize;
        background: rgba(31, 32, 44, 0.2);
        clip-path: polygon(0 0, 0 100%, 100% 100%);
        border-bottom-left-radius: 8px;
        opacity: 0.6;
        transition: opacity 150ms ease-out, background-color 150ms ease-out;
      }

      .hsp-resize:hover {
        opacity: 1;
        background: rgba(31, 32, 44, 0.4);
      }

      .hsp-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
      }

      .hsp-field:last-child {
        margin-bottom: 0;
      }

      .hsp-field-label {
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 15px;
        font-weight: 400;
        line-height: 18px;
        color: #121212;
      }

      .hsp-required {
        font-size: 12px;
        color: rgba(18, 18, 18, 0.7);
        margin-left: 4px;
      }

      .hsp-optional {
        font-size: 12px;
        color: rgba(18, 18, 18, 0.7);
        margin-left: 4px;
      }

      .hsp-input {
        width: 100%;
        padding: 0 12px;
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 15px;
        font-weight: 400;
        line-height: 18px;
        color: #121212;
        background: transparent;
        border: 1px solid rgba(31, 32, 44, 0.2);
        border-radius: 8px;
        box-sizing: border-box;
        transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
        height: 40px;
      }

      .hsp-input:focus {
        outline: none;
        border-color: #1569E0;
        box-shadow: 0 0 0 2px rgba(21, 105, 224, 0.1);
      }

      .hsp-input::placeholder {
        color: rgba(18, 18, 18, 0.4);
      }

      .hsp-textarea {
        padding: 10px 12px;
        min-height: 72px;
        resize: vertical;
        height: auto;
      }

      .hsp-dropdown-wrap {
        position: relative;
        width: 100%;
      }

      .hsp-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #FFFFFF;
        border: 1px solid rgba(31, 32, 44, 0.2);
        border-top: none;
        border-radius: 0 0 8px 8px;
        max-height: 150px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        font-family: "Noi Grotesk", system-ui, sans-serif;
      }

      .hsp-dropdown.show {
        display: block;
      }

      .hsp-dropdown-item {
        padding: 10px 12px;
        cursor: pointer;
        font-size: 15px;
        color: #121212;
        transition: background-color 150ms ease-out;
        border-bottom: 1px solid rgba(31, 32, 44, 0.08);
      }

      .hsp-dropdown-item:last-child {
        border-bottom: none;
      }

      .hsp-dropdown-item:hover {
        background: #F6F6F6;
      }

      .hsp-dropdown-item.selected {
        background: #EAEAEA;
        color: #121212;
      }

      .hsp-chips {
        margin-top: 10px;
        padding: 8px;
        background: #F6F6F6;
        border: 1px solid rgba(31, 32, 44, 0.2);
        border-radius: 8px;
        font-size: 14px;
        color: #121212;
        display: none;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
      }

      .hsp-chips.show {
        display: flex;
      }

      .hsp-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #FFFFFF;
        border: 1px solid rgba(31, 32, 44, 0.2);
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        font-family: "Noi Grotesk", system-ui, sans-serif;
      }

      .hsp-chip-remove {
        color: #121212;
        cursor: pointer;
        font-weight: 600;
        border: none;
        background: transparent;
        padding: 0;
        line-height: 1;
        font-size: 14px;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 150ms ease-out;
      }

      .hsp-chip-remove:hover {
        background: #EAEAEA;
      }

      .hsp-clear-all {
        margin-left: auto;
        border: none;
        background: transparent;
        color: #1569E0;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        font-family: "Noi Grotesk", system-ui, sans-serif;
      }

      .hsp-clear-all:hover {
        text-decoration: underline;
      }

      .hsp-upload-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
        flex-wrap: wrap;
      }

      .hsp-file-name {
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 12px;
        color: rgba(18, 18, 18, 0.7);
        font-style: italic;
      }

      .hsp-tooltip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: #F6F6F6;
        color: rgba(18, 18, 18, 0.7);
        border: 1px solid rgba(31, 32, 44, 0.2);
        font-size: 11px;
        font-weight: bold;
        font-family: serif;
        cursor: help;
        user-select: none;
        position: relative;
      }

      .hsp-tooltip:hover {
        background-color: #1F202C;
        color: #FFFFFF;
        border-color: #1F202C;
      }

      .hsp-tooltip::after {
        content: attr(data-tooltip);
        position: absolute;
        top: 150%;
        left: 50%;
        transform: translateX(-75%);
        width: 250px;
        background-color: #1F202C;
        color: #FFFFFF;
        text-align: center;
        padding: 8px 12px;
        border-radius: 8px;
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.4;
        opacity: 0;
        visibility: hidden;
        transition: opacity 150ms ease-out, transform 150ms ease-out;
        z-index: 1000;
        pointer-events: none;
      }

      .hsp-tooltip::before {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 6px;
        border-style: solid;
        border-color: transparent transparent #1F202C transparent;
        opacity: 0;
        visibility: hidden;
        transition: opacity 150ms ease-out;
        z-index: 1000;
      }

      .hsp-tooltip:hover::after {
        opacity: 1;
        visibility: visible;
        transform: translateX(-75%) translateY(2px);
      }

      .hsp-tooltip:hover::before {
        opacity: 1;
        visibility: visible;
      }

      .hsp-checkbox-row {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 6px 0;
        gap: 8px;
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 15px;
        font-weight: 400;
        line-height: 18px;
        color: #121212;
      }

      .hsp-checkbox-row input[type="checkbox"] {
        width: 16px;
        height: 16px;
        margin: 0;
        cursor: pointer;
        accent-color: #121212;
        flex-shrink: 0;
      }

      .hsp-segmented {
        display: flex;
        gap: 4px;
      }

      .hsp-segment {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 8px;
        height: 36px;
        border: 1px solid rgba(31, 32, 44, 0.2);
        border-radius: 8px;
        background: #FFFFFF;
        color: rgba(18, 18, 18, 0.7);
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 15px;
        font-weight: 500;
        line-height: 18px;
        cursor: pointer;
        transition: background-color 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out;
      }

      .hsp-segment:has(input:checked) {
        background: #EAEAEA;
        color: #121212;
        border-color: rgba(31, 32, 44, 0.3);
      }

      .hsp-segment input[type="radio"] {
        display: none;
      }

      .hsp-caption {
        font-family: "Noi Grotesk", system-ui, sans-serif;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.4;
        color: rgba(18, 18, 18, 0.7);
        margin-top: 6px;
      }
```

- [ ] **Step 2: Verify the `addStyles` method signature is unchanged**

The method still starts with:
```javascript
  addStyles() {
    if (document.getElementById('handshake-plus-styles')) return;

    const style = document.createElement('style');
    style.id = 'handshake-plus-styles';
    style.textContent = `
```

And ends with:
```javascript
    `;
    document.head.appendChild(style);
  }
```

- [ ] **Step 3: Commit**

```bash
git add panel.js
git commit -m "style(panel): rewrite CSS with DESIGN.md tokens"
```

---

## Task 2: Rewrite panel.js HTML (`createPanel` innerHTML)

**Files:**
- Modify: `panel.js` — replace the `this.panel.innerHTML = \`` template in `createPanel()`

- [ ] **Step 1: Replace the innerHTML template**

Replace everything from `this.panel.innerHTML = \`` to the closing ``;` in `createPanel()`.

Use this exact HTML:

```html
      <div class="hsp-header">
        <span class="hsp-header-title">🤝 Handshake Plus</span>
        <div class="hsp-header-controls">
          <button id="handshake-plus-minimize" class="hsp-btn-ghost" title="Minimize">−</button>
        </div>
      </div>
      <div class="hsp-tabs">
        <button class="hsp-tab active" data-tab="apply">Apply</button>
        <button class="hsp-tab" data-tab="profile">Profile</button>
        <button class="hsp-tab" data-tab="settings">Settings</button>
      </div>
      <div class="hsp-body">
        <div class="hsp-tab-content active" id="apply-content">
          <div class="hsp-well">
            <div class="hsp-status" id="handshake-plus-status">Ready to apply</div>
          </div>
          <div class="hsp-well">
            <div class="hsp-buttons">
              <button id="handshake-plus-start" class="hsp-btn">Start Applying</button>
              <button id="handshake-plus-stop" class="hsp-btn hsp-btn-danger" style="display: none;">Stop</button>
            </div>
          </div>
          <div class="hsp-well">
            <div class="hsp-well-title">Job Filters</div>
            <label class="hsp-checkbox-row">
              <input type="checkbox" id="handshake-plus-hide-promoted" checked>
              <span>Hide promoted listings</span>
            </label>
            <div class="hsp-caption" style="margin-left: 24px; margin-bottom: 10px;">Skip employer-paid placements during auto-apply</div>
            <div class="hsp-field" style="margin-bottom: 0;">
              <span class="hsp-field-label">What job role are you looking for?</span>
              <div class="hsp-dropdown-wrap">
                <input type="text" id="job-role-search" class="hsp-input" placeholder="Type role and press Enter (max 5)" maxlength="75" autocomplete="off">
                <div id="job-role-dropdown" class="hsp-dropdown"></div>
              </div>
            </div>
            <div id="selected-job-role" class="hsp-chips"></div>
          </div>
          <div class="hsp-well" id="handshake-plus-progress" style="display: none;">
            <div class="hsp-progress-label">Jobs applied today</div>
            <div class="hsp-progress-count" id="handshake-plus-count">0</div>
          </div>
          <div class="hsp-well">
            <label class="hsp-checkbox-row">
              <input type="checkbox" id="handshake-plus-cover-letter">
              <span>Enable AI generated cover letters</span>
            </label>
            <div id="handshake-plus-manual-review-wrapper" style="display: none; margin-left: 24px; margin-top: 8px;">
              <label class="hsp-checkbox-row" style="padding-top: 2px;">
                <input type="checkbox" id="handshake-plus-manual-review">
                <span style="font-size: 13px;">Manually review cover letters, documents &amp; screening answers before submitting?</span>
              </label>
            </div>
            <div id="handshake-plus-ai-provider-wrapper" style="display: none; margin-left: 24px; margin-top: 8px;">
              <div class="hsp-segmented">
                <label class="hsp-segment active"><input type="radio" name="handshake-plus-ai-provider" id="handshake-plus-provider-claude" value="claude" checked> Claude</label>
                <label class="hsp-segment"><input type="radio" name="handshake-plus-ai-provider" id="handshake-plus-provider-gemini" value="gemini"> Gemini</label>
              </div>
            </div>
          </div>
          <div class="hsp-note">Submits your most recently uploaded transcript and/or resume on Handshake</div>
          <div class="hsp-note">Tip: keep a <a href="https://claude.ai" target="_blank">claude.ai</a> tab open so Handshake Plus can generate cover letters through your own Claude session.</div>
        </div>
        <div class="hsp-tab-content" id="profile-content">
          <div class="hsp-well">
            <div class="hsp-well-title">
              <span>Upload Your Resume (for cover letter)</span>
              <span class="hsp-tooltip" data-tooltip="This resume is used to generate personalized cover letters.">ⓘ</span>
            </div>
            <div class="hsp-upload-row">
              <input type="file" id="resume-upload" accept=".pdf,.docx" style="display: none;">
              <button id="resume-upload-btn" class="hsp-btn">Choose File</button>
              <button id="resume-remove-btn" class="hsp-btn hsp-btn-danger-outline" style="display: none;">Remove</button>
              <span id="resume-file-name" class="hsp-file-name">No file chosen</span>
            </div>
            <div id="resume-status" class="hsp-status-inline"></div>
            <label class="hsp-checkbox-row" style="margin-top: 8px;">
              <input type="checkbox" id="handshake-plus-raw-resume">
              <span>Use raw resume text (skip AI summary)</span>
            </label>
          </div>
          <div id="filters-form-container" style="display: none;">
            <div class="hsp-well">
              <div class="hsp-well-title">Contact Information</div>
              <label class="hsp-field">
                <span class="hsp-field-label">Full Name</span>
                <input type="text" id="contact-full-name" class="hsp-input" placeholder="e.g. Jane Doe">
              </label>
              <label class="hsp-field">
                <span class="hsp-field-label">Email <span class="hsp-required">(Required)</span></span>
                <input type="email" id="contact-email" class="hsp-input" placeholder="e.g. jane@example.com">
              </label>
              <label class="hsp-field">
                <span class="hsp-field-label">Location <span class="hsp-optional">(Optional)</span></span>
                <input type="text" id="contact-location" class="hsp-input" placeholder="e.g. New York, NY">
              </label>
              <label class="hsp-field" style="margin-bottom: 0;">
                <span class="hsp-field-label">Phone <span class="hsp-optional">(Optional)</span></span>
                <input type="tel" id="contact-phone" class="hsp-input" placeholder="e.g. (555) 123-4567">
              </label>
            </div>
            <div class="hsp-well">
              <div class="hsp-well-title">Screening Facts</div>
              <label class="hsp-field">
                <span class="hsp-field-label">Languages you speak <span class="hsp-optional">(comma separated)</span></span>
                <input type="text" id="screening-languages" class="hsp-input" placeholder="e.g. English, Spanish">
              </label>
              <label class="hsp-field">
                <span class="hsp-field-label">Locations you are willing to relocate to</span>
                <input type="text" id="screening-relocation-locations" class="hsp-input" placeholder="e.g. NYC, Chicago, Anywhere">
              </label>
              <label class="hsp-field">
                <span class="hsp-field-label">US work authorization</span>
                <select id="screening-work-authorization" class="hsp-input">
                  <option value="">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label class="hsp-field" style="margin-bottom: 0;">
                <span class="hsp-field-label">Need visa sponsorship?</span>
                <select id="screening-sponsorship" class="hsp-input">
                  <option value="">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>
          </div>
        </div>
        <div class="hsp-tab-content" id="settings-content">
          <div class="hsp-well">
            <div class="hsp-well-title">AI Provider</div>
            <div class="hsp-segmented">
              <label class="hsp-segment active"><input type="radio" name="handshake-plus-ai-provider" id="handshake-plus-provider-claude" value="claude" checked> Claude</label>
              <label class="hsp-segment"><input type="radio" name="handshake-plus-ai-provider" id="handshake-plus-provider-gemini" value="gemini"> Gemini</label>
            </div>
            <label class="hsp-field" style="margin-top: 12px;">
              <span class="hsp-field-label">Claude project URL</span>
              <input type="url" id="handshake-plus-claude-url" class="hsp-input" placeholder="Optional Claude chat/project URL">
            </label>
            <label class="hsp-field" style="margin-bottom: 0;">
              <span class="hsp-field-label">Gemini chat URL</span>
              <input type="url" id="handshake-plus-gemini-url" class="hsp-input" placeholder="Optional Gemini chat URL">
            </label>
            <div class="hsp-caption">Optional: route AI prompts to a specific Claude or Gemini page with your preferred context.</div>
          </div>
          <div class="hsp-well">
            <div class="hsp-well-title">Custom AI Instructions</div>
            <textarea id="handshake-plus-custom-ai-instructions" class="hsp-input hsp-textarea" placeholder="Custom instructions added to every AI prompt, e.g. tone, cover letter preferences, formatting style" maxlength="5000"></textarea>
            <div class="hsp-caption" id="hsp-instructions-counter">0 / 5000 characters</div>
            <div class="hsp-caption">These are added to cover letters, required documents, screening answers, and resume parsing. Built-in output format and truthfulness rules still apply.</div>
          </div>
          <div class="hsp-well hsp-well-warning">
            <div class="hsp-well-title">⚠️ Aggressive Mode</div>
            <label class="hsp-checkbox-row">
              <input type="checkbox" id="handshake-plus-aggressive-mode">
              <span>Enable Aggressive Mode</span>
            </label>
            <div class="hsp-caption">When enabled, AI will always answer screening questions with the most hirable option and produce complete required documents without placeholder brackets. Intended to maximize interview chances.</div>
          </div>
        </div>
      </div>
      <div class="hsp-resize" id="handshake-plus-resize"></div>
```

- [ ] **Step 2: Update the initial panel height**

In `createPanel()`, after `document.body.appendChild(this.panel);`, update the height setter:

```javascript
    this.panel.style.height = '400px';
```

(Previously `325px`; the new 3-tab layout with wells needs slightly more default height.)

- [ ] **Step 3: Commit**

```bash
git add panel.js
git commit -m "feat(panel): restructure HTML into 3 tabs with DESIGN.md wells"
```

---

## Task 3: Update panel.js JavaScript (selectors, listeners, tab logic)

**Files:**
- Modify: `panel.js` — update class selectors and add hide-promoted toggle logic

- [ ] **Step 1: Update `attachEventListeners()` tab selector**

Find:
```javascript
    // Tab switching
    const tabs = this.panel.querySelectorAll('.handshake-plus-tab');
```

Replace with:
```javascript
    // Tab switching
    const tabs = this.panel.querySelectorAll('.hsp-tab');
```

- [ ] **Step 2: Add hide-promoted toggle listener in `attachEventListeners()`**

Immediately after the tab switching block (after `tabs.forEach(...)`), add:

```javascript
    // Hide promoted listings toggle
    const hidePromotedCb = this.panel.querySelector('#handshake-plus-hide-promoted');
    if (hidePromotedCb) {
      const savedHidePromoted = localStorage.getItem('handshake-plus-hide-promoted');
      if (savedHidePromoted !== null) {
        hidePromotedCb.checked = savedHidePromoted === 'true';
      }
      hidePromotedCb.addEventListener('change', () => {
        localStorage.setItem('handshake-plus-hide-promoted', hidePromotedCb.checked);
      });
    }
```

- [ ] **Step 3: Update cover letter conditional height adjustment**

Find the `coverLetterCb.addEventListener('change', ...)` block that adjusts panel height. Replace the height arithmetic:

From:
```javascript
        if (coverLetterCb.checked) {
          this.panel.style.height = (currentHeight + 50) + 'px';
        } else {
          this.panel.style.height = Math.max(325, currentHeight - 50) + 'px';
        }
```

To:
```javascript
        if (coverLetterCb.checked) {
          this.panel.style.height = (currentHeight + 40) + 'px';
        } else {
          this.panel.style.height = Math.max(400, currentHeight - 40) + 'px';
        }
```

- [ ] **Step 4: Update `switchTab()` class selectors**

In `switchTab(tabName)`, find:

```javascript
    const tabs = this.panel.querySelectorAll('.handshake-plus-tab');
    const contents = this.panel.querySelectorAll('.handshake-plus-tab-content');
```

Replace with:

```javascript
    const tabs = this.panel.querySelectorAll('.hsp-tab');
    const contents = this.panel.querySelectorAll('.hsp-tab-content');
```

- [ ] **Step 5: Update `setApplying()` to reference Profile tab**

In `setApplying(isApplying)`, find the two occurrences of:

```javascript
    const filtersTab = this.panel.querySelector('.handshake-plus-tab[data-tab="filters"]');
```

Replace both with:

```javascript
    const filtersTab = this.panel.querySelector('.hsp-tab[data-tab="profile"]');
```

- [ ] **Step 6: Update `toggleMinimize()` class references in CSS rules**

The minimized CSS rules in the new `addStyles()` already use `.hsp-header`, `.hsp-tabs`, `.hsp-body`, and `.hsp-resize` — no JS changes needed here.

- [ ] **Step 7: Update `makeDraggable()` header selector**

In `makeDraggable()`, find:

```javascript
    const header = this.panel.querySelector('.handshake-plus-header');
```

Replace with:

```javascript
    const header = this.panel.querySelector('.hsp-header');
```

- [ ] **Step 8: Update `makeResizable()` resize handle selector**

In `makeResizable()`, find:

```javascript
    const resizeHandle = this.panel.querySelector('#handshake-plus-resize');
```

This ID is unchanged (`id="handshake-plus-resize"` in new HTML, class is `.hsp-resize`), so no change needed.

- [ ] **Step 9: Update `renderSelectedJobRoles()` chip class names**

In `renderSelectedJobRoles()`, the chips HTML uses class names that must match the new CSS. Find:

```javascript
        <span class="selected-role-chip">
          <span title="..."><strong>...</strong></span>
          <button class="clear-selection" data-role-index="..." title="Remove role">×</button>
        </span>
```

Replace with:

```javascript
        <span class="hsp-chip">
          <span title="..."><strong>...</strong></span>
          <button class="hsp-chip-remove" data-role-index="..." title="Remove role">×</button>
        </span>
```

And find:

```javascript
      <button class="clear-all-roles" title="Clear all selected roles">Clear all</button>
```

Replace with:

```javascript
      <button class="hsp-clear-all" title="Clear all selected roles">Clear all</button>
```

Also update the query selectors in the same method:

Find:
```javascript
    selectedDisplay.querySelectorAll('.clear-selection').forEach(btn => {
```
Replace with:
```javascript
    selectedDisplay.querySelectorAll('.hsp-chip-remove').forEach(btn => {
```

Find:
```javascript
    const clearAllBtn = selectedDisplay.querySelector('.clear-all-roles');
```
Replace with:
```javascript
    const clearAllBtn = selectedDisplay.querySelector('.hsp-clear-all');
```

- [ ] **Step 10: Add custom instructions character counter**

In `attachEventListeners()`, after the `customAiInstructionsInput` listener block, add:

```javascript
      // Character counter for custom instructions
      const counterEl = this.panel.querySelector('#hsp-instructions-counter');
      if (counterEl && customAiInstructionsInput) {
        const updateCounter = () => {
          counterEl.textContent = `${customAiInstructionsInput.value.length} / 5000 characters`;
        };
        customAiInstructionsInput.addEventListener('input', updateCounter);
        updateCounter(); // Initial count
      }
```

- [ ] **Step 11: Commit**

```bash
git add panel.js
git commit -m "feat(panel): update JS selectors for new DOM, add hide-promoted toggle"
```

---

## Task 4: Rewrite popup.html

**Files:**
- Modify: `popup.html` — complete markup rewrite

- [ ] **Step 1: Replace the entire `<style>` block and `<body>` content**

Replace everything from `<style>` to `</html>` with:

```html
  <style>
    * { box-sizing: border-box; }
    body {
      width: 320px;
      margin: 0;
      padding: 16px;
      font-family: "Noi Grotesk", system-ui, sans-serif;
      background: #FFFFFF;
      color: #121212;
    }
    .hsp-popup-title {
      font-size: 20px;
      font-weight: 700;
      line-height: 24px;
      letter-spacing: -0.15px;
      margin: 0 0 16px 0;
      color: #121212;
    }
    .hsp-popup-well {
      padding: 12px;
      border: 1px solid rgba(31, 32, 44, 0.2);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .hsp-popup-well:last-child {
      margin-bottom: 0;
    }
    .hsp-popup-label {
      display: block;
      font-size: 15px;
      font-weight: 500;
      line-height: 18px;
      margin-bottom: 8px;
      color: #121212;
    }
    .hsp-popup-input {
      width: 100%;
      padding: 0 12px;
      height: 40px;
      font-family: "Noi Grotesk", system-ui, sans-serif;
      font-size: 15px;
      font-weight: 400;
      line-height: 18px;
      color: #121212;
      background: transparent;
      border: 1px solid rgba(31, 32, 44, 0.2);
      border-radius: 8px;
      transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
    }
    .hsp-popup-input:focus {
      outline: none;
      border-color: #1569E0;
      box-shadow: 0 0 0 2px rgba(21, 105, 224, 0.1);
    }
    .hsp-popup-input::placeholder {
      color: rgba(18, 18, 18, 0.4);
    }
    .hsp-popup-btn {
      display: block;
      width: 100%;
      padding: 0 8px;
      height: 36px;
      background: #FFFFFF;
      color: #121212;
      border: 1px solid rgba(31, 32, 44, 0.2);
      border-radius: 8px;
      font-family: "Noi Grotesk", system-ui, sans-serif;
      font-size: 15px;
      font-weight: 500;
      line-height: 18px;
      cursor: pointer;
      text-align: center;
      transition: background-color 150ms ease-out;
    }
    .hsp-popup-btn:hover {
      background: #F6F6F6;
    }
    .hsp-popup-callout {
      padding: 12px;
      background: #B1F8FF;
      color: #000000;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 400;
      line-height: 18px;
      text-align: center;
    }
    .hsp-popup-divider {
      border: none;
      border-top: 1px solid rgba(31, 32, 44, 0.2);
      margin: 12px 0;
    }
    .hsp-popup-footer {
      font-size: 12px;
      line-height: 1.4;
      color: rgba(18, 18, 18, 0.7);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="hsp-popup-title">🤝 Handshake Plus</div>

  <div id="university-selector" style="display: none;">
    <div class="hsp-popup-well">
      <label for="university-input" class="hsp-popup-label">Select your school to open Handshake:</label>
      <input type="text" id="university-input" list="university-list" placeholder="e.g. Cornell University" class="hsp-popup-input">
      <datalist id="university-list"></datalist>
      <button id="go-to-handshake-btn" class="hsp-popup-btn" style="margin-top: 12px;">Take me to Handshake Jobs</button>
    </div>
  </div>

  <div id="on-handshake-callout" class="hsp-popup-callout" style="display: none;">
    ✓ You're on Handshake. The extension panel is active on this page.
  </div>

  <hr class="hsp-popup-divider">
  <div class="hsp-popup-footer">v5.7.5</div>

  <script src="universities.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

Note: the `<div id="on-handshake-callout">` is NEW markup for when the user is already on Handshake. The existing popup.js does not show any success state — we add it. However, popup.js currently hides `#university-selector` and `#go-to-handshake-btn` when on Handshake. We need popup.js to also show this callout. That's in Task 5.

- [ ] **Step 2: Commit**

```bash
git add popup.html
git commit -m "feat(popup): rewrite popup with DESIGN.md tokens"
```

---

## Task 5: Update popup.js

**Files:**
- Modify: `popup.js` — show/hide the new on-Handshake callout

- [ ] **Step 1: Add callout show/hide logic**

In the `if (isJobSearchPage)` block, after `goBtn.style.display = 'none';`, add:

```javascript
    const callout = document.getElementById('on-handshake-callout');
    if (callout) callout.style.display = 'block';
```

And in the `else` block, after `goBtn.style.display = 'block';`, add:

```javascript
    const callout = document.getElementById('on-handshake-callout');
    if (callout) callout.style.display = 'none';
```

- [ ] **Step 2: Commit**

```bash
git add popup.js
git commit -m "feat(popup): show native callout when on Handshake job search"
```

---

## Task 6: Update content.js — wrap promoted filtering behind toggle

**Files:**
- Modify: `content.js` — make promoted filtering conditional on the new toggle

- [ ] **Step 1: Wrap `autoHidePromotedJobs()` in toggle check**

In `autoHidePromotedJobs()`, at the very top of `tryHide()`, add a guard:

Find:
```javascript
function autoHidePromotedJobs() {
  function tryHide() {
    var cards = findAllJobCards();
    if (cards.length > 0) hidePromotedJobCards(cards);
  }
```

Replace with:
```javascript
function autoHidePromotedJobs() {
  function tryHide() {
    const hidePromoted = localStorage.getItem('handshake-plus-hide-promoted');
    if (hidePromoted === 'false') return;
    var cards = findAllJobCards();
    if (cards.length > 0) hidePromotedJobCards(cards);
  }
```

- [ ] **Step 2: Wrap promoted filtering in `processPage()` in toggle check**

In `processPage()`, find:

```javascript
  // Remove promoted jobs from the queue and hide them visually
  hidePromotedJobCards(jobCards);
  const newJobCards = [];
  for (const card of jobCards) {
    if (!isPromotedJob(card)) {
      newJobCards.push(card);
    }
  }
  const promotedCount = jobCards.length - newJobCards.length;
  jobCards = newJobCards;
  if (promotedCount > 0) {
    // console.log(`Content: Filtered out ${promotedCount} promoted job(s)`);
  }

  if (jobCards.length === 0) {
    // All jobs on this page were promoted, move to next page
```

Replace with:

```javascript
  // Remove promoted jobs from the queue and hide them visually
  const hidePromoted = localStorage.getItem('handshake-plus-hide-promoted');
  if (hidePromoted !== 'false') {
    hidePromotedJobCards(jobCards);
    const newJobCards = [];
    for (const card of jobCards) {
      if (!isPromotedJob(card)) {
        newJobCards.push(card);
      }
    }
    const promotedCount = jobCards.length - newJobCards.length;
    jobCards = newJobCards;
    if (promotedCount > 0) {
      // console.log(`Content: Filtered out ${promotedCount} promoted job(s)`);
    }
  }

  if (jobCards.length === 0) {
    // All jobs on this page were promoted (or filtered), move to next page
```

- [ ] **Step 3: Commit**

```bash
git add content.js
git commit -m "feat(content): make promoted job filtering toggleable, default ON"
```

---

## Task 7: Integration Verification

**Files:** None (manual browser testing)

- [ ] **Step 1: Launch Playwright browser with extension loaded**

```bash
rm -rf /tmp/handshake-plus-profile
node -e "
const { chromium } = require('/home/chimn/.local/lib/node_modules/@playwright/cli/node_modules/playwright-core');
const context = await chromium.launchPersistentContext('/tmp/handshake-plus-profile', {
  headless: false,
  executablePath: '/home/chimn/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
  args: ['--disable-extensions-except=/mnt/c/Users/chimn/Documents/HandShaker', '--load-extension=/mnt/c/Users/chimn/Documents/HandShaker']
});
"
```

- [ ] **Step 2: Verify popup renders correctly**

1. Click the extension icon in the toolbar.
2. **Expected:** White popup, 320px wide, "🤝 Handshake Plus" title in Noi Grotesk, university selector with hairline-bordered input, "Take me to Handshake Jobs" button as white secondary button.
3. Type a university name. **Expected:** Top 5 matches appear in datalist.

- [ ] **Step 3: Navigate to Handshake and verify popup callout**

```bash
playwright-cli goto "https://app.joinhandshake.com/job-search?query=%20"
```

Click the extension icon. **Expected:** Popup shows cyan callout "✓ You're on Handshake. The extension panel is active on this page." University selector and button are hidden.

- [ ] **Step 4: Verify panel appears on Handshake**

```bash
playwright-cli snapshot
```

Look for the panel in the top-right. **Expected:** White panel with hairline border, 8px radius, "🤝 Handshake Plus" title, three tabs (Apply / Profile / Settings), clean flat header.

- [ ] **Step 5: Verify all 3 tabs switch correctly**

In the Playwright console or by evaluating JS:

```bash
playwright-cli eval "document.querySelector('.hsp-tab[data-tab=\"profile\"]').click()"
playwright-cli snapshot
```

**Expected:** Profile tab becomes active (grey fill), Profile content shows (Resume upload, Contact Info wells). No errors in console.

```bash
playwright-cli eval "document.querySelector('.hsp-tab[data-tab=\"settings\"]').click()"
playwright-cli snapshot
```

**Expected:** Settings tab active, shows AI Provider segmented control, Custom Instructions textarea, Aggressive Mode warning well.

```bash
playwright-cli eval "document.querySelector('.hsp-tab[data-tab=\"apply\"]').click()"
```

**Expected:** Back to Apply tab.

- [ ] **Step 6: Verify hide-promoted toggle**

In the Apply tab, check that "Hide promoted listings" checkbox is checked by default.

Uncheck it. Refresh the page. Check again. **Expected:** Toggle persists its state.

- [ ] **Step 7: Verify minimize/restore**

```bash
playwright-cli eval "document.getElementById('handshake-plus-minimize').click()"
playwright-cli snapshot
```

**Expected:** Panel collapses to header-only pill. Click again to restore.

- [ ] **Step 8: Verify drag and resize**

Drag the header to move the panel. Drag the bottom-left resize handle. **Expected:** Panel moves and resizes smoothly.

- [ ] **Step 9: Verify resume upload and form reveal**

This requires manual interaction or simulated file input. At minimum, verify that clicking "Choose File" opens the file picker (browser security may prevent automation here).

- [ ] **Step 10: Check console for errors**

```bash
playwright-cli console
```

**Expected:** No errors related to `handshake-plus-panel`, querySelector failures, or missing elements.

- [ ] **Step 11: Close browser**

```bash
playwright-cli close
```

- [ ] **Step 12: Final commit**

```bash
git add -A
git commit -m "chore: verify premium UI overhaul in Playwright"
```

---

## Spec Coverage Self-Review

| Spec Requirement | Plan Task |
|---|---|
| Noi Grotesk font everywhere | Task 1 (CSS), Task 4 (popup styles) |
| White surfaces, hairline borders | Task 1 (CSS), Task 2 (HTML), Task 4 (popup) |
| 8px default radius | Task 1 (CSS `border-radius: 8px` throughout) |
| No heavy shadows | Task 1 (no `box-shadow` except minimal focus rings) |
| 3-tab panel (Apply/Profile/Settings) | Task 2 (HTML), Task 3 (JS selectors) |
| Apply tab wells: Status, Actions, Job Filters, Progress, AI Cover Letter | Task 2 (HTML) |
| Profile tab wells: Resume, Contact Info, Screening Facts | Task 2 (HTML) |
| Settings tab wells: AI Provider, Custom Instructions, Aggressive Mode | Task 2 (HTML) |
| Hide promoted listings toggle (default ON) | Task 2 (HTML checkbox), Task 3 (listener), Task 6 (content.js) |
| Segmented controls for AI provider | Task 1 (CSS `.hsp-segmented`), Task 2 (HTML) |
| Minimize/restore with clean header | Task 1 (CSS minimized rules), Task 3 (no JS changes needed) |
| Drag via header | Task 3 (Step 7: `.hsp-header` selector) |
| Resize handle | Task 1 (CSS `.hsp-resize`), Task 2 (HTML) |
| Popup redesign with white card, hairline border | Task 4 |
| Cyan callout when on Handshake | Task 4 (HTML), Task 5 (JS show/hide) |
| Character counter for custom instructions | Task 3 (Step 10) |
| Quiet motion (150ms transitions) | Task 1 (all transitions set to 150ms ease-out) |

**Placeholder scan:** No TBD, TODO, or vague instructions. All code is concrete.

**Type consistency:** CSS class names `.hsp-*` used consistently. ID names preserved where JS queries them.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-17-premium-ui-overhaul.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints

Which approach would you like?