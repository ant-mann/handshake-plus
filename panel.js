// Floating panel that gets injected into Handshake page
// console.log('Handshake Plus: panel.js loading...');

class HandshakePlusPanel {
  constructor() {
    this.isMinimized = false;
    this.appliedCount = 0;
    this.isApplying = false;
    this.previousPanelHeight = null;
    this.autoExpandedForApplying = false;
    this.createPanel();
  }

  createPanel() {
    // Create container
    this.panel = document.createElement('div');
    this.panel.id = 'handshake-plus-panel';
    this.panel.innerHTML = `
      <div class="hsp-header">
        <span class="hsp-header-title"><span class="hsp-brand-dot"></span>🤝 Handshake Plus</span>
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
        <div id="handshake-plus-warning-banner" style="display:none; margin:8px; padding:10px 12px; background:#3a1d1d; border:1px solid #a33; border-radius:8px; color:#ffd7d7; font-size:13px; line-height:1.4;">
          <span id="handshake-plus-warning-text"></span>
          <button id="handshake-plus-warning-dismiss" type="button" aria-label="Dismiss warning" style="float:right; background:none; border:none; color:#ffd7d7; cursor:pointer; font-size:15px; line-height:1;">×</button>
        </div>
        <div class="hsp-tab-content active" id="apply-content">
          <div class="hsp-well">
            <div class="hsp-status" id="handshake-plus-status"><span class="hsp-status-dot"></span><span class="hsp-status-text">Ready to apply</span></div>
          </div>
          <div class="hsp-well">
            <div class="hsp-buttons">
              <button id="handshake-plus-start" class="hsp-btn">Start Applying</button>
              <button id="handshake-plus-stop" class="hsp-btn hsp-btn-danger" style="display: none;">Stop</button>
            </div>
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
            
          </div>
          <div class="hsp-well">
            <div class="hsp-well-title">Job Filters</div>
            <label class="hsp-checkbox-row">
              <input type="checkbox" id="handshake-plus-hide-promoted" checked>
              <span>Hide promoted listings</span>
            </label>
            <div class="hsp-caption" style="margin-left: 24px; margin-bottom: 10px;">Skip employer-paid placements during auto-apply</div>
            <label class="hsp-checkbox-row">
              <input type="checkbox" id="handshake-plus-hide-after-apply">
              <span>Hide jobs after applying</span>
            </label>
            <div class="hsp-caption" style="margin-left: 24px; margin-bottom: 10px;">Remove successfully applied jobs from the visible list</div>
            <label class="hsp-checkbox-row">
              <input type="checkbox" id="handshake-plus-ai-job-fit">
              <span>Enable AI job-fit filter</span>
            </label>
            <div class="hsp-caption" style="margin-left: 24px; margin-bottom: 10px;">Evaluate each visible page of jobs against your resume before applying</div>
            <label class="hsp-field" style="margin-bottom: 0;">
              <span class="hsp-field-label">AI filter instructions</span>
              <textarea id="handshake-plus-ai-job-fit-instructions" class="hsp-input hsp-textarea" placeholder="Optional: describe how strict or flexible the filter should be, e.g. prefer software roles, include adjacent data roles, skip sales or unpaid jobs" maxlength="1500"></textarea>
            </label>
            <div class="hsp-caption" id="hsp-ai-job-fit-counter">0 / 1500 characters</div>
          </div>
          <div class="hsp-note">Submits your most recently uploaded transcript and/or resume on Handshake</div>

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
              <label class="hsp-segment"><input type="radio" name="handshake-plus-ai-provider" id="handshake-plus-provider-claude" value="claude"> Claude</label>
              <label class="hsp-segment active"><input type="radio" name="handshake-plus-ai-provider" id="handshake-plus-provider-gemini" value="gemini" checked> Gemini</label>
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
          <div class="hsp-well">
            <div class="hsp-well-title">Safety &amp; Limits</div>
            <label class="hsp-field">
              <span class="hsp-field-label">Daily application cap (0 = no limit)</span>
              <input type="number" min="0" id="handshake-plus-daily-cap" class="hsp-input" placeholder="0">
            </label>
            <label class="hsp-field">
              <span class="hsp-field-label">Delay between applies (seconds)</span>
              <span style="display:flex; gap:8px;">
                <input type="number" min="0" id="handshake-plus-delay-min" class="hsp-input" placeholder="min (4)">
                <input type="number" min="0" id="handshake-plus-delay-max" class="hsp-input" placeholder="max (9)">
              </span>
            </label>
            <label class="hsp-checkbox-row">
              <input type="checkbox" id="handshake-plus-dry-run">
              <span>Dry run — open &amp; fill, but never submit</span>
            </label>
            <label class="hsp-checkbox-row">
              <input type="checkbox" id="handshake-plus-debug">
              <span>Debug logging (verbose console output)</span>
            </label>
            <div class="hsp-caption">Cap stops the run at N applications/day. A randomized delay between submissions is more human-like. Dry run tests the flow without submitting.</div>
          </div>
          <div class="hsp-well">
            <div class="hsp-well-title">Document Font</div>
            <label class="hsp-field" style="margin-bottom: 0;">
              <span class="hsp-field-label">Default font for cover letters &amp; documents</span>
              <select id="handshake-plus-default-font" class="hsp-input">
                <option value="Calibri">Calibri</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Cambria">Cambria</option>
                <option value="Garamond">Garamond</option>
                <option value="Trebuchet MS">Trebuchet MS</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
              </select>
            </label>
            <div class="hsp-caption">Used when generating RTF cover letters and required documents.</div>
          </div>
        </div>
      </div>
      <div class="hsp-resize" id="handshake-plus-resize"></div>
    `;

    // Add styles
    this.addStyles();

    // Append to body
    document.body.appendChild(this.panel);

    // Set initial height to prevent auto-resizing when switching tabs
    this.panel.style.height = '400px';

    // Add event listeners
    this.attachEventListeners();

    // Make draggable
    this.makeDraggable();

    // Make resizable
    this.makeResizable();

    // Surface selector health warnings (e.g. Handshake/Claude/Gemini UI changed).
    this.setupSelectorWarning();
  }

  setupSelectorWarning() {
    const WARN_KEY = (globalThis.HandshakePlusSelectors && globalThis.HandshakePlusSelectors.WARNING_KEY) || 'handshake-plus-selector-warning';
    const banner = this.panel.querySelector('#handshake-plus-warning-banner');
    const textEl = this.panel.querySelector('#handshake-plus-warning-text');
    const dismiss = this.panel.querySelector('#handshake-plus-warning-dismiss');
    if (!banner || !textEl) return;

    const surfaceLabel = (s) => {
      if (!s) return 'A site';
      if (s.startsWith('handshake')) return 'Handshake';
      if (s.startsWith('claude')) return 'Claude';
      if (s.startsWith('gemini')) return 'Gemini';
      return s;
    };
    const render = (rec) => {
      if (rec && rec.surface) {
        textEl.textContent = `⚠️ ${surfaceLabel(rec.surface)}'s page may have changed (couldn't find "${rec.surface}"). The extension might be out of date — try reloading it, or report the issue.`;
        banner.style.display = 'block';
      } else {
        banner.style.display = 'none';
      }
    };

    try {
      chrome.storage.local.get(WARN_KEY, (r) => render(r[WARN_KEY]));
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[WARN_KEY]) render(changes[WARN_KEY].newValue);
      });
    } catch (e) {}

    if (dismiss) {
      dismiss.addEventListener('click', () => {
        banner.style.display = 'none';
        try { chrome.storage.local.remove(WARN_KEY); } catch (e) {}
      });
    }
  }

  addStyles() {
    if (document.getElementById('handshake-plus-styles')) return;

    const style = document.createElement('style');
    style.id = 'handshake-plus-styles';
    style.textContent = `
      #handshake-plus-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 360px;
        min-height: 200px;
        max-height: 600px;
        background: #FFFFFF;
        border: 1px solid rgba(31, 32, 44, 0.2);
        border-top: 2px solid #052326;
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
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .hsp-brand-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #D3FB52;
        display: inline-block;
        flex-shrink: 0;
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
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .hsp-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #327D0F;
        display: inline-block;
        flex-shrink: 0;
        opacity: 0;
        transition: opacity 300ms ease-out;
      }

      .hsp-status-dot.pulse {
        opacity: 1;
        animation: hsp-pulse 2s ease-in-out infinite;
      }

      .hsp-status.error .hsp-status-dot {
        background: #BB3643;
        opacity: 1;
      }

      @keyframes hsp-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.85); }
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
    `;;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    // Tab switching
    const tabs = this.panel.querySelectorAll('.hsp-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

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

    const hideAfterApplyCb = this.panel.querySelector('#handshake-plus-hide-after-apply');
    if (hideAfterApplyCb) {
      const savedHideAfterApply = localStorage.getItem('handshake-plus-hide-after-apply');
      hideAfterApplyCb.checked = savedHideAfterApply === 'true';
      hideAfterApplyCb.addEventListener('change', () => {
        localStorage.setItem('handshake-plus-hide-after-apply', hideAfterApplyCb.checked);
      });
    }

    const aiJobFitCb = this.panel.querySelector('#handshake-plus-ai-job-fit');
    if (aiJobFitCb) {
      const savedAiJobFit = localStorage.getItem('handshake-plus-ai-job-fit-enabled');
      aiJobFitCb.checked = savedAiJobFit === 'true';
      aiJobFitCb.addEventListener('change', () => {
        localStorage.setItem('handshake-plus-ai-job-fit-enabled', aiJobFitCb.checked ? 'true' : 'false');
      });
    }

    const aiJobFitInstructionsInput = this.panel.querySelector('#handshake-plus-ai-job-fit-instructions');
    if (aiJobFitInstructionsInput) {
      const counterEl = this.panel.querySelector('#hsp-ai-job-fit-counter');
      const updateCounter = () => {
        if (counterEl) {
          counterEl.textContent = `${aiJobFitInstructionsInput.value.length} / 1500 characters`;
        }
      };
      aiJobFitInstructionsInput.addEventListener('input', () => {
        chrome.storage.local.set({ handshakePlusAiJobFitInstructions: aiJobFitInstructionsInput.value.trim() });
        updateCounter();
      });
      updateCounter();
    }

    // Filter checkboxes - save state on change
    const filterCheckboxes = this.panel.querySelectorAll('.filter-checkbox');
    filterCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.saveFilterStates();
      });
    });

    // Contact Info Inputs - save state on change
    const contactFullName = this.panel.querySelector('#contact-full-name');
    const contactEmail = this.panel.querySelector('#contact-email');
    const contactPhone = this.panel.querySelector('#contact-phone');
    const contactLocation = this.panel.querySelector('#contact-location');
    const screeningLanguages = this.panel.querySelector('#screening-languages');
    const screeningRelocationLocations = this.panel.querySelector('#screening-relocation-locations');
    const screeningWorkAuthorization = this.panel.querySelector('#screening-work-authorization');
    const screeningSponsorship = this.panel.querySelector('#screening-sponsorship');
    [contactFullName, contactEmail, contactPhone, contactLocation].forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          chrome.storage.local.set({
            contactFullName: contactFullName.value,
            contactEmail: contactEmail.value,
            contactPhone: contactPhone.value,
            contactLocation: contactLocation.value
          });
        });
      }
    });
    [screeningLanguages, screeningRelocationLocations, screeningWorkAuthorization, screeningSponsorship].forEach(input => {
      if (input) {
        input.addEventListener('input', () => this.saveScreeningFacts());
        input.addEventListener('change', () => this.saveScreeningFacts());
      }
    });

    // Cover letter & Manual Review checkboxes - save state to localStorage
    const coverLetterCb = this.panel.querySelector('#handshake-plus-cover-letter');
    const manualReviewWrapper = this.panel.querySelector('#handshake-plus-manual-review-wrapper');
    const manualReviewCb = this.panel.querySelector('#handshake-plus-manual-review');

    const providerClaudeRadio = this.panel.querySelector('#handshake-plus-provider-claude');
    const providerGeminiRadio = this.panel.querySelector('#handshake-plus-provider-gemini');
    const claudeUrlInput = this.panel.querySelector('#handshake-plus-claude-url');
    const geminiUrlInput = this.panel.querySelector('#handshake-plus-gemini-url');
    const customAiInstructionsInput = this.panel.querySelector('#handshake-plus-custom-ai-instructions');

    if (coverLetterCb && manualReviewCb) {
      // Cover Letter check state is dynamically restored exclusively via loadFilterStates() now.

      const savedManualState = localStorage.getItem('handshake-plus-manual-review-enabled');
      if (savedManualState !== null) {
        manualReviewCb.checked = savedManualState === 'true';
      }

      // Restore provider preference
      const savedProvider = localStorage.getItem('handshake-plus-ai-provider') || 'gemini';
      if (providerGeminiRadio) providerGeminiRadio.checked = savedProvider === 'gemini';
      if (providerClaudeRadio) providerClaudeRadio.checked = savedProvider === 'claude';

      // Sync display instantly
      manualReviewWrapper.style.display = coverLetterCb.checked ? 'block' : 'none';
      if (coverLetterCb.checked && this.panel.style.height === '400px') {
        this.panel.style.height = '440px'; // Adjust initial baseline height
      }

      if (providerClaudeRadio) providerClaudeRadio.addEventListener('change', () => { localStorage.setItem('handshake-plus-ai-provider', 'claude'); });
      if (providerGeminiRadio) providerGeminiRadio.addEventListener('change', () => { localStorage.setItem('handshake-plus-ai-provider', 'gemini'); });
      if (claudeUrlInput) {
        claudeUrlInput.addEventListener('change', () => {
          chrome.storage.local.set({ handshakePlusClaudeUrl: claudeUrlInput.value.trim() });
        });
      }
      if (geminiUrlInput) {
        geminiUrlInput.addEventListener('change', () => {
          chrome.storage.local.set({ handshakePlusGeminiUrl: geminiUrlInput.value.trim() });
        });
      }
      if (customAiInstructionsInput) {
        customAiInstructionsInput.addEventListener('input', () => {
          chrome.storage.local.set({ handshakePlusCustomAiInstructions: customAiInstructionsInput.value.trim() });
        });
        // Character counter
        const counterEl = this.panel.querySelector('#hsp-instructions-counter');
        if (counterEl) {
          const updateCounter = () => {
            counterEl.textContent = `${customAiInstructionsInput.value.length} / 5000 characters`;
          };
          customAiInstructionsInput.addEventListener('input', updateCounter);
          updateCounter();
        }
      }

      // Aggressive mode toggle
      const aggressiveModeCb = this.panel.querySelector('#handshake-plus-aggressive-mode');
      if (aggressiveModeCb) {
        const savedAggressive = localStorage.getItem('handshake-plus-aggressive-mode');
        if (savedAggressive !== null) {
          aggressiveModeCb.checked = savedAggressive === 'true';
        }
        aggressiveModeCb.addEventListener('change', () => {
          localStorage.setItem('handshake-plus-aggressive-mode', aggressiveModeCb.checked);
        });
      }

      // Safety & Limits
      // Daily cap lives in chrome.storage.local so the background worker can read it.
      const dailyCapInput = this.panel.querySelector('#handshake-plus-daily-cap');
      if (dailyCapInput) {
        chrome.storage.local.get('handshake-plus-daily-cap', (r) => {
          const v = r['handshake-plus-daily-cap'];
          if (v !== undefined && v !== null) dailyCapInput.value = v;
        });
        dailyCapInput.addEventListener('change', () => {
          const n = Math.max(0, Math.floor(Number(dailyCapInput.value) || 0));
          dailyCapInput.value = n || '';
          chrome.storage.local.set({ 'handshake-plus-daily-cap': n });
        });
      }

      const delayMinInput = this.panel.querySelector('#handshake-plus-delay-min');
      const delayMaxInput = this.panel.querySelector('#handshake-plus-delay-max');
      [['handshake-plus-delay-min', delayMinInput], ['handshake-plus-delay-max', delayMaxInput]].forEach(([key, input]) => {
        if (!input) return;
        const saved = localStorage.getItem(key);
        if (saved !== null) input.value = saved;
        input.addEventListener('change', () => {
          const n = Math.max(0, Math.floor(Number(input.value) || 0));
          input.value = String(n);
          localStorage.setItem(key, String(n));
        });
      });

      const dryRunCb = this.panel.querySelector('#handshake-plus-dry-run');
      if (dryRunCb) {
        dryRunCb.checked = localStorage.getItem('handshake-plus-dry-run') === 'true';
        dryRunCb.addEventListener('change', () => {
          localStorage.setItem('handshake-plus-dry-run', dryRunCb.checked ? 'true' : 'false');
        });
      }

      // Debug flag is read by page context (localStorage) and the worker (chrome.storage) — set both.
      const debugCb = this.panel.querySelector('#handshake-plus-debug');
      if (debugCb) {
        debugCb.checked = localStorage.getItem('handshake-plus-debug') === 'true';
        debugCb.addEventListener('change', () => {
          const on = debugCb.checked;
          localStorage.setItem('handshake-plus-debug', on ? 'true' : 'false');
          chrome.storage.local.set({ 'handshake-plus-debug': on });
          try { if (window.HandshakePlusLog) window.HandshakePlusLog.setEnabled(on); } catch (e) {}
        });
      }

      // Default font selector
      const defaultFontSelect = this.panel.querySelector('#handshake-plus-default-font');
      if (defaultFontSelect) {
        defaultFontSelect.addEventListener('change', () => {
          chrome.storage.local.set({ 'handshake-plus-default-font': defaultFontSelect.value });
        });
      }

      coverLetterCb.addEventListener('click', (e) => {
        const removeBtn = this.panel.querySelector('#resume-remove-btn');
        const hasResume = removeBtn && removeBtn.style.display !== 'none';

        if (!hasResume) {
          e.preventDefault();
          const statusEl = this.panel.querySelector('#handshake-plus-status');
          if (statusEl) {
            statusEl.textContent = '⚠️ Please upload resume in Profile first';
            statusEl.className = 'hsp-status error';
          }
        }
      });

      coverLetterCb.addEventListener('change', () => {
        localStorage.setItem('handshake-plus-cover-letter-enabled', coverLetterCb.checked);
        manualReviewWrapper.style.display = coverLetterCb.checked ? 'block' : 'none';

        const currentHeight = parseInt(this.panel.style.height) || this.panel.offsetHeight;
        if (coverLetterCb.checked) {
          this.panel.style.height = (currentHeight + 40) + 'px';
        } else {
          this.panel.style.height = Math.max(400, currentHeight - 40) + 'px';
        }
      });

      manualReviewCb.addEventListener('change', () => {
        localStorage.setItem('handshake-plus-manual-review-enabled', manualReviewCb.checked);
      });
    }

    // Resume upload functionality
    const resumeUploadBtn = this.panel.querySelector('#resume-upload-btn');
    const resumeRemoveBtn = this.panel.querySelector('#resume-remove-btn');
    const resumeUploadInput = this.panel.querySelector('#resume-upload');
    const resumeFileName = this.panel.querySelector('#resume-file-name');

    if (resumeRemoveBtn) {
      resumeRemoveBtn.addEventListener('click', async () => {
        await chrome.storage.local.remove(['resumeText', 'resumeSummary', 'resumeFileName', 'resumeUploadDate', 'resumeRawMode']);
        if (resumeFileName) {
          resumeFileName.textContent = 'No file chosen';
        }

        const formContainer = this.panel.querySelector('#filters-form-container');
        const statusEl = this.panel.querySelector('#resume-status');
        const coverLetterCb = this.panel.querySelector('#handshake-plus-cover-letter');
        
        if (coverLetterCb) {
          coverLetterCb.checked = false;
          localStorage.setItem('handshake-plus-cover-letter-enabled', 'false');
          coverLetterCb.dispatchEvent(new Event('change'));
        }
        
        if (formContainer) {
          formContainer.style.display = 'none';
        }

        if (statusEl) {
          statusEl.textContent = '';
          statusEl.className = 'hsp-status-inline';
        }
        
        resumeRemoveBtn.style.display = 'none';
        if (resumeUploadBtn) resumeUploadBtn.style.display = 'inline-block';
        
        // Explictly wipe the DOM input values so they visually reset
        ['#contact-full-name', '#contact-email', '#contact-location', '#contact-phone'].forEach(id => {
          const el = this.panel.querySelector(id);
          if (el) el.value = '';
        });
        
        // Force the cleared states straight into Chrome Storage to prevent ghosts!
        this.saveFilterStates();
        
        if (resumeUploadInput) resumeUploadInput.value = '';
      });
    }

    if (resumeUploadBtn && resumeUploadInput) {
      // Trigger file input when button is clicked
      resumeUploadBtn.addEventListener('click', () => {
        resumeUploadInput.click();
      });

      // Handle file selection
      resumeUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          resumeFileName.textContent = file.name;
          await this.handleResumeUpload(file);
        }
      });
    }

    // Persist raw resume toggle state on change
    const rawResumeCheckbox = this.panel.querySelector('#handshake-plus-raw-resume');
    if (rawResumeCheckbox) {
      rawResumeCheckbox.addEventListener('change', () => {
        localStorage.setItem('handshake-plus-raw-resume', rawResumeCheckbox.checked ? 'true' : 'false');
      });
    }

    // Load saved filter states
    this.loadFilterStates();

    // Minimize button
    this.panel.querySelector('#handshake-plus-minimize').addEventListener('click', () => {
      this.toggleMinimize();
    });

    // Start button
    this.panel.querySelector('#handshake-plus-start').addEventListener('click', () => {
      this.onStart();
    });

    // Stop button
    this.panel.querySelector('#handshake-plus-stop').addEventListener('click', () => {
      this.onStop();
    });
  }

  makeDraggable() {
    const header = this.panel.querySelector('.hsp-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      initialX = e.clientX - this.panel.offsetLeft;
      initialY = e.clientY - this.panel.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        // Get panel dimensions
        const panelRect = this.panel.getBoundingClientRect();
        const panelWidth = panelRect.width;
        const panelHeight = panelRect.height;

        // Set boundaries - keep panel within viewport
        const minX = 0;
        const minY = 0; // Prevent going above top of viewport
        const maxX = window.innerWidth - panelWidth;
        const maxY = window.innerHeight - panelHeight;

        // Constrain position within boundaries
        currentX = Math.max(minX, Math.min(currentX, maxX));
        currentY = Math.max(minY, Math.min(currentY, maxY));

        this.panel.style.left = currentX + 'px';
        this.panel.style.top = currentY + 'px';
        this.panel.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  makeResizable() {
    const resizeHandle = this.panel.querySelector('#handshake-plus-resize');
    let isResizing = false;
    let startX;
    let startY;
    let startWidth;
    let startHeight;
    let startLeft;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = this.panel.offsetWidth;
      startHeight = this.panel.offsetHeight;
      startLeft = this.panel.offsetLeft;
      e.stopPropagation(); // Prevent dragging the panel
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (isResizing) {
        e.preventDefault();

        // Calculate new dimensions
        // Moving left increases width (negative delta increases width)
        const deltaX = startX - e.clientX;
        // Moving down increases height (positive delta increases height)
        const deltaY = e.clientY - startY;

        let newWidth = startWidth + deltaX;
        let newHeight = startHeight + deltaY;

        // Set minimum and maximum constraints
        const minWidth = 320;
        const maxWidth = 600;
        const minHeight = 200;
        const maxHeight = 800;

        newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

        this.panel.style.width = newWidth + 'px';
        this.panel.style.height = newHeight + 'px';

        // Adjust position to keep top-right corner fixed
        // The right edge should stay at: startLeft + startWidth
        const rightEdge = startLeft + startWidth;
        const newLeft = rightEdge - newWidth;
        this.panel.style.left = newLeft + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.panel.classList.toggle('minimized');

    const minimizeBtn = this.panel.querySelector('#handshake-plus-minimize');
    minimizeBtn.textContent = this.isMinimized ? '+' : '−';
    minimizeBtn.title = this.isMinimized ? 'Maximize' : 'Minimize';
  }

  switchTab(tabName) {
    // Check if the tab we're trying to switch to is disabled
    const selectedTab = this.panel.querySelector(`.hsp-tab[data-tab="${tabName}"]`);
    if (selectedTab && selectedTab.disabled) {
      return; // Don't switch to disabled tabs
    }

    // Remove active class from all tabs and contents
    const tabs = this.panel.querySelectorAll('.hsp-tab');
    const contents = this.panel.querySelectorAll('.hsp-tab-content');

    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    const selectedContent = this.panel.querySelector(`#${tabName}-content`);

    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');
  }

  show() {
    this.panel.style.display = 'block';
  }

  hide() {
    this.panel.style.display = 'none';
  }

  updateStatus(text, isActive = false) {
    const statusEl = this.panel.querySelector('#handshake-plus-status');
    const textEl = statusEl.querySelector('.hsp-status-text');
    const dotEl = statusEl.querySelector('.hsp-status-dot');
    if (textEl) textEl.textContent = text;
    if (isActive) {
      statusEl.classList.add('active');
      if (dotEl) dotEl.classList.add('pulse');
    } else {
      statusEl.classList.remove('active');
      if (dotEl) dotEl.classList.remove('pulse');
    }
  }

  updateProgress(count) {
    this.appliedCount = count;
    const progressEl = this.panel.querySelector('#handshake-plus-progress');
    const countEl = this.panel.querySelector('#handshake-plus-count');

    if (countEl) {
      countEl.textContent = `${count}`;
    }

    progressEl.style.display = 'block';
  }

  setApplying(isApplying) {
    this.isApplying = isApplying;
    const startBtn = this.panel.querySelector('#handshake-plus-start');
    const stopBtn = this.panel.querySelector('#handshake-plus-stop');
    const filtersTab = this.panel.querySelector('.hsp-tab[data-tab="profile"]');
    const applyingMinHeight = 400;

    if (isApplying) {
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      this.updateStatus('Applying to jobs...', true);

      // When progress/count UI is visible, ensure the panel is tall enough to avoid clipping.
      if (!this.isMinimized && this.panel.offsetHeight < applyingMinHeight) {
        this.previousPanelHeight = this.panel.style.height || `${this.panel.offsetHeight}px`;
        this.panel.style.height = `${applyingMinHeight}px`;
        this.autoExpandedForApplying = true;
      }

      // Disable filters tab and switch to Apply tab if currently on Filters
      if (filtersTab) {
        filtersTab.disabled = true;
        filtersTab.classList.add('disabled');

        // If currently on filters tab, switch to apply tab
        if (filtersTab.classList.contains('active')) {
          this.switchTab('apply');
        }
      }

      // Lock AI Cover Letter toggles during execution
      const coverLetterCb = this.panel.querySelector('#handshake-plus-cover-letter');
      const manualReviewCb = this.panel.querySelector('#handshake-plus-manual-review');
      const claudeUrlInput = this.panel.querySelector('#handshake-plus-claude-url');
      const geminiUrlInput = this.panel.querySelector('#handshake-plus-gemini-url');
      const customAiInstructionsInput = this.panel.querySelector('#handshake-plus-custom-ai-instructions');
      const aiJobFitCb = this.panel.querySelector('#handshake-plus-ai-job-fit');
      const aiJobFitInstructionsInput = this.panel.querySelector('#handshake-plus-ai-job-fit-instructions');
      if (coverLetterCb) coverLetterCb.disabled = true;
      if (manualReviewCb) manualReviewCb.disabled = true;
      if (claudeUrlInput) claudeUrlInput.disabled = true;
      if (geminiUrlInput) geminiUrlInput.disabled = true;
      if (customAiInstructionsInput) customAiInstructionsInput.disabled = true;
      if (aiJobFitCb) aiJobFitCb.disabled = true;
      if (aiJobFitInstructionsInput) aiJobFitInstructionsInput.disabled = true;
    } else {
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      this.updateStatus('Ready to apply', false);

      // Restore previous height only if this method auto-expanded the panel.
      if (this.autoExpandedForApplying && this.previousPanelHeight) {
        this.panel.style.height = this.previousPanelHeight;
      }

      this.previousPanelHeight = null;
      this.autoExpandedForApplying = false;

      // Enable filters tab
      if (filtersTab) {
        filtersTab.disabled = false;
        filtersTab.classList.remove('disabled');
      }

      // Unlock AI Cover Letter toggles post-execution
      const coverLetterCb = this.panel.querySelector('#handshake-plus-cover-letter');
      const manualReviewCb = this.panel.querySelector('#handshake-plus-manual-review');
      const claudeUrlInput = this.panel.querySelector('#handshake-plus-claude-url');
      const geminiUrlInput = this.panel.querySelector('#handshake-plus-gemini-url');
      const customAiInstructionsInput = this.panel.querySelector('#handshake-plus-custom-ai-instructions');
      const aiJobFitCb = this.panel.querySelector('#handshake-plus-ai-job-fit');
      const aiJobFitInstructionsInput = this.panel.querySelector('#handshake-plus-ai-job-fit-instructions');
      if (coverLetterCb) coverLetterCb.disabled = false;
      if (manualReviewCb) manualReviewCb.disabled = false;
      if (claudeUrlInput) claudeUrlInput.disabled = false;
      if (geminiUrlInput) geminiUrlInput.disabled = false;
      if (customAiInstructionsInput) customAiInstructionsInput.disabled = false;
      if (aiJobFitCb) aiJobFitCb.disabled = false;
      if (aiJobFitInstructionsInput) aiJobFitInstructionsInput.disabled = false;
    }
  }

  onStart() {
    // This will be set by content.js
  }

  onStop() {
    // This will be set by content.js
  }

  saveFilterStates() {
    const states = {
      degree: this.panel.querySelector('#filter-degree')?.checked || false,
      major: this.panel.querySelector('#filter-major')?.checked || false,
      gradDate: this.panel.querySelector('#filter-grad-date')?.checked || false,
      internship: this.panel.querySelector('#filter-internship')?.checked || false,
      fulltimeJob: this.panel.querySelector('#filter-fulltime-job')?.checked || false,
      employmentFulltime: this.panel.querySelector('#filter-employment-fulltime')?.checked || false,
      employmentParttime: this.panel.querySelector('#filter-employment-parttime')?.checked || false,
      remote: this.panel.querySelector('#filter-remote')?.checked || false,
      hybrid: this.panel.querySelector('#filter-hybrid')?.checked || false,
      onsite: this.panel.querySelector('#filter-onsite')?.checked || false,
      visaSponsorship: this.panel.querySelector('#filter-visa-sponsorship')?.checked || false,
      noUSWork: this.panel.querySelector('#filter-no-us-work')?.checked || false
    };

    chrome.storage.local.set({ filterStates: states });
    
    // Concurrently persist contact info
    chrome.storage.local.set({
      contactFullName: this.panel.querySelector('#contact-full-name')?.value || '',
      contactEmail: this.panel.querySelector('#contact-email')?.value || '',
      contactPhone: this.panel.querySelector('#contact-phone')?.value || '',
      contactLocation: this.panel.querySelector('#contact-location')?.value || ''
    });
    this.saveScreeningFacts();
  }

  saveScreeningFacts() {
    chrome.storage.local.set({
      handshakePlusScreeningFacts: {
        languages: this.panel.querySelector('#screening-languages')?.value || '',
        relocationLocations: this.panel.querySelector('#screening-relocation-locations')?.value || '',
        workAuthorization: this.panel.querySelector('#screening-work-authorization')?.value || '',
        sponsorship: this.panel.querySelector('#screening-sponsorship')?.value || ''
      }
    });
  }

  loadFilterStates() {
    chrome.storage.local.get(['filterStates', 'resumeFileName', 'resumeText', 'resumeSummary', 'contactFullName', 'contactEmail', 'contactPhone', 'contactLocation', 'handshakePlusScreeningFacts', 'handshakePlusClaudeUrl', 'handshakePlusGeminiUrl', 'handshakePlusCustomAiInstructions', 'handshakePlusAiJobFitInstructions', 'handshake-plus-default-font'], (result) => {
      const degreeCheckbox = this.panel.querySelector('#filter-degree');
      const majorCheckbox = this.panel.querySelector('#filter-major');
      const gradDateCheckbox = this.panel.querySelector('#filter-grad-date');
      const internshipCheckbox = this.panel.querySelector('#filter-internship');
      const fulltimeJobCheckbox = this.panel.querySelector('#filter-fulltime-job');
      const employmentFulltimeCheckbox = this.panel.querySelector('#filter-employment-fulltime');
      const employmentParttimeCheckbox = this.panel.querySelector('#filter-employment-parttime');
      const remoteCheckbox = this.panel.querySelector('#filter-remote');
      const hybridCheckbox = this.panel.querySelector('#filter-hybrid');
      const onsiteCheckbox = this.panel.querySelector('#filter-onsite');
      const visaSponsorshipCheckbox = this.panel.querySelector('#filter-visa-sponsorship');
      const noUSWorkCheckbox = this.panel.querySelector('#filter-no-us-work');

      const contactFullName = this.panel.querySelector('#contact-full-name');
      const contactEmail = this.panel.querySelector('#contact-email');
      const contactPhone = this.panel.querySelector('#contact-phone');
      const contactLocation = this.panel.querySelector('#contact-location');
      const screeningLanguages = this.panel.querySelector('#screening-languages');
      const screeningRelocationLocations = this.panel.querySelector('#screening-relocation-locations');
      const screeningWorkAuthorization = this.panel.querySelector('#screening-work-authorization');
      const screeningSponsorship = this.panel.querySelector('#screening-sponsorship');
      const claudeUrlInput = this.panel.querySelector('#handshake-plus-claude-url');
      const geminiUrlInput = this.panel.querySelector('#handshake-plus-gemini-url');
      const customAiInstructionsInput = this.panel.querySelector('#handshake-plus-custom-ai-instructions');

      if (contactFullName && result.contactFullName) contactFullName.value = result.contactFullName;
      if (contactEmail && result.contactEmail) contactEmail.value = result.contactEmail;
      if (contactPhone && result.contactPhone) contactPhone.value = result.contactPhone;
      if (contactLocation && result.contactLocation) contactLocation.value = result.contactLocation;
      if (claudeUrlInput && result.handshakePlusClaudeUrl) claudeUrlInput.value = result.handshakePlusClaudeUrl;
      if (geminiUrlInput && result.handshakePlusGeminiUrl) geminiUrlInput.value = result.handshakePlusGeminiUrl;
      if (customAiInstructionsInput && result.handshakePlusCustomAiInstructions) customAiInstructionsInput.value = result.handshakePlusCustomAiInstructions;

      const defaultFontSelect = this.panel.querySelector('#handshake-plus-default-font');
      if (defaultFontSelect && result['handshake-plus-default-font']) {
        defaultFontSelect.value = result['handshake-plus-default-font'];
      }

      if (result.handshakePlusScreeningFacts) {
        if (screeningLanguages) screeningLanguages.value = result.handshakePlusScreeningFacts.languages || '';
        if (screeningRelocationLocations) screeningRelocationLocations.value = result.handshakePlusScreeningFacts.relocationLocations || '';
        if (screeningWorkAuthorization) screeningWorkAuthorization.value = result.handshakePlusScreeningFacts.workAuthorization || '';
        if (screeningSponsorship) screeningSponsorship.value = result.handshakePlusScreeningFacts.sponsorship || '';
      }

      if (result.filterStates) {
        // Load saved states
        if (degreeCheckbox) degreeCheckbox.checked = result.filterStates.degree || false;
        if (majorCheckbox) majorCheckbox.checked = result.filterStates.major || false;
        if (gradDateCheckbox) gradDateCheckbox.checked = result.filterStates.gradDate || false;
        if (internshipCheckbox) internshipCheckbox.checked = result.filterStates.internship || false;
        if (fulltimeJobCheckbox) fulltimeJobCheckbox.checked = result.filterStates.fulltimeJob || false;
        if (employmentFulltimeCheckbox) employmentFulltimeCheckbox.checked = result.filterStates.employmentFulltime || false;
        if (employmentParttimeCheckbox) employmentParttimeCheckbox.checked = result.filterStates.employmentParttime || false;
        if (remoteCheckbox) remoteCheckbox.checked = result.filterStates.remote || false;
        if (hybridCheckbox) hybridCheckbox.checked = result.filterStates.hybrid || false;
        if (onsiteCheckbox) onsiteCheckbox.checked = result.filterStates.onsite || false;
        if (visaSponsorshipCheckbox) visaSponsorshipCheckbox.checked = result.filterStates.visaSponsorship || false;
        if (noUSWorkCheckbox) noUSWorkCheckbox.checked = result.filterStates.noUSWork || false;
      } else {
        // Default: check all profile qualification filters
        if (degreeCheckbox) degreeCheckbox.checked = true;
        if (majorCheckbox) majorCheckbox.checked = true;
        if (gradDateCheckbox) gradDateCheckbox.checked = true;
        // Other filters default to unchecked
        if (internshipCheckbox) internshipCheckbox.checked = false;
        if (fulltimeJobCheckbox) fulltimeJobCheckbox.checked = false;
        if (employmentFulltimeCheckbox) employmentFulltimeCheckbox.checked = false;
        if (employmentParttimeCheckbox) employmentParttimeCheckbox.checked = false;
        if (remoteCheckbox) remoteCheckbox.checked = false;
        if (hybridCheckbox) hybridCheckbox.checked = false;
        if (onsiteCheckbox) onsiteCheckbox.checked = false;
        if (visaSponsorshipCheckbox) visaSponsorshipCheckbox.checked = false;
        if (noUSWorkCheckbox) noUSWorkCheckbox.checked = false;
      }

      const aiJobFitInstructionsInput = this.panel.querySelector('#handshake-plus-ai-job-fit-instructions');
      if (aiJobFitInstructionsInput && result.handshakePlusAiJobFitInstructions) {
        aiJobFitInstructionsInput.value = result.handshakePlusAiJobFitInstructions;
        const counterEl = this.panel.querySelector('#hsp-ai-job-fit-counter');
        if (counterEl) {
          counterEl.textContent = `${aiJobFitInstructionsInput.value.length} / 1500 characters`;
        }
      }

      if (result.resumeFileName && result.resumeText) {
        const fileNameEl = this.panel.querySelector('#resume-file-name');
        const statusEl = this.panel.querySelector('#resume-status');
        const formContainer = this.panel.querySelector('#filters-form-container');

        if (fileNameEl) {
          fileNameEl.textContent = result.resumeFileName;
        }

        if (formContainer) {
          formContainer.style.display = 'block';
        }
        
        const removeBtn = this.panel.querySelector('#resume-remove-btn');
        const uploadBtn = this.panel.querySelector('#resume-upload-btn');
        if (removeBtn) removeBtn.style.display = 'inline-block';
        if (uploadBtn) uploadBtn.style.display = 'none';
        
        const coverLetterCb = this.panel.querySelector('#handshake-plus-cover-letter');
        if (coverLetterCb) {
          const savedCoverLetterState = localStorage.getItem('handshake-plus-cover-letter-enabled');
          if (savedCoverLetterState !== null) {
            coverLetterCb.checked = savedCoverLetterState === 'true';
          } else {
            coverLetterCb.checked = true; // explicitly default to true if it's their first time unlocking
          }
          coverLetterCb.dispatchEvent(new Event('change'));
        }

        // Restore raw resume toggle state
        const rawResumeCheckbox = this.panel.querySelector('#handshake-plus-raw-resume');
        const savedRawResume = localStorage.getItem('handshake-plus-raw-resume');
        if (rawResumeCheckbox && savedRawResume !== null) {
          rawResumeCheckbox.checked = savedRawResume === 'true';
        }

        if (statusEl) {
          if (result.resumeRawMode) {
            statusEl.textContent = '✓ Resume uploaded (raw text mode)';
          } else if (result.resumeSummary) {
            statusEl.textContent = '✓ Resume uploaded & summarized';
          } else {
            statusEl.textContent = '✓ Resume uploaded';
          }
          statusEl.className = 'hsp-status-inline success';
        }
      }
    });
  }

  getActiveFilters() {
    // All checkbox-based filter categories were intentionally removed from the panel.
    // Keep returning empty arrays so URL filter-merging logic can preserve existing params.
    return {
      qualifications: [],
      jobTypes: [],
      employmentTypes: [],
      remoteWork: [],
      workAuthorization: []
    };
  }

  async handleResumeUpload(file) {
    const statusEl = this.panel.querySelector('#resume-status');
    const fileNameEl = this.panel.querySelector('#resume-file-name');

    try {
      // Show loading status
      statusEl.textContent = 'Parsing resume...';
      statusEl.className = 'hsp-status-inline loading';

      let resumeText = '';

      // Handle different file types
      const fileType = file.name.split('.').pop().toLowerCase();

      if (fileType === 'pdf') {
        resumeText = await this.parsePDF(file);
      } else if (fileType === 'txt') {
        resumeText = await this.parseTextFile(file);
      } else if (fileType === 'docx') {
        // For now, show error for DOCX - can implement later if needed
        throw new Error('DOCX files are not yet supported. Please use PDF or TXT format.');
      } else {
        throw new Error('Unsupported file type. Please use PDF or TXT format.');
      }

      // Validate that we got some text
      if (!resumeText || resumeText.trim().length === 0) {
        throw new Error('Could not extract text from file. Please ensure your resume contains readable text.');
      }

      // Check if raw resume mode is enabled (skip AI summary)
      const rawResumeCheckbox = this.panel.querySelector('#handshake-plus-raw-resume');
      const useRawResume = rawResumeCheckbox ? rawResumeCheckbox.checked : false;

      let resumeSummary = '';

      if (useRawResume) {
        // Use the raw resume text directly as the summary
        resumeSummary = resumeText;
      } else {
        // Show status: generating summary
        statusEl.textContent = 'Generating AI summary and extracting contact info...';
        statusEl.className = 'hsp-status-inline loading';

        // Generate resume summary via the selected AI tab provider.
        try {
          const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: 'summarizeResume',
              resumeText: resumeText,
              provider: localStorage.getItem('handshake-plus-ai-provider') || 'gemini'
            }, resolve);
          });

          if (response && response.success) {
            resumeSummary = response.summary;
            // console.log('Resume summary generated:', resumeSummary);
            
            // Autofill extracted contact info
            if (response.contact) {
              const { fullName, email, phone, location } = response.contact;
              const nameEl = this.panel.querySelector('#contact-full-name');
              const emailEl = this.panel.querySelector('#contact-email');
              const phoneEl = this.panel.querySelector('#contact-phone');
              const locationEl = this.panel.querySelector('#contact-location');
              
              if (nameEl && fullName) nameEl.value = fullName;
              if (emailEl && email) emailEl.value = email;
              if (phoneEl && phone) phoneEl.value = phone;
              if (locationEl && location) locationEl.value = location;
              
              // Save state immediately so it persists globally
              this.saveFilterStates();
            }

            if (response.screeningFacts) {
              const { languages, relocationLocations, workAuthorization, sponsorship } = response.screeningFacts;
              const languagesEl = this.panel.querySelector('#screening-languages');
              const relocationEl = this.panel.querySelector('#screening-relocation-locations');
              const workAuthorizationEl = this.panel.querySelector('#screening-work-authorization');
              const sponsorshipEl = this.panel.querySelector('#screening-sponsorship');

              if (languagesEl && languages) languagesEl.value = languages;
              if (relocationEl && relocationLocations) relocationEl.value = relocationLocations;
              if (workAuthorizationEl && workAuthorization) workAuthorizationEl.value = workAuthorization;
              if (sponsorshipEl && sponsorship) sponsorshipEl.value = sponsorship;

              this.saveScreeningFacts();
            }
          } else {
            throw new Error(response?.error || 'Failed to generate summary');
          }
        } catch (summaryError) {
          // console.warn('Could not generate resume summary:', summaryError);
          // Continue without summary - don't fail the entire upload
          resumeSummary = '';
        }
      }

      // Store in chrome.storage.local
      await chrome.storage.local.set({
        resumeText: resumeText,
        resumeSummary: resumeSummary,
        resumeFileName: file.name,
        resumeUploadDate: new Date().toISOString(),
        resumeRawMode: useRawResume
      });

      // Show success status
      if (useRawResume) {
        statusEl.textContent = '✓ Resume uploaded (raw text mode)';
      } else if (resumeSummary) {
        statusEl.textContent = '✓ Resume uploaded & summarized';
      } else {
        statusEl.textContent = '✓ Resume uploaded (AI autofill failed)';
      }
      statusEl.className = 'hsp-status-inline success';
      
      const formContainer = this.panel.querySelector('#filters-form-container');
      const removeBtn = this.panel.querySelector('#resume-remove-btn');
      const uploadBtn = this.panel.querySelector('#resume-upload-btn');
      
      if (formContainer) {
        formContainer.style.display = 'block';
      }
      if (removeBtn) {
        removeBtn.style.display = 'inline-block';
      }
      if (uploadBtn) {
        uploadBtn.style.display = 'none';
      }

      // console.log(`Resume uploaded: ${file.name} (${resumeText.length} characters)`);

    } catch (error) {
      console.error('Error uploading resume:', error);

      // Show error status
      statusEl.textContent = `✗ Error: ${error.message}`;
      statusEl.className = 'hsp-status-inline error';

      // Reset file selection
      fileNameEl.textContent = 'No file chosen';
      const fileInput = this.panel.querySelector('#resume-upload');
      if (fileInput) {
        fileInput.value = '';
      }
    }
  }

  async parsePDF(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();

      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result);

          // Configure PDF.js worker
          if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');

            // Load the PDF
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            let fullText = '';

            // Extract text from each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const page = await pdf.getPage(pageNum);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(' ');
              fullText += pageText + '\n';
            }

            resolve(fullText.trim());
          } else {
            reject(new Error('PDF.js library not loaded'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse PDF: ${error.message}`));
        }
      };

      fileReader.onerror = function() {
        reject(new Error('Failed to read file'));
      };

      fileReader.readAsArrayBuffer(file);
    });
  }

  async parseTextFile(file) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();

      fileReader.onload = function() {
        resolve(this.result);
      };

      fileReader.onerror = function() {
        reject(new Error('Failed to read text file'));
      };

      fileReader.readAsText(file);
    });
  }
}

// Export for use in content.js
window.HandshakePlusPanel = HandshakePlusPanel;
// console.log('Handshake Plus: panel.js loaded successfully, HandshakePlusPanel exported');
