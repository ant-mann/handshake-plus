// Floating panel that gets injected into Handshake page
// console.log('Handshake Plus: panel.js loading...');

class HandshakePlusPanel {
  constructor() {
    this.isMinimized = false;
    this.appliedCount = 0;
    this.isApplying = false;
    this.previousPanelHeight = null;
    this.autoExpandedForApplying = false;
    this.maxSelectedJobRoles = 5;
    this.maxJobRoleLength = 75;
    this.maxRoleChipDisplayLength = 20;
    this.selectedJobRoles = [];
    this.jobRoles = [
      // Healthcare & Medicine
      "Registered Nurse", "Physician / Doctor", "Surgeon", "Dentist", "Pharmacist",
      "Physical Therapist", "Occupational Therapist", "Medical Assistant", "Dental Hygienist",
      "Radiologic Technologist", "Respiratory Therapist", "Nurse Practitioner",
      "Physician Assistant", "Home Health Aide", "Veterinarian", "Optometrist",
      "Paramedic / EMT", "Clinical Lab Technician", "Psychiatric Technician", "Surgical Technologist",
      // Technology & IT
      "Software Engineer", "Web Developer", "Data Scientist", "Cybersecurity Analyst",
      "IT Support Specialist", "Network Engineer", "Cloud Architect", "DevOps Engineer",
      "Database Administrator", "UX/UI Designer", "Machine Learning Engineer",
      "Product Manager", "Systems Analyst", "Mobile App Developer", "IT Project Manager",
      "QA / Test Engineer", "Blockchain Developer", "AI Engineer", "Full Stack Developer", 
      "Backend Developer", "Frontend Developer", "Technical Writer", "Project Engineer", 
      "Product Engineer", "Operations Manager Engineer", "Quality Engineer", "Cloud Engineer", 
      "Data Engineer", "Business Analyst", "Project Manager", "Systems Engineer", "Technical Support Engineer",
      // Business & Finance
      "Accountant", "Financial Analyst", "Bookkeeper", "Auditor", "Budget Analyst",
      "Tax Preparer", "Insurance Agent", "Loan Officer", "Financial Advisor", "Actuary",
      "Bank Teller", "Investment Banker", "Risk Analyst", "Compliance Officer",
      "Payroll Specialist", "Credit Analyst", "Mortgage Broker", "Business Analyst",
      "Chief Financial Officer", "Controller",
      // Sales & Marketing
      "Sales Representative", "Marketing Manager", "Digital Marketing Specialist", "Brand Manager",
      "Social Media Manager", "SEO Specialist", "Content Marketer", "Account Executive",
      "Real Estate Agent", "Advertising Manager", "Public Relations Specialist",
      "Market Research Analyst", "E-commerce Manager", "Email Marketing Specialist",
      "Media Buyer", "Copywriter", "Inside Sales Rep", "Business Development Manager",
      "Customer Success Manager", "Retail Sales Associate",
      // Education
      "Elementary School Teacher", "High School Teacher", "Special Education Teacher",
      "College Professor", "School Principal", "School Counselor", "Librarian",
      "Instructional Designer", "Tutor", "Early Childhood Educator", "ESL Teacher",
      "Curriculum Developer", "School Administrator", "Teaching Assistant", "Corporate Trainer",
      // Trades & Construction
      "Electrician", "Plumber", "Carpenter", "HVAC Technician", "Welder",
      "Construction Manager", "Civil Engineer", "Architect", "Structural Engineer",
      "Mason / Bricklayer", "Roofer", "Pipefitter", "Ironworker", "Tile Setter",
      "Painter", "Flooring Installer", "Heavy Equipment Operator", "Surveyor",
      "Drywall Installer", "Glazier",
      // Transportation & Logistics
      "Truck Driver", "Delivery Driver", "Warehouse Worker", "Logistics Coordinator",
      "Supply Chain Manager", "Forklift Operator", "Airline Pilot", "Air Traffic Controller",
      "Ship Captain", "Dispatcher", "Bus Driver", "Train Conductor", "Freight Broker",
      "Customs Broker", "Fleet Manager",
      // Legal & Government
      "Lawyer / Attorney", "Paralegal", "Judge", "Court Reporter", "Police Officer",
      "Firefighter", "Correctional Officer", "Border Patrol Agent", "Social Worker",
      "Urban Planner", "Government Administrator", "Military Officer", "Immigration Officer",
      "Tax Inspector", "Postal Worker",
      // Hospitality & Food Service
      "Chef / Cook", "Restaurant Manager", "Bartender", "Server / Waiter", "Hotel Manager",
      "Housekeeper", "Barista", "Event Planner", "Catering Manager", "Front Desk Clerk",
      "Tour Guide", "Flight Attendant", "Casino Dealer", "Food Service Worker", "Sous Chef",
      // Creative & Media
      "Graphic Designer", "Photographer", "Videographer / Filmmaker", "Journalist / Reporter",
      "Editor", "Animator", "Interior Designer", "Fashion Designer", "Game Designer",
      "Podcast Producer", "Voiceover Artist", "Art Director", "Musician / Composer",
      "Actor", "Illustrator",
      // Human Resources & Admin
      "HR Manager", "HR Generalist", "Recruiter / Talent Acquisition", "Training & Development Specialist",
      "Executive Assistant", "Administrative Assistant", "Office Manager", "Data Entry Clerk",
      "Receptionist", "Operations Manager",
      // Science & Engineering
      "Mechanical Engineer", "Electrical Engineer", "Chemical Engineer", "Environmental Scientist",
      "Geologist", "Aerospace Engineer", "Biomedical Engineer", "Industrial Engineer",
      "Materials Scientist", "Physicist", "Lab Researcher",
      // Personal Services & Other
      "Personal Trainer", "Cosmetologist / Hair Stylist", "Childcare Worker",
      "Landscaper / Groundskeeper", "Security Guard"
    ];
    this.createPanel();
  }

  createPanel() {
    // Create container
    this.panel = document.createElement('div');
    this.panel.id = 'handshake-plus-panel';
    this.panel.innerHTML = `
      <div class="handshake-plus-header">
        <span class="handshake-plus-title">🤝 Handshake Plus</span>
        <div class="handshake-plus-controls">
          <button id="handshake-plus-minimize" class="handshake-plus-btn-icon" title="Minimize">−</button>
        </div>
      </div>
      <div class="handshake-plus-tabs">
        <button class="handshake-plus-tab active" data-tab="apply">Apply</button>
        <button class="handshake-plus-tab" data-tab="filters">Profile</button>
      </div>
      <div class="handshake-plus-body">
        <div class="handshake-plus-tab-content active" id="apply-content">
          <div class="handshake-plus-status" id="handshake-plus-status">Ready to apply</div>
          <div class="handshake-plus-progress" id="handshake-plus-progress" style="display: none;">
            <span class="progress-label">Number of jobs you applied today:</span>
            <span class="progress-count" id="handshake-plus-count">0</span>
          </div>
          <div class="handshake-plus-buttons">
            <button id="handshake-plus-start" class="handshake-plus-btn handshake-plus-btn-primary">Start Applying</button>
            <button id="handshake-plus-stop" class="handshake-plus-btn handshake-plus-btn-danger" style="display: none;">Stop</button>
          </div>
          <div class="filter-option" style="margin-top: 8px;">
            <label class="filter-label">
              <input type="checkbox" id="handshake-plus-cover-letter">
              <span>Enable AI generated cover letters</span>
            </label>
            <div id="handshake-plus-manual-review-wrapper" style="margin-top: -6px; margin-left: 24px; display: none;">
              <label class="filter-label" style="padding-top: 2px;">
                <input type="checkbox" id="handshake-plus-manual-review" style="margin: 0; margin-right: 8px;">
                <span style="font-size: 13px; color: #555; line-height: 1.3;">Manually review cover letters, documents &amp; screening answers before submitting?</span>
              </label>
            </div>
            <div id="handshake-plus-ai-provider-wrapper" style="margin-top: 4px; margin-left: 24px; display: none;">
              <span style="font-size: 12px; color: #555;">AI provider:</span>
              <label style="font-size: 12px; color: #555; margin-left: 6px; cursor: pointer;">
                <input type="radio" name="handshake-plus-ai-provider" id="handshake-plus-provider-claude" value="claude" style="margin-right: 3px;">Claude
              </label>
              <label style="font-size: 12px; color: #555; margin-left: 8px; cursor: pointer;">
                <input type="radio" name="handshake-plus-ai-provider" id="handshake-plus-provider-gemini" value="gemini" style="margin-right: 3px;">Gemini
              </label>
              <div style="margin-top: 8px;">
                <input type="url" id="handshake-plus-claude-url" class="job-role-search-input" placeholder="Optional Claude chat/project URL" style="font-size: 12px; padding: 6px; margin-bottom: 6px;" />
                <input type="url" id="handshake-plus-gemini-url" class="job-role-search-input" placeholder="Optional Gemini chat URL" style="font-size: 12px; padding: 6px;" />
                <div style="font-size: 11px; color: #666; line-height: 1.3; margin-top: 4px;">Optional: route AI prompts to a specific Claude or Gemini page with your preferred context.</div>
                <textarea id="handshake-plus-custom-ai-instructions" class="job-role-search-input" placeholder="Custom instructions added to every AI prompt, e.g. tone, cover letter preferences, formatting style" maxlength="5000" style="font-size: 12px; padding: 6px; min-height: 72px; resize: vertical; margin-top: 8px;"></textarea>
                <div style="font-size: 11px; color: #666; line-height: 1.3; margin-top: 4px;">These are added to cover letters, required documents, screening answers, and resume parsing. Built-in output format and truthfulness rules still apply.</div>
                <div id="handshake-plus-aggressive-wrapper" style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #eee;">
                  <label class="filter-label" style="padding-top: 2px;">
                    <input type="checkbox" id="handshake-plus-aggressive-mode" style="margin: 0; margin-right: 8px;">
                    <span style="font-weight: 600; font-size: 13px; color: #333;">Aggressive Mode</span>
                  </label>
                  <div style="font-size: 11px; color: #777; line-height: 1.4; margin-top: 4px; margin-left: 24px;">
                    When enabled, AI will always answer screening questions with the most hirable option and produce complete required documents without placeholder brackets. Intended to maximize interview chances.
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="handshake-plus-note" id="handshake-plus-note">Submits your most recently uploaded transcript and/or resume on Handshake</div>
          <div class="handshake-plus-note" id="handshake-plus-claude-note" style="margin-top: 4px;">Tip: keep a <a href="https://claude.ai" target="_blank" style="color: #d4824a; text-decoration: none;">claude.ai</a> tab open so Handshake Plus can generate cover letters through your own Claude session.</div>
        </div>
        <div class="handshake-plus-tab-content" id="filters-content">
          <div class="filter-section">
            
            <label class="filter-text-label" style="margin-top: 0px; padding-bottom: 16px; border-bottom: 1px solid #eee; margin-bottom: 12px;">
              <span style="display: flex; align-items: center; gap: 6px;">
                Upload Your Resume (for cover letter)
                <span class="info-tooltip" data-tooltip="This resume is used to generate personalized cover letters.">ⓘ</span>
              </span>
              <div class="resume-upload-container">
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.docx"
                  style="display: none;"
                />
                <button id="resume-upload-btn" class="resume-upload-btn">
                  Choose File
                </button>
                <button id="resume-remove-btn" class="resume-upload-btn" style="display: none; background-color: #dc3545; border-color: #dc3545; color: white; margin-left: 8px;">
                  Remove
                </button>
                <span id="resume-file-name" class="resume-file-name">No file chosen</span>
              </div>
              <div id="resume-status" class="resume-status"></div>
              <div style="margin-top: 8px; display: flex; align-items: center; gap: 6px;">
                <input type="checkbox" id="handshake-plus-raw-resume" style="margin: 0;">
                <label for="handshake-plus-raw-resume" style="font-size: 12px; color: #888; cursor: pointer;">Use raw resume text (skip AI summary)</label>
              </div>
            </label>

            <div id="filters-form-container" style="display: none;">
              <label class="filter-text-label">
                <span>Full Name <span style="font-size: 12px; color: #6c757d;"></span></span>
                <input type="text" id="contact-full-name" class="job-role-search-input" placeholder="e.g. Jane Doe" />
              </label>

              <label class="filter-text-label" style="margin-top: 16px;">
                <span>Email <span style="font-size: 12px; color: #6c757d;">(Required)</span></span>
                <input type="email" id="contact-email" class="job-role-search-input" placeholder="e.g. jane@example.com" />
              </label>

              <label class="filter-text-label" style="margin-top: 16px;">
                <span>Location <span style="font-size: 12px; color: #6c757d;">(Optional)</span></span>
                <input type="text" id="contact-location" class="job-role-search-input" placeholder="e.g. New York, NY" />
              </label>

              <label class="filter-text-label" style="margin-top: 16px;">
                <span>Phone <span style="font-size: 12px; color: #6c757d;">(Optional)</span></span>
                <input type="tel" id="contact-phone" class="job-role-search-input" placeholder="e.g. (555) 123-4567" />
              </label>

              <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #eee;">
                <div style="font-weight: 600; font-size: 13px; color: #333; margin-bottom: 8px;">Screening facts</div>
                <label class="filter-text-label">
                  <span>Languages you speak <span style="font-size: 12px; color: #6c757d;">(comma separated)</span></span>
                  <input type="text" id="screening-languages" class="job-role-search-input" placeholder="e.g. English, Spanish" />
                </label>
                <label class="filter-text-label" style="margin-top: 12px;">
                  <span>Locations you are willing to relocate to</span>
                  <input type="text" id="screening-relocation-locations" class="job-role-search-input" placeholder="e.g. NYC, Chicago, Anywhere" />
                </label>
                <label class="filter-text-label" style="margin-top: 12px;">
                  <span>US work authorization</span>
                  <select id="screening-work-authorization" class="job-role-search-input">
                    <option value="">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label class="filter-text-label" style="margin-top: 12px;">
                  <span>Need visa sponsorship?</span>
                  <select id="screening-sponsorship" class="job-role-search-input">
                    <option value="">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
              </div>

            </div>

            <label class="filter-text-label" style="margin-top: 16px;">
              <span>What job role are you looking for?</span>
              <div class="job-role-dropdown-container">
                <input
                  type="text"
                  id="job-role-search"
                  class="job-role-search-input"
                  placeholder="Type role and press Enter (max 5)"
                  maxlength="75"
                  autocomplete="off"
                />
                <div id="job-role-dropdown" class="job-role-dropdown"></div>
              </div>
              <div id="selected-job-role" class="selected-job-role"></div>
            </label>
          </div>
        </div>
      </div>
      <div class="handshake-plus-resize-handle" id="handshake-plus-resize"></div>
    `;

    // Add styles
    this.addStyles();

    // Append to body
    document.body.appendChild(this.panel);

    // Set initial height to prevent auto-resizing when switching tabs
    this.panel.style.height = '325px';

    // Add event listeners
    this.attachEventListeners();

    // Make draggable
    this.makeDraggable();

    // Make resizable
    this.makeResizable();
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
        background: white;
        border: 2px solid #007bff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        transition: none;
        display: flex;
        flex-direction: column;
      }

      #handshake-plus-panel.minimized {
        height: auto !important;
        width: auto !important;
        min-width: unset !important;
        min-height: unset !important;
        max-height: unset !important;
      }

      #handshake-plus-panel.minimized .handshake-plus-header {
        padding: 12px 16px;
        border-radius: 6px;
        margin-bottom: 0 !important;
      }

      #handshake-plus-panel.minimized .handshake-plus-title {
        white-space: nowrap;
      }

      #handshake-plus-panel.minimized .handshake-plus-tabs {
        display: none !important;
        height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
        overflow: hidden !important;
      }

      #handshake-plus-panel.minimized .handshake-plus-body {
        display: none !important;
        padding: 0 !important;
        margin: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }

      #handshake-plus-panel.minimized .handshake-plus-resize-handle {
        display: none !important;
      }

      .handshake-plus-header {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: white;
        padding: 12px 16px;
        border-radius: 6px 6px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
      }

      .handshake-plus-title {
        font-weight: 600;
        font-size: 16px;
      }

      .handshake-plus-controls {
        display: flex;
        gap: 8px;
      }

      .handshake-plus-btn-icon {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .handshake-plus-btn-icon:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .handshake-plus-tabs {
        display: flex;
        background: #f8f9fa;
        border-bottom: 2px solid #dee2e6;
      }

      .handshake-plus-tab {
        flex: 1;
        padding: 12px 16px;
        border: none;
        background: transparent;
        color: #6c757d;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border-bottom: 3px solid transparent;
      }

      .handshake-plus-tab:hover {
        background: #e9ecef;
        color: #495057;
      }

      .handshake-plus-tab.active {
        color: #007bff;
        border-bottom-color: #007bff;
        background: white;
      }

      .handshake-plus-tab.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }

      .handshake-plus-body {
        padding: 16px;
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .handshake-plus-body::-webkit-scrollbar {
        width: 8px;
      }

      .handshake-plus-body::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }

      .handshake-plus-body::-webkit-scrollbar-thumb {
        background: #007bff;
        border-radius: 4px;
      }

      .handshake-plus-body::-webkit-scrollbar-thumb:hover {
        background: #0056b3;
      }

      .handshake-plus-tab-content {
        display: none;
      }

      .handshake-plus-tab-content.active {
        display: block;
      }

      .handshake-plus-status {
        padding: 10px;
        background: #e7f3ff;
        border: 1px solid #b3d9ff;
        border-radius: 4px;
        margin-bottom: 12px;
        font-size: 14px;
        color: #004085;
        text-align: center;
      }

      .handshake-plus-status.active {
        background: #d4edda;
        border-color: #c3e6cb;
        color: #155724;
      }

      .handshake-plus-progress {
        font-size: 14px;
        margin-bottom: 16px;
        text-align: center;
        padding: 10px;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 1px solid #7dd3fc;
        border-radius: 6px;
      }

      .handshake-plus-progress .progress-label {
        color: #0c4a6e;
        font-weight: 500;
        display: block;
        margin-bottom: 4px;
        font-size: 12px;
      }

      .handshake-plus-progress .progress-count {
        color: #0369a1;
        font-weight: 700;
        font-size: 20px;
        display: block;
      }

      .handshake-plus-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .handshake-plus-btn {
        padding: 10px 16px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        width: 100%;
      }

      .handshake-plus-btn-primary {
        background: #007bff;
        color: white;
      }

      .handshake-plus-btn-primary:hover:not(:disabled) {
        background: #0056b3;
      }

      .handshake-plus-btn-primary:disabled {
        background: #cccccc;
        cursor: not-allowed;
      }

      .handshake-plus-btn-danger {
        background: #dc3545;
        color: white;
      }

      .handshake-plus-btn-danger:hover {
        background: #c82333;
      }

      .handshake-plus-note {
        margin-top: 10px;
        font-size: 12px;
        color: #000;
        line-height: 1.4;
        text-align: center;
      }

      .handshake-plus-resize-handle {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 24px;
        height: 24px;
        cursor: sw-resize;
        background: #007bff;
        clip-path: polygon(0 0, 0 100%, 100% 100%);
        border-bottom-left-radius: 6px;
        opacity: 0.6;
        transition: opacity 0.2s, background-color 0.2s;
      }

      .handshake-plus-resize-handle:hover {
        opacity: 1;
        background: #0056b3;
      }

      .filter-section {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e9ecef;
      }

      .filter-section:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .filter-option {
        margin-bottom: 12px;
      }

      .filter-label {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: background 0.2s;
      }

      .filter-label:hover {
        background: #f8f9fa;
      }

      .filter-checkbox {
        width: 18px;
        height: 18px;
        margin-right: 10px;
        cursor: pointer;
        accent-color: #007bff;
      }

      .filter-label span {
        font-size: 14px;
        color: #495057;
        user-select: none;
        padding: 10px;
      }

      .filter-text-label {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .filter-text-label > span {
        font-size: 14px;
        color: #495057;
        font-weight: 500;
      }

      .job-role-dropdown-container {
        position: relative;
        width: 100%;
      }

      .job-role-search-input {
        width: 100%;
        padding: 10px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        border: 1px solid #ced4da;
        border-radius: 4px;
        box-sizing: border-box;
        transition: border-color 0.2s;
      }

      .job-role-search-input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
      }

      .job-role-search-input::placeholder {
        color: #adb5bd;
      }

      .job-role-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ced4da;
        border-top: none;
        border-radius: 0 0 4px 4px;
        max-height: 150px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .job-role-dropdown.show {
        display: block;
      }

      .job-role-dropdown-item {
        padding: 10px;
        cursor: pointer;
        font-size: 14px;
        color: #495057;
        transition: background-color 0.2s;
        border-bottom: 1px solid #f1f1f1;
      }

      .job-role-dropdown-item:last-child {
        border-bottom: none;
      }

      .job-role-dropdown-item:hover {
        background-color: #f8f9fa;
      }

      .resume-upload-container {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      }

      .resume-upload-btn {
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background 0.2s;
      }

      .resume-upload-btn:hover {
        background: #0056b3;
      }

      .resume-file-name {
        font-size: 13px;
        color: #6c757d;
        font-style: italic;
      }

      .info-tooltip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: #e7f3ff;
        color: #007bff;
        border: 1px solid #007bff;
        font-size: 11px;
        font-weight: bold;
        font-family: serif;
        cursor: help;
        user-select: none;
        position: relative;
      }
      
      .info-tooltip:hover {
        background-color: #0056b3;
        color: white;
      }

      .info-tooltip::after {
        content: attr(data-tooltip);
        position: absolute;
        top: 150%;
        bottom: auto;
        left: 50%;
        transform: translateX(-75%);
        width: 250px;
        background-color: #007bff;
        color: white;
        text-align: center;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        font-size: 12px;
        font-weight: normal;
        line-height: 1.4;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, transform 0.2s ease;
        z-index: 1000;
        pointer-events: none;
      }

      .info-tooltip::before {
        content: '';
        position: absolute;
        top: 100%;
        bottom: auto;
        left: 50%;
        transform: translateX(-50%);
        border-width: 6px;
        border-style: solid;
        border-color: transparent transparent #007bff transparent;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease;
        z-index: 1000;
      }

      .info-tooltip:hover::after {
        opacity: 1;
        visibility: visible;
        transform: translateX(-75%) translateY(2px);
      }

      .info-tooltip:hover::before {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(2px);
      }

      .resume-status {
        margin-top: 8px;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 13px;
        display: none;
      }

      .resume-status.success {
        display: block;
        background: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
      }

      .resume-status.error {
        display: block;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
      }

      .resume-status.loading {
        display: block;
        background: #d1ecf1;
        border: 1px solid #bee5eb;
        color: #0c5460;
      }

      .job-role-dropdown-item.selected {
        background-color: #e7f3ff;
        color: #007bff;
      }

      .selected-job-role {
        margin-top: 10px;
        padding: 8px;
        background: #e7f3ff;
        border: 1px solid #b3d9ff;
        border-radius: 4px;
        font-size: 14px;
        color: #004085;
        display: none;
        gap: 6px;
        flex-wrap: wrap;
        align-items: center;
      }

      .selected-job-role.show {
        display: flex;
      }

      .selected-job-role .selected-role-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #d6ebff;
        border: 1px solid #9dcfff;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
      }

      .selected-job-role .clear-selection {
        color: #007bff;
        cursor: pointer;
        font-weight: 600;
        border: none;
        background: transparent;
        padding: 0;
        line-height: 1;
      }

      .selected-job-role .clear-selection:hover {
        color: #0056b3;
      }

      .selected-job-role .clear-all-roles {
        margin-left: auto;
        border: none;
        background: transparent;
        color: #0056b3;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      }

      .selected-job-role .clear-all-roles:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    // Tab switching
    const tabs = this.panel.querySelectorAll('.handshake-plus-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.dataset.tab);
      });
    });

    // Filter checkboxes - save state on change
    const filterCheckboxes = this.panel.querySelectorAll('.filter-checkbox');
    filterCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.saveFilterStates();
      });
    });

    // Job role search input
    const jobRoleSearchInput = this.panel.querySelector('#job-role-search');
    const jobRoleDropdown = this.panel.querySelector('#job-role-dropdown');

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

    if (jobRoleSearchInput && jobRoleDropdown) {
      // Handle input changes to show filtered results
      jobRoleSearchInput.addEventListener('input', (e) => {
        const sanitizedValue = this.sanitizeRoleInput(e.target.value);
        if (sanitizedValue !== e.target.value) {
          e.target.value = sanitizedValue;
        }
        this.handleJobRoleSearch(sanitizedValue);
      });

      // Block non-alphanumeric/non-space key entry while allowing navigation/edit keys.
      jobRoleSearchInput.addEventListener('keydown', (e) => {
        const allowedControlKeys = new Set([
          'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Home', 'End', 'Tab', 'Enter', 'Escape'
        ]);

        if (e.ctrlKey || e.metaKey || e.altKey || allowedControlKeys.has(e.key)) {
          return;
        }

        if (!(e.key === ' ' || /^[a-zA-Z0-9]$/.test(e.key))) {
          e.preventDefault();
        }
      });

      // Add a role on Enter. If suggestions exist, take the top suggestion.
      jobRoleSearchInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') {
          return;
        }

        e.preventDefault();
        const rawValue = this.sanitizeRoleInput(jobRoleSearchInput.value).trim();
        if (!rawValue) {
          return;
        }

        const suggestions = Array.from(jobRoleDropdown.querySelectorAll('.job-role-dropdown-item[data-job]'));
        const exactMatch = suggestions.find(item => {
          const job = item.getAttribute('data-job') || '';
          return job.toLowerCase() === rawValue.toLowerCase();
        });
        const roleToAdd = exactMatch ? (exactMatch.getAttribute('data-job') || rawValue) : rawValue;

        if (roleToAdd) {
          this.selectJobRole(roleToAdd);
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.job-role-dropdown-container')) {
          jobRoleDropdown.classList.remove('show');
        }
      });

      // Show dropdown when input is focused
      jobRoleSearchInput.addEventListener('focus', () => {
        if (jobRoleSearchInput.value.trim()) {
          this.handleJobRoleSearch(jobRoleSearchInput.value);
        }
      });
    }

    // Cover letter & Manual Review checkboxes - save state to localStorage
    const coverLetterCb = this.panel.querySelector('#handshake-plus-cover-letter');
    const manualReviewWrapper = this.panel.querySelector('#handshake-plus-manual-review-wrapper');
    const manualReviewCb = this.panel.querySelector('#handshake-plus-manual-review');

    const providerWrapper = this.panel.querySelector('#handshake-plus-ai-provider-wrapper');
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
      const savedProvider = localStorage.getItem('handshake-plus-ai-provider') || 'claude';
      if (providerGeminiRadio) providerGeminiRadio.checked = savedProvider === 'gemini';
      if (providerClaudeRadio) providerClaudeRadio.checked = savedProvider !== 'gemini';

      // Sync display instantly
      manualReviewWrapper.style.display = coverLetterCb.checked ? 'block' : 'none';
      if (providerWrapper) providerWrapper.style.display = coverLetterCb.checked ? 'block' : 'none';
      if (coverLetterCb.checked && this.panel.style.height === '325px') {
        this.panel.style.height = '355px'; // Adjust initial baseline height
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

      coverLetterCb.addEventListener('click', (e) => {
        const removeBtn = this.panel.querySelector('#resume-remove-btn');
        const hasResume = removeBtn && removeBtn.style.display !== 'none';

        if (!hasResume) {
          e.preventDefault();
          const statusEl = this.panel.querySelector('#handshake-plus-status');
          if (statusEl) {
            statusEl.textContent = '⚠️ Please upload resume in Profile first';
            statusEl.className = 'handshake-plus-status error';
          }
        }
      });

      coverLetterCb.addEventListener('change', () => {
        localStorage.setItem('handshake-plus-cover-letter-enabled', coverLetterCb.checked);
        manualReviewWrapper.style.display = coverLetterCb.checked ? 'block' : 'none';
        if (providerWrapper) providerWrapper.style.display = coverLetterCb.checked ? 'block' : 'none';

        const currentHeight = parseInt(this.panel.style.height) || this.panel.offsetHeight;
        if (coverLetterCb.checked) {
          this.panel.style.height = (currentHeight + 50) + 'px';
        } else {
          this.panel.style.height = Math.max(325, currentHeight - 50) + 'px';
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
          statusEl.className = 'resume-status';
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
    const header = this.panel.querySelector('.handshake-plus-header');
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
    const selectedTab = this.panel.querySelector(`.handshake-plus-tab[data-tab="${tabName}"]`);
    if (selectedTab && selectedTab.disabled) {
      return; // Don't switch to disabled tabs
    }

    // Remove active class from all tabs and contents
    const tabs = this.panel.querySelectorAll('.handshake-plus-tab');
    const contents = this.panel.querySelectorAll('.handshake-plus-tab-content');

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
    statusEl.textContent = text;
    if (isActive) {
      statusEl.classList.add('active');
    } else {
      statusEl.classList.remove('active');
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
    const filtersTab = this.panel.querySelector('.handshake-plus-tab[data-tab="filters"]');
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
      if (coverLetterCb) coverLetterCb.disabled = true;
      if (manualReviewCb) manualReviewCb.disabled = true;
      if (claudeUrlInput) claudeUrlInput.disabled = true;
      if (geminiUrlInput) geminiUrlInput.disabled = true;
      if (customAiInstructionsInput) customAiInstructionsInput.disabled = true;
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
      if (coverLetterCb) coverLetterCb.disabled = false;
      if (manualReviewCb) manualReviewCb.disabled = false;
      if (claudeUrlInput) claudeUrlInput.disabled = false;
      if (geminiUrlInput) geminiUrlInput.disabled = false;
      if (customAiInstructionsInput) customAiInstructionsInput.disabled = false;
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

  handleJobRoleSearch(searchTerm) {
    const dropdown = this.panel.querySelector('#job-role-dropdown');

    if (!searchTerm.trim()) {
      dropdown.classList.remove('show');
      dropdown.innerHTML = '';
      return;
    }

    // Find top 3 matches using fuzzy matching
    const matches = this.findTopMatches(searchTerm, this.jobRoles, 3);

    if (matches.length === 0) {
      dropdown.innerHTML = '<div class="job-role-dropdown-item" style="color: #6c757d;">No matches found</div>';
      dropdown.classList.add('show');
      return;
    }

    // Populate dropdown with matches
    dropdown.innerHTML = matches
      .map(job => `<div class="job-role-dropdown-item" data-job="${job}">${job}</div>`)
      .join('');

    // Add click handlers to dropdown items
    dropdown.querySelectorAll('.job-role-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const jobRole = item.getAttribute('data-job');
        if (jobRole) {
          this.selectJobRole(jobRole);
        }
      });
    });

    dropdown.classList.add('show');
  }

  findTopMatches(searchTerm, jobList, limit) {
    const lowerSearch = searchTerm.toLowerCase();

    // Score each job based on similarity
    const scored = jobList.map(job => {
      const lowerJob = job.toLowerCase();
      let score = 0;

      // Exact match gets highest score
      if (lowerJob === lowerSearch) {
        score = 1000;
      }
      // Starts with search term
      else if (lowerJob.startsWith(lowerSearch)) {
        score = 500;
      }
      // Contains search term
      else if (lowerJob.includes(lowerSearch)) {
        score = 250;
      }
      // Word boundary match (search term starts a word in the job title)
      else {
        const words = lowerJob.split(/[\s\/]+/);
        for (const word of words) {
          if (word.startsWith(lowerSearch)) {
            score = 300;
            break;
          }
        }
      }

      // Additional scoring: character-by-character matching
      if (score === 0) {
        let searchIndex = 0;
        for (let i = 0; i < lowerJob.length && searchIndex < lowerSearch.length; i++) {
          if (lowerJob[i] === lowerSearch[searchIndex]) {
            searchIndex++;
            score += 5;
          }
        }
        // Boost score if all characters matched
        if (searchIndex === lowerSearch.length) {
          score += 50;
        }
      }

      return { job, score };
    });

    // Filter out jobs with no score and sort by score descending
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.job);
  }

  selectJobRole(jobRole) {
    const normalizedRole = this.normalizeRoleSpacing(jobRole);
    if (!normalizedRole) {
      return;
    }

    if (!/[a-zA-Z]/.test(normalizedRole)) {
      const dropdown = this.panel.querySelector('#job-role-dropdown');
      if (dropdown) {
        dropdown.innerHTML = '<div class="job-role-dropdown-item" style="color: #c82333;">Role must include at least one letter.</div>';
        dropdown.classList.add('show');
      }
      return;
    }

    if (normalizedRole.length > this.maxJobRoleLength) {
      const dropdown = this.panel.querySelector('#job-role-dropdown');
      if (dropdown) {
        dropdown.innerHTML = `<div class="job-role-dropdown-item" style="color: #c82333;">Role is too long. Max ${this.maxJobRoleLength} characters.</div>`;
        dropdown.classList.add('show');
      }
      return;
    }

    // Prevent duplicates (case-insensitive)
    const hasRole = this.selectedJobRoles.some(role =>
      this.normalizeRoleSpacing(role).toLowerCase() === normalizedRole.toLowerCase()
    );
    if (hasRole) {
      this.clearJobRoleInputAndDropdown();
      return;
    }

    if (this.selectedJobRoles.length >= this.maxSelectedJobRoles) {
      const dropdown = this.panel.querySelector('#job-role-dropdown');
      if (dropdown) {
        dropdown.innerHTML = `<div class="job-role-dropdown-item" style="color: #c82333;">Max ${this.maxSelectedJobRoles} roles reached. Remove one to add another.</div>`;
        dropdown.classList.add('show');
      }
      return;
    }

    this.selectedJobRoles.push(normalizedRole);

    this.clearJobRoleInputAndDropdown();
    this.renderSelectedJobRoles();
    this.saveJobRolePreferences();
  }

  clearJobRoleInputAndDropdown() {
    // Update search input
    const searchInput = this.panel.querySelector('#job-role-search');
    if (searchInput) {
      searchInput.value = '';
    }

    // Hide dropdown
    const dropdown = this.panel.querySelector('#job-role-dropdown');
    if (dropdown) {
      dropdown.classList.remove('show');
      dropdown.innerHTML = '';
    }
  }

  renderSelectedJobRoles() {
    const selectedDisplay = this.panel.querySelector('#selected-job-role');
    if (!selectedDisplay) {
      return;
    }

    if (this.selectedJobRoles.length === 0) {
      selectedDisplay.classList.remove('show');
      selectedDisplay.innerHTML = '';
      return;
    }

    const chips = this.selectedJobRoles
      .map((role, index) => {
        const displayRole = this.truncateRoleForDisplay(role);
        return `
        <span class="selected-role-chip">
          <span title="${this.escapeHtml(role)}"><strong>${this.escapeHtml(displayRole)}</strong></span>
          <button class="clear-selection" data-role-index="${index}" title="Remove role">×</button>
        </span>
      `;
      })
      .join('');

    selectedDisplay.innerHTML = `${chips}<button class="clear-all-roles" title="Clear all selected roles">Clear all</button>`;
    selectedDisplay.classList.add('show');

    selectedDisplay.querySelectorAll('.clear-selection').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.getAttribute('data-role-index'), 10);
        if (!Number.isNaN(index)) {
          this.removeJobRole(index);
        }
      });
    });

    const clearAllBtn = selectedDisplay.querySelector('.clear-all-roles');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.clearJobRoleSelection();
      });
    }
  }

  removeJobRole(index) {
    if (index < 0 || index >= this.selectedJobRoles.length) {
      return;
    }

    this.selectedJobRoles.splice(index, 1);
    this.renderSelectedJobRoles();
    this.saveJobRolePreferences();
  }

  clearJobRoleSelection() {
    this.selectedJobRoles = [];

    // Clear search input
    const searchInput = this.panel.querySelector('#job-role-search');
    if (searchInput) {
      searchInput.value = '';
    }

    // Hide selected display
    const selectedDisplay = this.panel.querySelector('#selected-job-role');
    if (selectedDisplay) {
      selectedDisplay.classList.remove('show');
      selectedDisplay.innerHTML = '';
    }

    // Save to storage
    this.saveJobRolePreferences();
  }

  truncateRoleForDisplay(role) {
    const text = (role || '').trim();
    if (text.length <= this.maxRoleChipDisplayLength) {
      return text;
    }
    return `${text.slice(0, this.maxRoleChipDisplayLength)}...`;
  }

  sanitizeRoleInput(value) {
    return (value || '').replace(/[^a-zA-Z0-9 ]/g, '');
  }

  normalizeRoleSpacing(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  saveJobRolePreferences() {
    chrome.storage.local.set({
      selectedJobRoles: this.selectedJobRoles,
      // Keep backward compatibility for existing reads.
      selectedJobRole: this.selectedJobRoles[0] || null
    });
  }

  loadFilterStates() {
    chrome.storage.local.get(['filterStates', 'selectedJobRole', 'selectedJobRoles', 'resumeFileName', 'resumeText', 'resumeSummary', 'contactFullName', 'contactEmail', 'contactPhone', 'contactLocation', 'handshakePlusScreeningFacts', 'handshakePlusClaudeUrl', 'handshakePlusGeminiUrl', 'handshakePlusCustomAiInstructions'], (result) => {
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

      // Load selected job roles (supports both old and new storage format)
      if (Array.isArray(result.selectedJobRoles) && result.selectedJobRoles.length > 0) {
        this.selectedJobRoles = result.selectedJobRoles
          .map(role => (role || '').trim())
          .filter(role => role)
          .slice(0, this.maxSelectedJobRoles);
      } else if (result.selectedJobRole) {
        this.selectedJobRoles = [result.selectedJobRole.trim()].filter(role => role);
      } else {
        this.selectedJobRoles = [];
      }

      this.renderSelectedJobRoles();

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
          statusEl.className = 'resume-status success';
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

  getSelectedJobRole() {
    return this.selectedJobRoles[0] || null;
  }

  getSelectedJobRoles() {
    return [...this.selectedJobRoles];
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async handleResumeUpload(file) {
    const statusEl = this.panel.querySelector('#resume-status');
    const fileNameEl = this.panel.querySelector('#resume-file-name');

    try {
      // Show loading status
      statusEl.textContent = 'Parsing resume...';
      statusEl.className = 'resume-status loading';

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
        statusEl.className = 'resume-status loading';

        // Generate resume summary via the selected AI tab provider.
        try {
          const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: 'summarizeResume',
              resumeText: resumeText
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
      statusEl.className = 'resume-status success';
      
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
      statusEl.className = 'resume-status error';

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
