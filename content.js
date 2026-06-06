// Content script - Executes commands from background service worker

function getCompanyElement() {
  // 1. Explicit native attributes on links/images (Immune to text truncation & CSS class rotation)
  const ariaLink = document.querySelector('a[href*="/e/"][aria-label], a[href*="/employers/"][aria-label]');
  if (ariaLink) {
    const label = ariaLink.getAttribute('aria-label');
    if (label && label.length > 1) {
      // Create a dummy element to satisfy the downstream textContent.trim() expectations
      const dummy = document.createElement('div');
      dummy.textContent = label;
      return dummy;
    }
  }

  const logoImg = document.querySelector('img[alt*="logo" i]');
  if (logoImg) {
    const alt = logoImg.getAttribute('alt').replace(/logo/i, '').trim();
    if (alt && alt.length > 1) {
      const dummy = document.createElement('div');
      dummy.textContent = alt;
      return dummy;
    }
  }

  // 2. Fallback to extracting textual nodes
  const selectors = [
    '[data-hook="employer-name"]',
    '[data-testid="employer-name"]',
    'h1 a[href*="/e/"], h1 a[href*="/employers/"]',
    'h2 a[href*="/e/"], h2 a[href*="/employers/"]',
    'h3 a[href*="/e/"], h3 a[href*="/employers/"]',
    'div[class*="employer" i] a',
    '.job-details-header h2',
    'div[title="employer name"]',
    'div[role="dialog"] a[href*="/e/"]'
  ];
  for (let s of selectors) {
    const el = document.querySelector(s);
    if (el && el.textContent.trim()) return el;
  }

  // Hard fallback: Look for any strong employer links 
  const links = Array.from(document.querySelectorAll('a[href*="/e/"], a[href*="/employers/"]')).filter(a => a.textContent.trim().length > 1);
  if (links.length > 0) {
    const headingLink = links.find(a => a.closest('h1, h2, h3, h4, h5, h6'));
    if (headingLink) return headingLink;
    return links[links.length > 1 ? 1 : 0];
  }

  return null;
}

function getSummaryElement() {
  const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b'));

  function getSectionContentElement(header) {
    if (!header) return null;

    const parent = header.parentElement;
    if (parent && parent !== document.body) {
      const parentText = parent.textContent.trim();
      const headerText = header.textContent.trim();
      const headingCount = parent.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
      if (parentText.length - headerText.length > 30 && headingCount <= 1) {
        return parent;
      }
    }

    let nextEl = header.nextElementSibling;
    if (!nextEl || nextEl.textContent.trim().length < 50) {
      if (header.parentElement && header.parentElement.nextElementSibling) {
        nextEl = header.parentElement.nextElementSibling;
      }
    }
    return nextEl || null;
  }

  // Prefer the real employer-written job description over Handshake's short AI summary.
  const jobDescriptionHeaders = headers.filter(el => {
    const txt = el.textContent.toLowerCase().trim();
    return txt === 'job description' || txt.includes('about the role') || txt.includes('role description');
  });

  let bestDescriptionEl = null;
  let bestDescriptionLen = 0;
  for (const header of jobDescriptionHeaders) {
    const candidate = getSectionContentElement(header);
    const len = candidate ? candidate.textContent.trim().length : 0;
    if (len > bestDescriptionLen) {
      bestDescriptionLen = len;
      bestDescriptionEl = candidate;
    }
  }

  if (bestDescriptionEl && bestDescriptionLen > 50) return bestDescriptionEl;

  // Summary is only a fallback because it is often a short generated preview.
  const summaryHeader = headers.find(el => el.textContent.toLowerCase().trim() === 'summary');
  if (summaryHeader) {
    const nextEl = getSectionContentElement(summaryHeader);
    if (nextEl && nextEl.textContent.trim().length > 30) {
      return nextEl;
    }
  }

  // 2. Direct Handshake Markdown Container Check (Job Description Fallback)
  // Handshake's markdown compiler universally injects this specific inline style to wrap the massive raw job text payload
  const breakWordContainers = Array.from(document.querySelectorAll('div[style*="overflow-wrap: break-word"]'));
  if (breakWordContainers.length > 0) {
    const largestContainer = breakWordContainers.reduce((prev, current) =>
      (prev.textContent.trim().length > current.textContent.trim().length) ? prev : current
    );
    if (largestContainer.textContent.trim().length > 100) {
      return largestContainer;
    }
  }

  // 3. Fallbacks targeting Handshake's specific modal container patterns
  const selectors = [
    '[data-job-description]',
    '#job-description',
    '[data-hook="job-description"]',
    '[data-testid*="description" i]',
    'div[class*="description" i]',
    'div.show-more-content'
  ];
  for (let s of selectors) {
    const el = document.querySelector(s);
    if (el && el.textContent.trim().length > 50) return el;
  }

  return null;
}

function getJobSummaryText() {
  const summaryEl = getSummaryElement();
  if (!summaryEl) return '';

  const rawText = summaryEl.innerText || summaryEl.textContent || '';
  const helper = window.HandshakePlusJobDescriptions;
  return helper ? helper.cleanJobDescriptionText(rawText) : rawText.trim();
}

function findJobDescriptionExpandControls(summaryEl) {
  const helper = window.HandshakePlusJobDescriptions;
  if (!helper || !summaryEl) return [];

  const roots = [];
  let current = summaryEl;
  for (let i = 0; current && i < 4; i++) {
    roots.push(current);
    current = current.parentElement;
  }

  const controls = [];
  for (const root of roots) {
    const candidates = root.querySelectorAll
      ? root.querySelectorAll('button, [role="button"], a')
      : [];
    for (const candidate of candidates) {
      if (helper.isLikelyDescriptionExpandControl(candidate) && !controls.includes(candidate)) {
        controls.push(candidate);
      }
    }
  }

  return controls;
}

async function expandJobDescriptionIfNeeded() {
  const summaryEl = getSummaryElement();
  const controls = findJobDescriptionExpandControls(summaryEl);
  if (controls.length === 0) return false;

  const beforeText = getJobSummaryText();
  let clicked = false;
  for (const control of controls) {
    try {
      simulateRealClick(control);
      clicked = true;
    } catch (e) {
      try {
        control.click();
        clicked = true;
      } catch (e2) {}
    }
  }

  if (clicked) {
    const start = Date.now();
    while (Date.now() - start < 2000) {
      await sleep(200);
      const afterText = getJobSummaryText();
      const remainingControls = findJobDescriptionExpandControls(getSummaryElement());
      if (afterText.length > beforeText.length + 20 || remainingControls.length === 0) {
        break;
      }
    }
  }
  return clicked;
}

let panel = null;
let shouldStop = sessionStorage.getItem('handshake-plus-should-stop') === 'true' || false;

// Check if we're in the middle of a count check process
if (sessionStorage.getItem('handshake-plus-checking-count') === 'true') {
  // console.log('Content: Detected count check in progress');
  // We're checking count - determine which page we're on
  if (window.location.href.match(/^https:\/\/[a-z0-9-]+\.joinhandshake\.com\/apps/)) {
    // console.log('Content: On /apps page - scraping count');
    // On apps page - scrape the count and show panel
    initializePanelForCountCheck('Checking application count...');
    handleAppsPageForCount();
  } else if (window.location.href.match(/^https:\/\/[a-z0-9-]+\.joinhandshake\.com\/job-search/)) {
    // console.log('Content: Back on job-search page - sending signal');
    // Back on job search page - retrieve count and notify background
    handleReturnFromCountCheck();
  }
}

// Initialize panel globally on any Handshake page to lower onboarding friction (excluding SSO/Auth screens)
if (window.location.href.match(/^https:\/\/[a-z0-9-]+\.joinhandshake\.com\//) && !window.location.href.includes('/login')) {
  // Ensure query parameter exists in URL only if we are on the actual job search board
  if (window.location.href.includes('/job-search')) {
    ensureQueryParameter();
  }

  initializePanel();
  autoHidePromotedJobs();
}

function autoHidePromotedJobs() {
  function tryHide() {
    const hidePromoted = localStorage.getItem('handshake-plus-hide-promoted');
    if (hidePromoted === 'false') return;
    var cards = findAllJobCards();
    if (cards.length > 0) hidePromotedJobCards(cards);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(tryHide, 2000); });
  } else {
    setTimeout(tryHide, 2000);
  }
  setTimeout(tryHide, 5000);
  setTimeout(tryHide, 10000);
  // Intercept pushState/replaceState for own-code navigation (isolated world only)
  var origPushState = history.pushState;
  history.pushState = function() {
    origPushState.apply(this, arguments);
    setTimeout(tryHide, 2500);
    setTimeout(tryHide, 5000);
  };
  var origReplaceState = history.replaceState;
  history.replaceState = function() {
    origReplaceState.apply(this, arguments);
    setTimeout(tryHide, 2500);
    setTimeout(tryHide, 5000);
  };
  // Poll for URL changes from the page's SPA navigation — content script's pushState
  // patch is isolated from the page world so React Router bypasses it entirely.
  var lastUrl = window.location.href;
  setInterval(function() {
    var currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      setTimeout(tryHide, 2500);
      setTimeout(tryHide, 5000);
    }
  }, 1000);
}

function ensureQueryParameter() {
  const url = new URL(window.location.href);

  // If no 'query' parameter exists, add query= (space)
  if (!url.searchParams.has('query')) {
    url.searchParams.set('query', ' ');
    // Replace current URL without reloading the page
    window.history.replaceState({}, '', url.toString());
    // console.log('Added query= (space) parameter to URL');
  }
}

function initializePanel() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPanel);
  } else {
    createPanel();
  }
}

function createPanel() {
  if (panel) {
    return;
  }

  if (!window.HandshakePlusPanel) {
    // console.error('Handshake Plus: HandshakePlusPanel class not found!');
    return;
  }

  panel = new window.HandshakePlusPanel();

  panel.onStart = () => {
    // Get active filters from panel
    const activeFilters = panel.getActiveFilters();
    
    // If the user starts the extension on a non-job page natively, mathematically enforce the job search domain parameters!
    const origin = window.location.origin;
    const isJobSearch = window.location.href.includes('/job-search');
    const currentUrl = new URL(isJobSearch ? window.location.href : origin + '/job-search');

    const filterConfigs = [
      { key: 'qualifications', param: 'qualifications' },
      { key: 'jobTypes', param: 'jobType' },
      { key: 'employmentTypes', param: 'employmentTypes' },
      { key: 'remoteWork', param: 'remoteWork' },
      { key: 'workAuthorization', param: 'workAuthorization' }
    ];

    // Only override categories that have at least one panel-selected value.
    const categoriesToOverride = filterConfigs.filter(({ key }) => {
      const selectedValues = activeFilters[key] || [];
      return selectedValues.length > 0;
    });

    // URL update is needed only when an overridden category differs from existing URL values.
    const needsUpdate = categoriesToOverride.some(({ key, param }) => {
      const selectedValues = activeFilters[key] || [];
      const existingValues = currentUrl.searchParams.getAll(param);
      return !arraysEqual(selectedValues, existingValues);
    });

    if (needsUpdate) {
      // Update only categories selected in panel; preserve existing values for empty categories.
      // Leave all non-filter query params (page, per_page, search, etc.) untouched.
      categoriesToOverride.forEach(({ key, param }) => {
        currentUrl.searchParams.delete(param);
        (activeFilters[key] || []).forEach(value => {
          currentUrl.searchParams.append(param, value);
        });
      });

      // Ensure query parameter exists
      if (!currentUrl.searchParams.has('query')) {
        currentUrl.searchParams.set('query', ' ');
      }

      // Save the filter URL to navigate to after count check
      sessionStorage.setItem('handshake-plus-filter-url', currentUrl.toString());
      // console.log('Content: Saved filter URL for later:', currentUrl.toString());
    }

    // --- CAPTURE USER URL SEARCH PARAMS ---
    // Only mathematically overwrite persistent storage if we are physically on the Job board OR if the user manually activated new panel filters.
    if (isJobSearch || needsUpdate) {
      const paramsToSave = new URLSearchParams(currentUrl.search);

      // Handshake React SPA Bug Fix: If the user manually erased the search bar text but hasn't pressed Enter, 
      // the system URL won't reflect the deletion. We physically scrape the live DOM input to successfully override the URL state!
      const searchbox = document.querySelector('input[type="search"], input[placeholder*="Search"]');
      if (searchbox) {
        const liveQuery = searchbox.value.trim();
        if (liveQuery === '') {
          paramsToSave.set('query', ' '); // Force a blank override
        } else {
          paramsToSave.set('query', liveQuery);
        }
      }

      paramsToSave.delete('page');
      paramsToSave.delete('per_page');
      try {
        chrome.storage.local.set({
          savedHandshakeQueryParams: paramsToSave.toString(),
          savedHandshakePath: currentUrl.pathname
        });
      } catch (e) {}
    }

    startApplyingFromPanel();
  };

  panel.onStop = () => {
    shouldStop = true;
    sessionStorage.setItem('handshake-plus-should-stop', 'true'); // Persist across page navigation
    try {
      chrome.runtime.sendMessage({ action: 'stopApplying' });
    } catch (e) {
      // Extension context invalidated, ignore
    }
    if (panel) {
      panel.setApplying(false);
    }
  };

  // Sync panel state with background on page load
  try {
    chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
      if (!response) return;
      if (response.isProcessing) {
        panel.setApplying(true);
      }
      // Always show today's count if there's anything to report
      if (response.isProcessing || (response.appliedCount || 0) > 0) {
        panel.updateProgress(response.appliedCount || 0);
      }
      if (!response.isProcessing) {
        refreshTodayApplicationCount();
      }
    });
  } catch (e) {
    // Extension context invalidated, ignore
  }

  // Check if we should auto-start after filter URL update
  if (sessionStorage.getItem('handshake-plus-auto-start') === 'true') {
    sessionStorage.removeItem('handshake-plus-auto-start');
    // Auto-start after a brief delay to let page fully load
    setTimeout(() => {
      if (panel && panel.onStart) {
        panel.onStart();
      }
    }, 1000);
  }
}

async function refreshTodayApplicationCount() {
  if (!panel || !window.location.href.includes('joinhandshake.com')) return;
  if (!window.location.pathname.includes('/job-search')) return;
  if (document.hidden) return;

  try {
    const response = await chrome.runtime.sendMessage({ action: 'refreshTodayApplicationCountFromAppsPage' });
    if (response && response.success && Number.isFinite(response.appliedCount)) {
      panel.updateProgress(response.appliedCount);
    }
  } catch (e) {}
}

async function startApplyingFromPanel() {
  // Pre-start validation: don't auto-apply with missing essentials.
  const validation = await chrome.storage.local.get(['resumeText', 'resumeSummary', 'contactEmail']);
  if (!getResumePromptText(validation)) {
    if (panel) panel.updateStatus('Add a resume in the Profile tab before applying.', false);
    HandshakePlusLog.warn('start', 'blocked: no resume');
    return;
  }
  if (!(validation.contactEmail || '').trim()) {
    if (panel) panel.updateStatus('Add your contact email in the Profile tab before applying.', false);
    HandshakePlusLog.warn('start', 'blocked: no contact email');
    return;
  }

  shouldStop = false;
  sessionStorage.removeItem('handshake-plus-should-stop');
  try {
    chrome.runtime.sendMessage({ action: 'startApplying' });
  } catch (e) {
    // Extension context invalidated, ignore
  }
  if (panel) {
    panel.setApplying(true);
  }
}

function initializePanelForCountCheck(statusMessage) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => createPanelForCountCheck(statusMessage));
  } else {
    createPanelForCountCheck(statusMessage);
  }
}

function createPanelForCountCheck(statusMessage) {
  if (panel) {
    return;
  }

  if (!window.HandshakePlusPanel) {
    // console.error('Handshake Plus: HandshakePlusPanel class not found!');
    return;
  }

  panel = new window.HandshakePlusPanel();

  // Show "Stop" button since operation is in progress
  panel.setApplying(true);
  panel.updateStatus(statusMessage, true);

  panel.onStart = () => {
    startApplyingFromPanel();
  };

  panel.onStop = () => {
    shouldStop = true;
    sessionStorage.setItem('handshake-plus-should-stop', 'true'); // Persist across page navigation
    try {
      chrome.runtime.sendMessage({ action: 'stopApplying' });
    } catch (e) {
      // Extension context invalidated, ignore
    }
    if (panel) {
      panel.setApplying(false);
    }
  };
}

// Listen for commands from background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Ping/pong to verify content script is loaded
  if (message.action === 'ping') {
    sendResponse({ success: true, loaded: true });
    return false;
  }

  if (message.action === 'processPage') {
    processPage(message.pageNum, message.startJobIndex).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep channel open
  }

  if (message.action === 'goToNextPage') {
    // Send response immediately before navigation (page will reload)
    sendResponse({ success: true });
    goToNextPage(message.pageNum);
    return false; // Don't keep channel open since we're navigating away
  }

  if (message.action === 'checkTodayApplications') {
    checkTodayApplicationCount();
    return false;
  }

  if (message.action === 'scrapeTodayApplicationsFromAppsPage') {
    scrapeTodayApplicationCountFromAppsPage().then(count => {
      sendResponse({ success: true, count });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message.action === 'aiStatus') {
    if (panel) panel.updateStatus(message.text, true);
    return false;
  }

  if (message.action === 'updateStats' || message.action === 'updateProgress') {
    if (panel) {
      const count = message.appliedCount || message.count || 0;
      panel.updateProgress(count);
    }
  }

  if (message.action === 'countCheckFailed') {
    shouldStop = true;

    if (panel) {
      panel.setApplying(false);
      panel.updateStatus('Error: Could not retrieve application count. Please try again.', false);
    }

    sendResponse({ success: true });
    return false;
  }
});

async function processPage(pageNum, startJobIndex) {
  const JOB_NAVIGATION_SETTLE_MS = 2500;
  const JOB_DETAILS_TIMEOUT_MS = 25000;
  const APPLY_BUTTON_TIMEOUT_MS = 30000;

  // Find all job cards on current page with retries (DOM might not be loaded yet)
  const MAX_LOAD_RETRIES = 5;
  let jobCards = [];

  for (let attempt = 1; attempt <= MAX_LOAD_RETRIES; attempt++) {
    jobCards = findAllJobCards();

    if (jobCards.length > 0) {
      break; // Found job cards, proceed
    }

    if (attempt < MAX_LOAD_RETRIES) {
      await sleep(2000); // Wait 2 seconds before retry
    }
  }

  if (jobCards.length === 0) {
    // console.log('Content: ⚠️ No job cards found after all retries. Page may be empty or DOM failed to load.');
    // No jobs found after retries, tell background we're done
    try {
      chrome.runtime.sendMessage({ action: 'pageComplete' });
    } catch (e) {
      // Extension context invalidated, ignore
    }
    return;
  }

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

  await applyAiJobFitFilterToPage(jobCards);

  if (jobCards.length === 0) {
    // All jobs on this page were promoted (or filtered), move to next page
    try {
      chrome.runtime.sendMessage({ action: 'pageComplete' });
    } catch (e) {}
    return;
  }

  async function waitForJobDetailsToLoad(timeoutMs, previousSummaryText = '') {
    const startTime = Date.now();
    // console.log("Content: Waiting for job details (summary) to render before proceeding...");
    while (Date.now() - startTime < timeoutMs) {
      const summaryEl = getSummaryElement();

      // We only strictly gate on the Summary block natively. Company Name has a document.title fallback.
      if (summaryEl) {
        const summaryText = (summaryEl.innerText || summaryEl.textContent || '').trim();
        if (previousSummaryText && summaryText === previousSummaryText) {
          await sleep(400);
          continue;
        }
        await expandJobDescriptionIfNeeded();
        // console.log("Content: Job details rendered successfully.");
        return true;
      }

      await sleep(400);
    }
    // console.warn("Content: Timed out waiting for job details to render.");
    return false;
  }

  // Start keepalive interval to prevent service worker from sleeping
  const keepaliveInterval = setInterval(() => {
    try {
      chrome.runtime.sendMessage({ action: 'keepalive' });
    } catch (e) {
      // Extension context invalidated, ignore
    }
  }, 20000); // Send keepalive every 20 seconds
  // Dynamic Index Fast-Forwarding:
  // If the user manually clicked a job in the middle of the list before pressing "Start",
  // intelligently intercept that specific Job ID natively from the React SPA URL router 
  // and fast-forward the physical execution iterator to match their actual visual position.
  if (startJobIndex === 0) {
    const activeUrlMatch = window.location.pathname.match(/\/(?:job-search|stu\/jobs)\/(\d+)/);
    if (activeUrlMatch && activeUrlMatch[1]) {
      const activeJobId = activeUrlMatch[1];
      const foundIndex = jobCards.findIndex(card => {
        const href = card.getAttribute('href');
        return href && href.includes(activeJobId);
      });
      if (foundIndex > 0) {
        // console.log(`Content: Detected user actively viewing Job ID ${activeJobId} at index ${foundIndex}. Fast-forwarding the execution queue to explicitly resume at this card.`);
        startJobIndex = foundIndex;
      }
    }
  }

  // Process each job starting from startJobIndex
  for (let i = startJobIndex; i < jobCards.length; i++) {
    // Check if we should stop
    if (shouldStop) {
      clearInterval(keepaliveInterval);
      return;
    }

    const jobCard = jobCards[i];

    if (isAiJobFitHidden(jobCard)) {
      try {
        const reason = jobCard.getAttribute('data-handshake-plus-ai-fit-reason') || 'AI job fit';
        const response = await chrome.runtime.sendMessage({
          action: 'jobProcessed',
          status: `Skipped (AI job fit${reason ? ': ' + reason : ''})`,
          nextJobIndex: i + 1
        });
        if (response && response.shouldStop) {
          shouldStop = true;
          clearInterval(keepaliveInterval);
          return;
        }
      } catch (e) {}
      continue;
    }


    // Scroll to the job card
    jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(800);

    // Check again after sleep
    if (shouldStop) {
      clearInterval(keepaliveInterval);
      return;
    }

    // Get the job card's href
    const jobHref = jobCard.getAttribute('href');

    // Navigate to the job
    const currentUrl = window.location.href;
    const jobPath = jobHref.split('?')[0];
    const willNavigate = !currentUrl.includes(jobPath);
    const previousSummaryText = willNavigate ? getJobSummaryText() : '';

    if (willNavigate) {
      const fullUrl = window.location.origin + jobHref;
      window.history.pushState({}, '', fullUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
      await sleep(JOB_NAVIGATION_SETTLE_MS);
    }

    // Check again after navigation
    if (shouldStop) {
      clearInterval(keepaliveInterval);
      return;
    }

    // Wait for the new right pane and Apply button with generous retries. Handshake's
    // React detail pane can lag behind URL changes, especially on slow network/hydration.
    const detailsLoadedPromise = waitForJobDetailsToLoad(JOB_DETAILS_TIMEOUT_MS, previousSummaryText);
    let applyStatus = await waitForApplyButtonWithRetries(APPLY_BUTTON_TIMEOUT_MS);
    let detailsLoaded = await detailsLoadedPromise;

    // Track whether we actually clicked Apply in THIS iteration
    let didClickApply = false;
    let applyFailReason = '';

    // If can apply, click Apply button and close modal
    if (applyStatus === 'Can apply') {
      // WAIT FOR SPA TO RENDER JOB DETAILS BEFORE SPAWNING MODAL
      if (!detailsLoaded) {
        detailsLoaded = await waitForJobDetailsToLoad(JOB_DETAILS_TIMEOUT_MS, previousSummaryText);
      }

      // If the right pane essentially never loads, the AI has nothing to read. Safely drop the job and sweep forward.
      if (!detailsLoaded) {
        // console.warn('Content: Skipping job because details failed to render within timeout window.');
        applyStatus = 'Application failed';
        didClickApply = false;
      } else {
        // Check if "Applied on" exists BEFORE clicking (to detect already-applied jobs)
        const appliedOnBeforeClick = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
          .find(el => el.textContent.trim().startsWith('Applied on'));

        if (appliedOnBeforeClick) {
          applyStatus = 'Already applied';
        } else {
          // Job not yet applied, proceed to click Apply
          const applyResult = await clickApplyAndCloseModal();

          // REQUIREMENT: Modal must appear and successfully close for us to count this as a valid submission attempt
          if (!applyResult || !applyResult.ok) {
            applyFailReason = (applyResult && applyResult.reason) || '';
            applyStatus = applyFailReason.startsWith('dry-run')
              ? 'Would apply (dry run)'
              : 'Application failed';
          } else {
            didClickApply = true; // Mark that we actually clicked Apply AND modal appeared

            // Since the application modal successfully processed and cleanly dismissed itself, we
            // confidently record an application completion without aggressively polling the shifting DOM.
            applyStatus = 'Successfully applied';
          }
        }
      }
    }

    // FINAL SAFETY CHECK: Never report "Successfully applied" unless we actually clicked Apply
    if (applyStatus === 'Successfully applied' && !didClickApply) {
      // console.log('Content: ⚠️ SAFETY CHECK: Status was "Successfully applied" but we did not click Apply. Changing to "Already applied".');
      applyStatus = 'Already applied';
    }

    if (applyStatus === 'Successfully applied' && localStorage.getItem('handshake-plus-hide-after-apply') === 'true') {
      hideJobCardAfterSuccessfulApply(jobCard);
    }

    // Check again before reporting
    if (shouldStop) {
      clearInterval(keepaliveInterval);
      return;
    }

    // Surface the per-job outcome (and skip reason) in the panel.
    if (panel) {
      const label = applyFailReason ? `${applyStatus} — ${applyFailReason}` : applyStatus;
      panel.updateStatus(label, applyStatus === 'Successfully applied');
    }
    HandshakePlusLog.log('job', applyStatus, applyFailReason ? '— ' + applyFailReason : '');

    // Tell background this job is processed and wait for response
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'jobProcessed',
        status: applyStatus,
        reason: applyFailReason,
        nextJobIndex: i + 1
      });

      // Check if background says to stop (limit reached)
      if (response && response.shouldStop) {
        shouldStop = true;
        clearInterval(keepaliveInterval);
        return;
      }
    } catch (e) {
      HandshakePlusLog.error('job', 'jobProcessed message failed', e);
    }

    // Randomized human-like pause after an actual submission (reliability + anti-bot).
    if (applyStatus === 'Successfully applied') {
      const jitter = getInterApplyDelayMs();
      if (jitter > 0) {
        HandshakePlusLog.log('job', 'inter-apply delay', jitter, 'ms');
        await sleep(jitter);
      }
    }

    await sleep(500);
  }

  // All jobs on this page are done
  clearInterval(keepaliveInterval); // Stop keepalive messages

  try {
    chrome.runtime.sendMessage({ action: 'pageComplete' });
  } catch (e) {
    // Extension context invalidated, ignore
  }
}

async function goToNextPage(pageNum) {
  // Preserve all existing URL parameters and only update the page parameter
  const url = new URL(window.location.href);
  url.searchParams.set('page', pageNum);

  // Set per_page if it doesn't already exist
  if (!url.searchParams.has('per_page')) {
    url.searchParams.set('per_page', '25');
  }

  // Set query if it doesn't already exist
  if (!url.searchParams.has('query')) {
    url.searchParams.set('query', ' ');
  }

  const newUrl = url.toString();
  window.location.href = newUrl;

  // Note: Page will reload, so this function won't continue after this point
  // The background script waits 3 seconds for the page to load before continuing
  return true;
}

async function fetchApplicationCount() {
  const origin = window.location.origin.includes('joinhandshake') ? window.location.origin : 'https://app.joinhandshake.com';
  const today = new Date();
  const countHelper = window.HandshakePlusApplicationCount;

  let count = 0;
  let hasNextPage = true;
  let endCursor = null;

  while (hasNextPage) {
    const response = await fetch(origin + '/hs/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: 'query($first: Int, $after: String) { applicationSearch(first: $first, after: $after) { totalCount pageInfo { hasNextPage endCursor } edges { node { id createdAt } } } }',
        variables: { first: 50, after: endCursor }
      })
    });

    if (!response.ok) {
      throw new Error(`Application count request failed with ${response.status}`);
    }
    const json = await response.json();
    const apps = json.data?.applicationSearch;
    if (!apps || !Array.isArray(apps.edges)) {
      throw new Error('Application count response did not include applicationSearch edges');
    }

    if (countHelper) {
      const pageCount = countHelper.countApplicationsForLocalDate(apps.edges, today);
      count += pageCount.count;
      if (pageCount.sawOlderApplication) {
        hasNextPage = false;
      }
    } else {
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      for (let i = 0; i < apps.edges.length; i++) {
        if (apps.edges[i].node.createdAt.startsWith(todayStr)) {
          count++;
        } else {
          hasNextPage = false;
          break;
        }
      }
    }

    if (!hasNextPage) break;
    hasNextPage = apps.pageInfo.hasNextPage;
    endCursor = apps.pageInfo.endCursor;
    if (apps.edges.length === 0) break;
  }

  return count;
}

async function checkTodayApplicationCount() {

  // Get today's date in YYYY-MM-DD format (local timezone)
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;

  // Save state in sessionStorage before navigation
  const currentUrl = new URL(window.location.href);

  // Ensure query parameter exists in the saved URL
  if (!currentUrl.searchParams.has('query')) {
    currentUrl.searchParams.set('query', ' ');
  }

  const originalUrl = currentUrl.toString();
  sessionStorage.setItem('handshake-plus-checking-count', 'true');
  sessionStorage.setItem('handshake-plus-original-url', originalUrl);
  sessionStorage.setItem('handshake-plus-check-date', dateString);


  // Navigate to apps page (use current domain)
  const currentDomain = window.location.origin; // e.g., https://cornell.joinhandshake.com
  const appsUrl = `${currentDomain}/apps?start_date=${dateString}&per_page=25&page=1`;
  window.location.href = appsUrl;

  // Note: Function ends here - page will reload
  // The count will be scraped by handleAppsPageForCount() after reload
}

function handleAppsPageForCount() {

  // Check if user stopped before we even start
  if (shouldStop) {
    sessionStorage.removeItem('handshake-plus-checking-count');
    sessionStorage.removeItem('handshake-plus-original-url');
    sessionStorage.removeItem('handshake-plus-check-date');
    sessionStorage.removeItem('handshake-plus-should-stop');
    return;
  }

  // Wait for page to fully load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrapeCountAndNavigateBack);
  } else {
    // Already loaded, wait a bit for React to render
    setTimeout(scrapeCountAndNavigateBack, 3000);
  }
}

function getAppsPageTotalCount() {
  let summaryElement = document.querySelector('.sc-dbGJXk.gLFZFI');
  if (!summaryElement) {
    const allSpans = document.querySelectorAll('span');
    for (const span of allSpans) {
      const text = span.textContent.trim();
      if (text.match(/\d+[-–]\d+ of \d+/)) {
        summaryElement = span;
        break;
      }
    }
  }

  if (!summaryElement) return 0;
  const text = summaryElement.textContent.trim();
  const match = text.match(/of (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

async function scrapeTodayApplicationCountFromAppsPage() {
  const start = Date.now();
  while (Date.now() - start < 10000) {
    const totalApps = getAppsPageTotalCount();
    if (totalApps > 0) return totalApps;

    const dateColumns = document.querySelectorAll('td[headers="applicationDate"]');
    if (dateColumns.length > 0) {
      const today = new Date();
      const todayFormatted = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
      let count = 0;
      for (const dateColumn of dateColumns) {
        if (dateColumn.textContent.trim() === todayFormatted) count++;
      }
      return count;
    }

    await sleep(500);
  }

  throw new Error('Applications page count did not render');
}

async function scrapeCountAndNavigateBack() {

  // Get today's date in M/D/YYYY format (e.g., "1/20/2026")
  const checkDate = sessionStorage.getItem('handshake-plus-check-date'); // Format: YYYY-MM-DD

  // Parse date manually to avoid timezone issues
  const [year, month, day] = checkDate.split('-').map(Number);
  const todayFormatted = `${month}/${day}/${year}`;


  // Check if user stopped before we start counting
  if (shouldStop) {
    sessionStorage.removeItem('handshake-plus-checking-count');
    sessionStorage.removeItem('handshake-plus-original-url');
    sessionStorage.removeItem('handshake-plus-check-date');
    sessionStorage.removeItem('handshake-plus-should-stop');
    return;
  }

  const totalApps = getAppsPageTotalCount();

  if (totalApps > 0) {
    sessionStorage.setItem('handshake-plus-scraped-count', totalApps.toString());
    sessionStorage.removeItem('handshake-plus-check-page-2');
    sessionStorage.removeItem('handshake-plus-page1-count');

    const filterUrl = sessionStorage.getItem('handshake-plus-filter-url');
    const originalUrl = sessionStorage.getItem('handshake-plus-original-url');
    let targetUrl = filterUrl || originalUrl;

    if (!targetUrl || !targetUrl.includes('/job-search')) {
      try {
        chrome.storage.local.get(['savedHandshakeQueryParams'], (result) => {
          let finalUrl = window.location.origin + '/job-search';
          if (result && result.savedHandshakeQueryParams) {
            finalUrl += '?' + result.savedHandshakeQueryParams;
          }
          window.location.href = finalUrl;
        });
      } catch (e) {}
      return;
    }

    window.location.href = targetUrl;
    return;
  }

  // Count applications from today on page 1
  let count = 0;
  const dateColumns = document.querySelectorAll('td[headers="applicationDate"]');

  for (const dateColumn of dateColumns) {
    // Check if user stopped during counting
    if (shouldStop) {
      sessionStorage.removeItem('handshake-plus-checking-count');
      sessionStorage.removeItem('handshake-plus-original-url');
      sessionStorage.removeItem('handshake-plus-check-date');
      sessionStorage.removeItem('handshake-plus-should-stop');
      return;
    }

    const dateText = dateColumn.textContent.trim();

    if (dateText === todayFormatted) {
      count++;
    }
  }

  // Check what page we're on
  const currentUrl = new URL(window.location.href);
  const currentPage = parseInt(currentUrl.searchParams.get('page') || '1', 10);
  const onPage2 = sessionStorage.getItem('handshake-plus-check-page-2') === 'true';


  if (onPage2 && currentPage === 2) {

    // Get the count from page 1
    const page1Count = parseInt(sessionStorage.getItem('handshake-plus-page1-count') || '0', 10);
    count = page1Count;

    // Check first 5 entries on page 2
    for (let i = 0; i < Math.min(5, dateColumns.length); i++) {
      if (shouldStop) {
        sessionStorage.removeItem('handshake-plus-checking-count');
        sessionStorage.removeItem('handshake-plus-original-url');
        sessionStorage.removeItem('handshake-plus-check-date');
        sessionStorage.removeItem('handshake-plus-should-stop');
        sessionStorage.removeItem('handshake-plus-check-page-2');
        sessionStorage.removeItem('handshake-plus-page1-count');
        return;
      }

      const dateText = dateColumns[i].textContent.trim();

      if (dateText === todayFormatted) {
        count++;
      }
    }

    // Clean up page 2 flags
    sessionStorage.removeItem('handshake-plus-check-page-2');
    sessionStorage.removeItem('handshake-plus-page1-count');

  } else if (currentPage === 1 && totalApps > 25 && count === 25) {
    // Need to check page 2 (only if we're on page 1)

    // Check if user stopped before navigating to page 2
    if (shouldStop) {
      sessionStorage.removeItem('handshake-plus-checking-count');
      sessionStorage.removeItem('handshake-plus-original-url');
      sessionStorage.removeItem('handshake-plus-check-date');
      sessionStorage.removeItem('handshake-plus-should-stop');
      return;
    }

    // Save page 1 count and set page 2 flag
    sessionStorage.setItem('handshake-plus-page1-count', count.toString());
    sessionStorage.setItem('handshake-plus-check-page-2', 'true');

    // Navigate to page 2
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('page', '2');
    window.location.href = currentUrl.href;
    return; // Function ends here, will continue on page 2
  }

  // Check if user pressed Stop before navigating back
  if (shouldStop) {
    sessionStorage.removeItem('handshake-plus-checking-count');
    sessionStorage.removeItem('handshake-plus-original-url');
    sessionStorage.removeItem('handshake-plus-check-date');
    sessionStorage.removeItem('handshake-plus-scraped-count');
    sessionStorage.removeItem('handshake-plus-count-result');
    sessionStorage.removeItem('handshake-plus-count-ready');
    sessionStorage.removeItem('handshake-plus-should-stop');
    return;
  }

  // Save count to sessionStorage
  sessionStorage.setItem('handshake-plus-scraped-count', count.toString());

  // Retrieve saved URL parameters to guarantee we navigate specifically to the jobs board
  const filterUrl = sessionStorage.getItem('handshake-plus-filter-url');
  const originalUrl = sessionStorage.getItem('handshake-plus-original-url');
  let targetUrl = filterUrl || originalUrl;

  // Hardcode fallback to mathematically guarantee we land on the job search endpoint, even if the origin page wasn't a job board
  if (!targetUrl || !targetUrl.includes('/job-search')) {
    try {
      chrome.storage.local.get(['savedHandshakeQueryParams'], (result) => {
        let finalUrl = window.location.origin + '/job-search';
        if (result && result.savedHandshakeQueryParams) {
          finalUrl += '?' + result.savedHandshakeQueryParams;
        }
        window.location.href = finalUrl;
      });
    } catch (e) {}
    return;
  }

  // console.log('Content: Navigating back to:', targetUrl);
  window.location.href = targetUrl;
}

function handleReturnFromCountCheck() {
  // Bail out if extension context was invalidated (reloaded while count check was in progress)
  try {
    if (!chrome.runtime?.id) {
      sessionStorage.removeItem('handshake-plus-checking-count');
      sessionStorage.removeItem('handshake-plus-original-url');
      sessionStorage.removeItem('handshake-plus-filter-url');
      sessionStorage.removeItem('handshake-plus-check-date');
      sessionStorage.removeItem('handshake-plus-scraped-count');
      sessionStorage.removeItem('handshake-plus-count-result');
      sessionStorage.removeItem('handshake-plus-count-ready');
      return;
    }
  } catch (e) { return; }

  // Check if user stopped during count check
  if (shouldStop) {
    // console.log('Content: User stopped during count check, cleaning up');

    // Clean up sessionStorage
    sessionStorage.removeItem('handshake-plus-checking-count');
    sessionStorage.removeItem('handshake-plus-original-url');
    sessionStorage.removeItem('handshake-plus-filter-url');
    sessionStorage.removeItem('handshake-plus-check-date');
    sessionStorage.removeItem('handshake-plus-scraped-count');
    sessionStorage.removeItem('handshake-plus-count-result');
    sessionStorage.removeItem('handshake-plus-count-ready');
    sessionStorage.removeItem('handshake-plus-should-stop');

    return; // Don't store count result
  }

  // Get the scraped count
  const countStr = sessionStorage.getItem('handshake-plus-scraped-count');
  const count = countStr ? parseInt(countStr, 10) : 0;
  // console.log(`Content: Retrieved count from sessionStorage: ${count}`);


  // Clean up sessionStorage
  sessionStorage.removeItem('handshake-plus-checking-count');
  sessionStorage.removeItem('handshake-plus-original-url');
  sessionStorage.removeItem('handshake-plus-filter-url');
  sessionStorage.removeItem('handshake-plus-check-date');
  sessionStorage.removeItem('handshake-plus-scraped-count');

  // Store the result so the message listener can retrieve it
  sessionStorage.setItem('handshake-plus-count-result', count.toString());
  sessionStorage.setItem('handshake-plus-count-ready', 'true');

  // console.log(`Content: Storing count in chrome.storage for background script: ${count}`);

  // Store count in chrome.storage so background can poll for it (more reliable than messaging)
  chrome.storage.local.set({
    'countCheckComplete': true,
    'todayApplicationCount': count,
    'countCheckTimestamp': Date.now()
  }, () => {
    // console.log('Content: Count stored in chrome.storage successfully');

    // Also try sending a message as backup
    try {
      chrome.runtime.sendMessage({
        action: 'countCheckComplete',
        count: count
      }, (response) => {
        // console.log('Content: countCheckComplete message sent successfully', response);
      });
    } catch (e) {
      // console.error('Content: Error sending countCheckComplete message:', e);
    }
  });
}

function findAllJobCards() {
  const elements = document.querySelectorAll('a[href*="/job-search/"]');

  const jobCards = Array.from(elements).filter(el => {
    const href = el.getAttribute('href');
    return href && href.includes('/job-search/') && href.match(/\/\d+/);
  });

  return jobCards;
}

function getJobIdFromCard(jobCard) {
  const href = jobCard?.getAttribute('href') || '';
  const match = href.match(/\/(?:job-search|jobs)\/(\d+)/) || href.match(/\/(\d+)/);
  return match ? match[1] : '';
}

function cleanCardText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getJobCardContainer(jobCard) {
  if (!jobCard) return null;
  let el = jobCard;
  while (el && el !== document.body) {
    const cardCount = el.querySelectorAll
      ? el.querySelectorAll('a[href*="/job-search/"]').length
      : 0;
    const text = cleanCardText(el.innerText || el.textContent || '');
    if (cardCount === 1 && text) {
      return el;
    }
    el = el.parentElement;
  }
  return jobCard;
}

function getJobCardLines(jobCard) {
  const cardContainer = getJobCardContainer(jobCard) || jobCard;
  return (cardContainer?.innerText || cardContainer?.textContent || '')
    .split(/\n+/)
    .map(cleanCardText)
    .filter(Boolean);
}

function extractJobCardMetadata(jobCard) {
  const jobId = getJobIdFromCard(jobCard);
  const cardContainer = getJobCardContainer(jobCard) || jobCard;
  const lines = getJobCardLines(jobCard);
  const rawText = cleanCardText(lines.join(' | '));
  const titleFromButton = cleanCardText(
    cardContainer.querySelector('button[aria-label^="View "]')?.getAttribute('aria-label')?.replace(/^View\s+/i, '')
  );
  const titleFromHeading = cleanCardText(cardContainer.querySelector('h1, h2, h3, [aria-label^="View "]')?.textContent);
  const title = titleFromButton || titleFromHeading || lines.find(line => !line.match(/^(save|hide)$/i)) || '';
  const company = cleanCardText(cardContainer.querySelector('img[alt]')?.getAttribute('alt')) || lines[0] || '';
  const detailLine = lines.find(line => /\b(internship|full[- ]time|part[- ]time|paid|unpaid|\$\d)/i.test(line)) || '';
  const locationLine = lines.find(line => /\b(remote|united states|,\s*[A-Z]{2}\b|\+\s*\d+|\d+[dwkmo]+\s+ago)\b/i.test(line)) || '';
  const jobTypeMatches = rawText.match(/\b(Internship|Full-time job|Full-time|Part time|Part-time|Contract|Temporary)\b/gi) || [];

  return {
    jobId,
    company,
    title,
    details: detailLine,
    jobType: Array.from(new Set(jobTypeMatches.map(cleanCardText))).join(', '),
    location: locationLine,
    rawText: rawText.slice(0, 700)
  };
}

function hideAiSkippedJobCard(jobCard, reason) {
  if (!jobCard) return;
  const cardContainer = getJobCardContainer(jobCard) || jobCard;
  const cleanReason = cleanCardText(reason).slice(0, 60);
  jobCard.setAttribute('data-handshake-plus-ai-hidden', 'true');
  jobCard.setAttribute('data-handshake-plus-ai-fit-reason', cleanReason);
  cardContainer.setAttribute('data-handshake-plus-ai-hidden', 'true');
  cardContainer.setAttribute('data-handshake-plus-ai-fit-reason', cleanReason);
  cardContainer.style.display = 'none';
}

function isAiJobFitHidden(jobCard) {
  return jobCard?.getAttribute('data-handshake-plus-ai-hidden') === 'true' ||
    jobCard?.closest('[data-handshake-plus-ai-hidden="true"]') !== null;
}

async function applyAiJobFitFilterToPage(jobCards) {
  if (localStorage.getItem('handshake-plus-ai-job-fit-enabled') !== 'true') return;
  if (!Array.isArray(jobCards) || jobCards.length === 0) return;

  const jobs = jobCards
    .map(extractJobCardMetadata)
    .filter(job => job.jobId);

  if (jobs.length === 0) return;

  const storage = await chrome.storage.local.get(['resumeText', 'resumeSummary', 'handshakePlusAiJobFitInstructions']);
  const resumeText = getResumePromptText(storage);
  if (!resumeText) {
    if (panel) panel.updateStatus('Upload a resume before using AI job-fit filtering.', false);
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'filterJobsByFit',
      jobs,
      resumeText,
      filterInstructions: storage.handshakePlusAiJobFitInstructions || '',
      provider: localStorage.getItem('handshake-plus-ai-provider') || 'gemini'
    });

    const decisions = response?.decisions || {};
    for (const card of jobCards) {
      const jobId = getJobIdFromCard(card);
      const decision = decisions[jobId];
      if (!decision || decision.apply !== true) {
        hideAiSkippedJobCard(card, decision?.reason || 'No explicit AI approval');
      }
    }
  } catch (error) {
    for (const card of jobCards) {
      hideAiSkippedJobCard(card, 'AI filter failed');
    }
  }
}

function isPromotedJob(jobCard) {
  const promotedLabels = document.querySelectorAll('span, div');
  return Array.from(promotedLabels).some(function(label) {
    if (label.textContent.trim().toLowerCase() !== 'promoted') return false;
    let el = label.parentElement;
    while (el) {
      if (el.contains(jobCard)) {
        const cards = el.querySelectorAll('a[href*="/job-search/"]');
        const count = Array.from(cards).filter(function(c) {
          return c.getAttribute('href') && c.getAttribute('href').match(/\/\d+/);
        }).length;
        if (count <= 2) return true;
        return false;
      }
      el = el.parentElement;
    }
    return false;
  });
}

function hidePromotedJobCards(jobCards) {
  for (const card of jobCards) {
    if (!isPromotedJob(card)) continue;
    // Extract job ID from href
    const href = card.getAttribute('href') || '';
    const match = href.match(/\/(\d+)/);
    if (!match) continue;
    const jobId = match[1];
    // Click Handshake's native Hide button
    const hideBtn = document.querySelector('[data-hook="job-hide-button-' + jobId + '"]');
    if (hideBtn) {
      try {
        hideBtn.click();
      } catch (e) {}
    }
  }
}

function hideJobCardAfterSuccessfulApply(jobCard) {
  if (!jobCard) return;

  const cardContainer = jobCard.closest('li, article, [role="listitem"], [data-testid*="job"], div') || jobCard;
  cardContainer.setAttribute('data-handshake-plus-hidden-after-apply', 'true');
  cardContainer.style.display = 'none';
}

async function waitForApplyButtonWithRetries(timeoutMs = 5000) {
  const startTime = Date.now();
  const checkInterval = 500; // Check every 500ms

  while (Date.now() - startTime < timeoutMs) {
    const status = checkApplyButtonStatus();

    // If we found a definitive status (not "Unknown status"), return it
    if (status !== 'Unknown status' && status !== 'Error') {
      return status;
    }

    // Wait before next check
    await sleep(checkInterval);

    // Check if user stopped
    if (shouldStop) {
      return 'Unknown status';
    }
  }

  // Timeout reached, return Unknown status
  return 'Unknown status';
}

function checkApplyButtonStatus() {
  try {
    // Check for "Applied on" text
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span');
    for (const heading of allHeadings) {
      const text = heading.textContent.trim();
      if (text.startsWith('Applied on')) {
        return 'Already applied';
      }
    }

    // Look for buttons
    const allButtons = document.querySelectorAll('button, a[role="button"]');

    for (const button of allButtons) {
      const text = button.textContent.trim();
      const ariaLabel = button.getAttribute('aria-label') || '';

      // Check for "Already Applied"
      if (text.toLowerCase().includes('already applied') ||
        text.toLowerCase() === 'applied' ||
        ariaLabel.toLowerCase().includes('already applied')) {
        return 'Already applied';
      }

      // Check for "Apply Externally"
      if (text.toLowerCase().includes('apply externally') ||
        text.toLowerCase().includes('external') ||
        ariaLabel.toLowerCase().includes('external')) {
        return 'Cannot apply';
      }

      // Check for regular "Apply" button
      if (text === 'Apply' || ariaLabel === 'Apply') {
        return 'Can apply';
      }
    }

    return 'Unknown status';
  } catch (error) {
    // console.error('Content: Error checking apply status:', error);
    return 'Error';
  }
}

function hasCustomQuestions(modal) {
  const elements = Array.from(modal.querySelectorAll('input, textarea, select'));

  for (const el of elements) {
    // Skip hidden or structural inputs
    if (el.type === 'hidden' || el.type === 'file' || el.type === 'submit' || el.type === 'button' || el.type === 'radio' || el.type === 'checkbox') continue;
    if (el.tagName === 'SELECT') continue;
    if (el.getAttribute('aria-hidden') === 'true') continue;
    if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;

    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();

    // Allowed standard document uploaders
    if (placeholder.includes('search your ') &&
      (placeholder.includes('resume') || placeholder.includes('cover letter') || placeholder.includes('transcript') ||
        (placeholder.includes('other document') && isCoverLetterAutofillEnabled()))) {
      continue;
    }

    // console.warn(`Content: Detected custom question or non-standard document requirement. Element: ${el.tagName}, Type: ${el.type}, Placeholder: ${placeholder}`);
    return true;
  }
  return false;
}

async function clickApplyAndCloseModal() {
  const dryRun = localStorage.getItem('handshake-plus-dry-run') === 'true';
  try {
    // Find the Apply button (centralized resolver: real BUTTON labelled exactly
    // "Apply", never "Apply externally" or an external/app-store link).
    const applyButton = HandshakePlusSelectors.findApplyButton(document);

    if (!applyButton) {
      HandshakePlusLog.log('apply', 'no valid Apply button found');
      return { ok: false, reason: 'apply button not found' };
    }

    // Click Apply

    // If it's a link, prevent default navigation
    if (applyButton.tagName === 'A') {
      applyButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { once: true, capture: true });
    }

    simulateRealClick(applyButton);

    // Wait for the application modal to appear (centralized resolver handles the
    // aria-label / aria-labelledby / heading fallbacks).
    let modal = null;
    for (let attempt = 1; attempt <= 20; attempt++) {
      modal = HandshakePlusSelectors.findApplyModal(document);
      if (modal) break;
      await sleep(500);
    }

    if (!modal) {
      // Apply button existed but no modal appeared — Handshake UI likely changed.
      HandshakePlusLog.warn('apply', 'modal never appeared after clicking Apply');
      HandshakePlusSelectors.flagWarning('handshake-apply-modal');
      return { ok: false, reason: 'modal not found' };
    }

    if (hasCustomQuestions(modal)) {
      HandshakePlusLog.log('apply', 'skipping: custom questions / unhandled documents');
      const closeBtn = HandshakePlusSelectors.findCloseButton(modal);
      if (closeBtn) simulateRealClick(closeBtn);
      await sleep(500);
      return { ok: false, reason: 'custom questions / unhandled docs' };
    }

    // Analyze modal input fields
    // console.log(`Content: Found ${modal.querySelectorAll('input').length} total input elements in modal`);

    // allInputs.forEach((input, index) => {
    //   const placeholder = input.getAttribute('placeholder') || '';
    //   const type = input.getAttribute('type') || '';
    //   const role = input.getAttribute('role') || '';
    //   const ariaLabel = input.getAttribute('aria-label') || '';
    //   const id = input.getAttribute('id') || '';
    //   const value = input.value || '';

    //   console.log(`Content: Input ${index + 1}:`);
    //   console.log(`  - Placeholder: "${placeholder}"`);
    //   console.log(`  - Type: "${type}"`);
    //   console.log(`  - Role: "${role}"`);
    //   console.log(`  - Aria-label: "${ariaLabel}"`);
    //   console.log(`  - Value: "${value}"`);
    //   console.log(`  - ID: "${id}"`);
    // });


    window.__hsCoverLetterData = null;
    let coverLetterStatus = null;
    if (isCoverLetterAutofillEnabled()) {
      coverLetterStatus = await fillCoverLetterField(modal);

      if (coverLetterStatus === "FAILED" || coverLetterStatus === "CANCELLED") {
        const closeBtn = HandshakePlusSelectors.findCloseButton(modal);
        if (closeBtn) simulateRealClick(closeBtn);
        await sleep(1000);
        return { ok: false, reason: 'cover letter ' + coverLetterStatus.toLowerCase() };
      }

      // Manual review approved — upload the cover letter on the current modal
      if (coverLetterStatus === "REVIEWED") {
        // Close review overlay
        if (window.__hsReviewOverlay) {
          const ov = window.__hsReviewOverlay;
          if (ov.parentNode) ov.parentNode.removeChild(ov);
          window.__hsReviewOverlay = null;
        }

        // Upload saved RTF on the current modal (still open behind the overlay)
        const clData = window.__hsCoverLetterData;
        if (clData) {
          const searchInput = Array.from(modal.querySelectorAll('input')).find(i =>
            (i.getAttribute('placeholder') || '').toLowerCase().includes('search your cover letter')
          );
          if (searchInput) {
            const blob = new Blob([clData.rtf], { type: 'application/rtf' });
            const file = new File([blob], `${clData.company}_Cover_Letter.rtf`, { type: 'application/rtf' });
            await uploadRTFFile(file, searchInput, modal);
          }
        }
        window.__hsCoverLetterData = null;
      }
    }

    await fillResumeField(modal);
    await fillTranscriptField(modal);

    if (isCoverLetterAutofillEnabled()) {
      const requiredDocumentStatus = await fillRequiredDocumentFields(modal);
      if (requiredDocumentStatus === "FAILED" || requiredDocumentStatus === "CANCELLED") {
        const closeBtn = HandshakePlusSelectors.findCloseButton(modal);
        if (closeBtn) simulateRealClick(closeBtn);
        await sleep(1000);
        return { ok: false, reason: 'required document ' + requiredDocumentStatus.toLowerCase() };
      }
    }

    const screeningStatus = await handleScreeningQuestions(modal);
    if (screeningStatus === "CANCELLED" || screeningStatus === "FAILED") {
      await closeModalManually(modal);
      return { ok: false, reason: 'screening ' + screeningStatus.toLowerCase() };
    }

    // Guard: ensure modal is still open before attempting submit
    if (!document.body.contains(modal) || modal.offsetWidth === 0) {
      return { ok: false, reason: 'modal closed before submit' };
    }

    // Dry-run: everything was filled, but never actually submit.
    if (dryRun) {
      HandshakePlusLog.log('apply', 'dry-run — closing without submitting');
      await closeModalManually(modal);
      return { ok: false, reason: 'dry-run (not submitted)' };
    }

    // Find and click Submit button (centralized resolver).
    const submitButton = HandshakePlusSelectors.findSubmitButton(modal);

    if (!submitButton) {
      HandshakePlusLog.warn('apply', 'submit button not found in modal');
      await closeModalManually(modal);
      return { ok: false, reason: 'submit button not found' };
    }

    submitButton.click();
    simulateRealClick(submitButton);

    // Poll for modal closure (up to 5s)
    let modalGone = false;
    for (let t = 0; t < 10; t++) {
      await sleep(500);
      if (!document.body.contains(modal) || modal.offsetWidth === 0) {
        modalGone = true;
        break;
      }
    }

    if (modalGone) {
      HandshakePlusSelectors.clearWarning(); // a clean submit means selectors are healthy
      return { ok: true, reason: '' };
    }

    // Modal still open — validation failure or submit had no effect
    HandshakePlusLog.warn('apply', 'submit had no effect; modal stayed open');
    await closeModalManually(modal);
    return { ok: false, reason: 'submit had no effect' };
  } catch (error) {
    HandshakePlusLog.error('apply', error);
    return { ok: false, reason: 'error: ' + ((error && error.message) || String(error)) };
  }
}

async function fillResumeField(modal) {
  try {
    const resumeInput = Array.from(modal.querySelectorAll('input')).find(input => {
      const placeholder = input.getAttribute('placeholder') || '';
      return placeholder.toLowerCase().includes('search your resume');
    });

    if (!resumeInput) return;

    simulateRealClick(resumeInput);
    await sleep(500);

    const listboxId = resumeInput.getAttribute('aria-controls');
    if (!listboxId) return;

    const listbox = document.getElementById(listboxId);
    if (!listbox) return;

    const options = listbox.querySelectorAll('[role="option"]');
    if (options.length === 0) return;

    simulateRealClick(options[0]);
    await sleep(300);
  } catch (error) {
    // ignore
  }
}

async function fillTranscriptField(modal) {
  try {

    // Find input with placeholder "Search your transcripts"
    const transcriptInput = Array.from(modal.querySelectorAll('input')).find(input => {
      const placeholder = input.getAttribute('placeholder') || '';
      return placeholder.toLowerCase().includes('search your transcript');
    });

    if (!transcriptInput) {
      return;
    }


    // Click the input to open dropdown
    simulateRealClick(transcriptInput);
    await sleep(500); // Wait for dropdown to open

    // Get the listbox ID from aria-controls
    const listboxId = transcriptInput.getAttribute('aria-controls');
    if (!listboxId) {
      return;
    }


    // Find the listbox dropdown
    const listbox = document.getElementById(listboxId);
    if (!listbox) {
      return;
    }

    // Get all options
    const options = listbox.querySelectorAll('[role="option"]');

    if (options.length === 0) {
      return;
    }

    // Click the first option
    const firstOption = options[0];
    simulateRealClick(firstOption);
    await sleep(300); // Wait for selection to register

  } catch (error) {
    // console.error('Content: Error filling transcript field:', error);
  }
}

async function fillRequiredDocumentFields(modal) {
  try {
    const slots = findRequiredDocumentSlots(modal);
    if (slots.length === 0) {
      return "NOT_REQUIRED";
    }

    const context = await getCurrentJobContext();
    if (!context.jobTitle || !context.companyName || !context.jobSummary) {
      return "FAILED";
    }

    const storage = await chrome.storage.local.get(['resumeText', 'resumeSummary', 'handshake-plus-default-font']);
    const resumePromptText = getResumePromptText(storage);
    if (!resumePromptText) {
      return "FAILED";
    }

    let selectedFont = storage['handshake-plus-default-font'] || 'Calibri';

    for (const slot of slots) {
      const response = await chrome.runtime.sendMessage({
        action: 'generateRequiredDocument',
        instruction: slot.instruction,
        jobTitle: context.jobTitle,
        companyName: context.companyName,
        jobSummary: context.jobSummary,
        resumeSummary: resumePromptText,
        provider: localStorage.getItem('handshake-plus-ai-provider') || 'gemini',
        aggressive: localStorage.getItem('handshake-plus-aggressive-mode') === 'true'
      });

      if (!document.body.contains(modal)) {
        return "FAILED";
      }

      if (!response || !response.success || !response.documentText) {
        return "FAILED";
      }

      let documentText = response.documentText;

      if (isManualReviewEnabled()) {
        const reviewResult = await promptUserForReview(response.documentText, selectedFont, {
          title: 'Review & Edit Required Document',
          note: 'Review the generated document below. Clicking "Approve & Upload" will attach this RTF to the required document field before the application is submitted.',
          previewNote: '<b>Preview Mode:</b> This demonstrates how the generated RTF document will be formatted.',
          approveText: 'Approve & Upload'
        });

        if (!reviewResult) {
          return "CANCELLED";
        }

        selectedFont = reviewResult.font;
        chrome.storage.local.set({ 'handshake-plus-default-font': selectedFont });

        if (reviewResult.overlay && reviewResult.overlay.parentNode) {
          reviewResult.overlay.parentNode.removeChild(reviewResult.overlay);
        }
        documentText = reviewResult.text;
      }

      const rtfContent = buildRTFDocument(documentText, selectedFont);
      const helper = window.HandshakePlusRequiredDocuments;
      const fileName = helper
        ? helper.buildRequiredDocumentFileName(context.companyName)
        : `${sanitizeRequiredDocumentFilePart(context.companyName)}_Required_Document.rtf`;
      const file = new File(
        [new Blob([rtfContent], { type: 'application/rtf' })],
        fileName,
        { type: 'application/rtf' }
      );

      const uploaded = await uploadRTFFile(file, slot.searchInput, modal);
      if (!uploaded) {
        return "FAILED";
      }
    }

    return "SUCCESS";
  } catch (error) {
    console.error('Content: Fatal error handling required document generation:', error);
    return "FAILED";
  }
}

function findRequiredDocumentSlots(modal) {
  const inputs = Array.from(modal.querySelectorAll('input')).filter(input => {
    const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
    return placeholder.includes('search your other document');
  });

  return inputs.map(input => {
    const group = findRequiredDocumentGroup(input, modal);
    return {
      searchInput: input,
      group,
      instruction: extractRequiredDocumentInstruction(group || input.parentElement)
    };
  }).filter(slot => slot.instruction && slot.searchInput);
}

function findRequiredDocumentGroup(input, modal) {
  let current = input.parentElement;
  while (current && current !== modal) {
    const text = (current.innerText || current.textContent || '').toLowerCase();
    if (text.includes('attach other required documents')) {
      return current;
    }
    current = current.parentElement;
  }
  return input.closest('[role="group"], fieldset') || input.parentElement;
}

function extractRequiredDocumentInstruction(container) {
  const text = (container?.innerText || container?.textContent || '').replace(/\s+/g, ' ').trim();
  const match = text.match(/instructions from employer:\s*(.+?)(?:search your other documents|or upload new|upload new|$)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return 'Required document';
}

async function fillCoverLetterField(modal) {
  try {
    // console.log('Content: Scanning application modal for cover letter fields...');

    // EARLY EXIT: Check if a Cover Letter is even requested before doing expensive AI work.
    const searchInput = Array.from(modal.querySelectorAll('input')).find(input => {
      const placeholder = input.getAttribute('placeholder') || '';
      return placeholder.toLowerCase().includes('search your cover letter');
    });

    if (!searchInput) {
      // console.log('Content: No cover letter requirement detected for this job. Skipping AI generation entirely.');
      return "NOT_REQUIRED";
    }

    // Extract Context
    let jobTitle = '';
    const h1s = Array.from(document.querySelectorAll('h1')).filter(h => !h.textContent.includes('Handshake'));
    if (h1s.length > 0 && h1s[0].textContent.trim().length > 3) {
      jobTitle = h1s[0].textContent.trim();
    }

    if (!jobTitle) {
      // console.warn('Content: No job title found on the DOM! Skipping job to prevent submitting generic cover letter.');
      return "FAILED";
    }

    let companyName = '';
    const companyEl = getCompanyElement();
    if (companyEl) {
      companyName = companyEl.textContent.trim();
    }

    // Indestructible fallback: Extract company name natively from the browser tab document.title
    if (!companyName || companyName.length < 2) {
      const titleMatch = document.title.match(/ at (.*?) \|/i);
      if (titleMatch && titleMatch[1]) {
        companyName = titleMatch[1].trim();
      }
    }

    if (!companyName || companyName.length < 2) {
      // console.warn('Content: No company name found from logo scrapers or tab title! Skipping job.');
      return "FAILED";
    }

    await expandJobDescriptionIfNeeded();
    const jobSummary = getJobSummaryText();

    if (!jobSummary) {
      // console.warn('Content: No job summary found! Skipping job.');
      return "FAILED";
    }

    // Get Resume Summary and Contact Info
    const result = await chrome.storage.local.get(['resumeText', 'resumeSummary', 'contactFullName', 'contactEmail', 'contactPhone', 'contactLocation']);
    const resumePromptText = getResumePromptText(result);
    const fullName = result.contactFullName || '';
    const email = result.contactEmail || '';
    const phone = result.contactPhone || '';
    const location = result.contactLocation || '';

    if (!resumePromptText) {
      // console.warn('Content: No summarized resume found in storage! Skipping job.');
      return false;
    }

    // console.log(`Content: Requesting AI cover letter generation for ${jobTitle} at ${companyName}...`);
    // Ask background to generate
    const response = await chrome.runtime.sendMessage({
      action: 'generateCoverLetter',
      jobTitle: jobTitle,
      companyName: companyName,
      jobSummary: jobSummary,
      resumeSummary: resumePromptText,
      fullName: fullName,
      email: email,
      phone: phone,
      location: location,
      provider: localStorage.getItem('handshake-plus-ai-provider') || 'gemini'
    });

    // Guard: AI generation took ~30s — modal may have closed in the meantime
    if (!document.body.contains(modal)) {
      return "FAILED";
    }

    if (!response || !response.success || !response.coverLetter) {
      const errMsg = response?.error || 'No response from background script';
      alert('[Handshake Plus] Cover letter generation FAILED.\nError: ' + errMsg + '\n\nCheck the background service worker console at chrome://extensions for more detail.');
      return "FAILED";
    }

    let coverLetterText = response.coverLetter;
    // console.log('Content: Cover letter received from background script successfully!');

    let storageRes = await new Promise(resolve => chrome.storage.local.get(['handshake-plus-default-font'], resolve));
    let selectedFont = storageRes['handshake-plus-default-font'] || 'Calibri';

    window.__hsReviewOverlay = null;
    if (isManualReviewEnabled()) {
      const reviewResult = await promptUserForReview(coverLetterText, selectedFont);
      if (!reviewResult) {
        return "CANCELLED";
      }
      coverLetterText = reviewResult.text;
      selectedFont = reviewResult.font;
      window.__hsReviewOverlay = reviewResult.overlay;
      chrome.storage.local.set({ 'handshake-plus-default-font': selectedFont });

      // Build RTF and hand off to caller for re-open + upload flow
      const rtfContent = buildRTFDocument(coverLetterText, selectedFont);
      const cleanCompanyName = companyName.replace(/[^a-z0-9]/gi, '_');
      window.__hsCoverLetterData = { rtf: rtfContent, company: cleanCompanyName };
      return "REVIEWED";
    }

    const rtfContent = buildRTFDocument(coverLetterText, selectedFont);

    // Create File Blob
    const blob = new Blob([rtfContent], { type: 'application/rtf' });
    const cleanCompanyName = companyName.replace(/[^a-z0-9]/gi, '_');
    const file = new File([blob], `${cleanCompanyName}_Cover_Letter.rtf`, { type: 'application/rtf' });

    let uploaded = false;
    if (searchInput) {
      uploaded = await uploadRTFFile(file, searchInput, modal);
    }

    if (!uploaded) {
      // console.warn('Content: Failed to identify any valid upload targets or search inputs! Skipping job.');
      return "FAILED";
    }

    return "SUCCESS";

  } catch (error) {
    console.error('Content: Fatal error handling AI cover letter injection:', error);
    return "FAILED";
  }
}

async function fallbackCoverLetter(modal) {
  try {
    // console.log('Content: Looking for cover letter input field...');

    // Find input with placeholder "Search your cover letters"
    const coverLetterInput = Array.from(modal.querySelectorAll('input')).find(input => {
      const placeholder = input.getAttribute('placeholder') || '';
      return placeholder.toLowerCase().includes('search your cover letter');
    });

    if (!coverLetterInput) {
      // console.log('Content: No cover letter input field found');
      return;
    }

    // console.log('Content: Found cover letter input field, clicking to open dropdown...');

    // Click the input to open dropdown
    simulateRealClick(coverLetterInput);
    await sleep(500); // Wait for dropdown to open

    // Get the listbox ID from aria-controls
    const listboxId = coverLetterInput.getAttribute('aria-controls');
    if (!listboxId) {
      // console.log('Content: No aria-controls attribute on cover letter input');
      return;
    }


    // Find the listbox dropdown
    const listbox = document.getElementById(listboxId);
    if (!listbox) {
      return;
    }

    // Get all options
    const options = listbox.querySelectorAll('[role="option"]');
    // console.log(`Content: Found ${options.length} options in cover letter dropdown`);

    if (options.length === 0) {
      // console.log('Content: No options in cover letter dropdown');
      return;
    }

    // Click the first option
    const firstOption = options[0];
    const optionText = firstOption.textContent.trim();
    // console.log(`Content: Selecting first cover letter option: "${optionText}"`);
    simulateRealClick(firstOption);
    await sleep(300); // Wait for selection to register

    // console.log('Content: ✓ Cover letter field filled successfully');
  } catch (error) {
    // console.error('Content: Error filling cover letter field:', error);
  }
}

async function handleScreeningQuestions(modal) {
  const questions = extractScreeningQuestions(modal);
  if (questions.length === 0) {
    return "NOT_REQUIRED";
  }

  const storage = await chrome.storage.local.get([
    'resumeText',
    'resumeSummary',
    'contactLocation',
    'handshakePlusScreeningFacts'
  ]);
  const resumePromptText = getResumePromptText(storage);

  const response = await chrome.runtime.sendMessage({
    action: 'answerScreeningQuestions',
    questions: questions.map(stripScreeningQuestionElements),
    resumeSummary: resumePromptText,
    contactLocation: storage.contactLocation || '',
    screeningFacts: storage.handshakePlusScreeningFacts || {},
    jobContext: await getCurrentJobContext(),
    provider: localStorage.getItem('handshake-plus-ai-provider') || 'gemini',
    aggressive: localStorage.getItem('handshake-plus-aggressive-mode') === 'true'
  });

  if (!document.body.contains(modal)) {
    return "FAILED";
  }

  if (!response || !response.success || !Array.isArray(response.answers)) {
    return "FAILED";
  }

  if (isManualReviewEnabled()) {
    const reviewResult = await promptUserForScreeningReview(response.answers, questions);
    if (!reviewResult) {
      return "CANCELLED";
    }
    applyScreeningAnswers(questions, reviewResult.answers);
    return "REVIEWED";
  }

  applyScreeningAnswers(questions, response.answers);
  return "AUTOFILLED";
}

async function getCurrentJobContext() {
  await expandJobDescriptionIfNeeded();
  const h1s = Array.from(document.querySelectorAll('h1')).filter(h => !h.textContent.includes('Handshake'));
  const companyEl = getCompanyElement();
  return {
    jobTitle: h1s[0]?.textContent.trim() || '',
    companyName: companyEl?.textContent.trim() || '',
    jobSummary: getJobSummaryText()
  };
}

function stripScreeningQuestionElements(question) {
  return {
    id: question.id,
    questionText: question.questionText,
    inputType: question.inputType,
    options: question.options.map(option => ({
      label: option.label,
      value: option.value
    }))
  };
}

function extractScreeningQuestions(modal) {
  const groups = Array.from(modal.querySelectorAll('[role="radiogroup"]'));
  return groups.map((group, index) => {
    const options = Array.from(group.querySelectorAll('input[type="radio"]')).map(input => ({
      label: getInputLabel(input),
      value: input.value || getInputLabel(input).toLowerCase(),
      input,
      labelElement: getInputLabelElement(input)
    })).filter(option => option.label || option.value);

    return {
      id: group.id || `screening-${index}`,
      questionText: getQuestionTextForGroup(group, modal),
      inputType: 'radio',
      group,
      options,
      selectedValue: options.find(option => option.input.checked)?.value || '',
      confidence: '',
      evidence: '',
      status: 'unanswered'
    };
  }).filter(question => question.questionText && question.options.length > 0);
}

function getInputLabel(input) {
  const label = getInputLabelElement(input);
  if (label && label.textContent.trim()) {
    return label.textContent.trim();
  }
  return input.getAttribute('aria-label') || input.value || '';
}

function getInputLabelElement(input) {
  if (input.id) {
    const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (label && label.textContent.trim()) {
      return label;
    }
  }
  const wrappingLabel = input.closest('label');
  if (wrappingLabel && wrappingLabel.textContent.trim()) {
    return wrappingLabel;
  }
  return null;
}

function getQuestionTextForGroup(group, modal) {
  const optionText = Array.from(group.querySelectorAll('label, input'))
    .map(el => el.textContent || el.getAttribute('aria-label') || el.value || '')
    .join(' ');

  let el = group.parentElement;
  while (el && el !== modal) {
    const radiogroups = el.querySelectorAll('[role="radiogroup"]');
    if (radiogroups.length === 1) {
      const text = cleanQuestionText((el.innerText || el.textContent || ''), optionText);
      if (text.length > 3) return text;
    }
    el = el.parentElement;
  }

  let previous = group.previousElementSibling;
  while (previous) {
    const text = (previous.innerText || previous.textContent || '').trim();
    if (text.length > 3) return text;
    previous = previous.previousElementSibling;
  }

  return '';
}

function cleanQuestionText(text, optionText) {
  let cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  const options = String(optionText || '').split(/\s+/).filter(Boolean);
  for (const option of options) {
    cleaned = cleaned.replace(new RegExp(`\\b${escapeRegExp(option)}\\b`, 'gi'), ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyScreeningAnswers(questions, answers) {
  for (const answer of answers) {
    if (!answer.selectedValue) continue;
    const question = questions.find(q => q.id === answer.id);
    if (!question) continue;
    const option = question.options.find(opt =>
      opt.value === answer.selectedValue || opt.label.toLowerCase() === String(answer.selectedLabel || '').toLowerCase()
    );
    if (option && option.input) {
      simulateRealClick(option.labelElement || option.input);
      option.input.checked = true;
      option.input.dispatchEvent(new Event('input', { bubbles: true }));
      option.input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

function promptUserForScreeningReview(answers, questions) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(31, 32, 44, 0.4); z-index: 9999999; display: flex; align-items: center; justify-content: center; font-family: "Noi Grotesk", system-ui, sans-serif;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background: #FFFFFF; width: 680px; max-width: 92vw; max-height: 86vh; border: 1px solid rgba(31, 32, 44, 0.2); border-radius: 8px; box-shadow: 0 4px 20px rgba(31, 32, 44, 0.15); display: flex; flex-direction: column; overflow: hidden;';

    const header = document.createElement('div');
    header.style.cssText = 'padding: 12px 16px; background: #FFFFFF; color: #121212; font-weight: 700; font-size: 20px; line-height: 24px; letter-spacing: -0.15px; font-family: "Noi Grotesk", system-ui, sans-serif; border-bottom: 1px solid rgba(31, 32, 44, 0.2);';
    header.textContent = 'Review Screening Answers';

    const body = document.createElement('div');
    body.style.cssText = 'padding: 16px; overflow-y: auto; background: #FFFFFF;';

    const note = document.createElement('div');
    note.style.cssText = 'font-size: 12px; color: rgba(18, 18, 18, 0.7); margin-bottom: 14px; line-height: 1.4; font-family: "Noi Grotesk", system-ui, sans-serif;';
    note.textContent = 'Answers are filled only when supported by saved screening facts. Review each answer before the application is submitted.';
    body.appendChild(note);

    const selects = [];
    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.id);
      if (!question) continue;

      const row = document.createElement('div');
      row.style.cssText = 'border: 1px solid rgba(31, 32, 44, 0.2); border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #F6F6F6;';

      const questionEl = document.createElement('div');
      questionEl.style.cssText = 'font-weight: 600; color: #121212; margin-bottom: 8px; line-height: 1.3; font-family: "Noi Grotesk", system-ui, sans-serif;';
      questionEl.textContent = answer.questionText;

      const select = document.createElement('select');
      select.style.cssText = 'width: 100%; padding: 8px 12px; height: 40px; border: 1px solid rgba(31, 32, 44, 0.2); border-radius: 8px; background: #FFFFFF; margin-bottom: 8px; font-family: "Noi Grotesk", system-ui, sans-serif; font-size: 15px; color: #121212;';
      select.dataset.questionId = answer.id;

      const blankOption = document.createElement('option');
      blankOption.value = '';
      blankOption.textContent = 'Leave blank';
      select.appendChild(blankOption);

      for (const option of question.options) {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.label;
        select.appendChild(optionEl);
      }
      select.value = answer.selectedValue || '';
      selects.push(select);

      const evidence = document.createElement('div');
      evidence.style.cssText = `font-size: 12px; line-height: 1.4; color: ${answer.status === 'answered' ? '#327D0F' : 'rgba(18, 18, 18, 0.7)'};`;
      evidence.textContent = `${answer.status === 'answered' ? 'Autofilled' : 'Needs review'}: ${answer.evidence || 'No evidence provided.'}`;

      row.appendChild(questionEl);
      row.appendChild(select);
      row.appendChild(evidence);
      body.appendChild(row);
    }

    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 12px 16px; border-top: 1px solid rgba(31, 32, 44, 0.2); display: flex; justify-content: flex-end; gap: 8px; background: #FFFFFF;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Skip Job';
    cancelBtn.style.cssText = 'padding: 0 12px; height: 36px; border: 1px solid rgba(31, 32, 44, 0.2); background: #FFFFFF; border-radius: 8px; cursor: pointer; color: #121212; font-weight: 500; font-family: "Noi Grotesk", system-ui, sans-serif; font-size: 15px;';

    const approveBtn = document.createElement('button');
    approveBtn.textContent = 'Approve & Continue';
    approveBtn.style.cssText = 'padding: 0 12px; height: 36px; border: none; background: #D3FB52; color: #052326; border-radius: 8px; cursor: pointer; font-weight: 500; font-family: "Noi Grotesk", system-ui, sans-serif; font-size: 15px;';

    footer.appendChild(cancelBtn);
    footer.appendChild(approveBtn);
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function cleanup() {
      window.removeEventListener('click', overlayClickCapture, true);
      window.removeEventListener('mousedown', overlayPointerCapture, true);
      window.removeEventListener('pointerdown', overlayPointerCapture, true);
      window.removeEventListener('focusout', overlayFocusCapture, true);
      window.removeEventListener('focusin', overlayFocusCapture, true);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    function overlayClickCapture(e) {
      if (!window.HandshakePlusDom.containsNode(overlay, e.target)) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (cancelBtn === e.target || window.HandshakePlusDom.containsNode(cancelBtn, e.target)) {
        cleanup();
        resolve(null);
      } else if (approveBtn === e.target || window.HandshakePlusDom.containsNode(approveBtn, e.target)) {
        const reviewedAnswers = answers.map(answer => {
          const select = selects.find(sel => sel.dataset.questionId === answer.id);
          const selectedValue = select ? select.value : answer.selectedValue;
          const question = questions.find(q => q.id === answer.id);
          const selectedOption = question?.options.find(option => option.value === selectedValue);
          return Object.assign({}, answer, {
            selectedValue,
            selectedLabel: selectedOption?.label || '',
            status: selectedValue ? 'answered' : 'needs_review'
          });
        });
        cleanup();
        resolve({ answers: reviewedAnswers });
      }
    }

    function overlayPointerCapture(e) {
      if (!window.HandshakePlusDom.containsNode(overlay, e.target)) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    function overlayFocusCapture(e) {
      if (
        window.HandshakePlusDom.containsNode(overlay, e.target) ||
        window.HandshakePlusDom.containsNode(overlay, e.relatedTarget)
      ) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }

    window.addEventListener('click', overlayClickCapture, true);
    window.addEventListener('mousedown', overlayPointerCapture, true);
    window.addEventListener('pointerdown', overlayPointerCapture, true);
    window.addEventListener('focusout', overlayFocusCapture, true);
    window.addEventListener('focusin', overlayFocusCapture, true);
  });
}

function sanitizeRequiredDocumentFilePart(value) {
  return String(value || 'Required_Document')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'Required_Document';
}

function buildRTFDocument(text, font) {
  // Normalize common UTF-8 punctuation to standard ASCII to prevent RTF encoding mismatches.
  let normalized = String(text || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2026/g, '...');

  let rtf = normalized.replace(/\\/g, "\\\\").replace(/{/g, "\\{").replace(/}/g, "\\}");
  const paragraphs = rtf.split(/\n\n+/);

  const formattedParagraphs = paragraphs.map((p, idx) => {
    if (idx === 0 && p.length < 200 && p.split('\n').length <= 4) {
      const lines = p.split('\n');
      if (lines.length > 0) {
        lines[0] = `\\b ${lines[0]}\\b0`;
        return `\\qc ${lines.join('\\line\n')}\\par\\ql\\par`;
      }
    }
    return p.replace(/\n/g, "\\line\n") + "\\par\\par";
  });

  rtf = formattedParagraphs.join("\n");

  return `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat
{\\fonttbl{\\f0\\fnil\\fcharset0 ${font};}}
{\\*\\generator Handshake Plus;}
\\f0\\fs22\\lang1033
${rtf}
}`;
}

async function uploadRTFFile(file, searchInput, modal) {
  let curr = searchInput.parentElement;
  let uploadTarget = null;
  for (let i = 0; i < 6; i++) {
    if (!curr) break;
    const candidates = Array.from(curr.querySelectorAll('button, a, span, div[role="button"]'));
    uploadTarget = candidates.find(el => {
      const text = (el.textContent || '').toLowerCase().trim();
      return text === 'upload' || text === 'upload new' || text === 'upload document' || text.includes('upload new') || text.includes('upload a document');
    });
    if (uploadTarget) break;
    curr = curr.parentElement;
  }

  if (uploadTarget) {
    uploadTarget.click();
    await sleep(1500);
  }

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  const dropzone = searchInput.closest('div[role="presentation"], [class*="dropzone"]') || searchInput.parentElement.parentElement;
  let handoffAttempted = false;
  if (dropzone) {
    ['dragenter', 'dragover', 'drop'].forEach(eventName => {
      const dragEvent = new DragEvent(eventName, { bubbles: true, cancelable: true, composed: true });
      Object.defineProperty(dragEvent, 'dataTransfer', { value: dataTransfer });
      dropzone.dispatchEvent(dragEvent);
    });
    handoffAttempted = true;
  }

  let ancestor = searchInput;
  for (let i = 0; i < 8; i++) {
    if (ancestor && ancestor.parentElement) ancestor = ancestor.parentElement;
  }
  if (!ancestor) ancestor = modal;

  let fileInputs = ancestor.querySelectorAll('input[type="file"]');
  if (fileInputs.length === 0) {
    fileInputs = document.querySelectorAll('input[type="file"]');
  }

  if (fileInputs.length > 0) {
    const fileInput = fileInputs[fileInputs.length - 1];
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    fileInput.dispatchEvent(new Event('input', { bubbles: true }));
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer });
    fileInput.dispatchEvent(dropEvent);
    handoffAttempted = true;
  }

  if (!handoffAttempted) {
    return false;
  }

  await sleep(6000);

  const uploadStartTime = Date.now();
  let hasSeenUploading = false;

  while (Date.now() - uploadStartTime < 45000) {
    const hasUploadIndicators = modal.querySelector('[role="progressbar"], [class*="spinner"], [class*="loader"]') ||
      Array.from(modal.querySelectorAll('span, div, p')).some(el => {
        const txt = el.textContent.toLowerCase().trim();
        return txt.includes('uploading') || txt.includes('processing') || txt.includes('virus scan');
      });

    if (hasUploadIndicators) hasSeenUploading = true;

    const explicitlyAttached = hasUploadedFileAttachment(file, modal);
    const searchInputVisible = searchInput && document.body.contains(searchInput) && searchInput.offsetWidth > 0 && searchInput.offsetHeight > 0;

    if (!hasUploadIndicators) {
      if (explicitlyAttached) {
        await sleep(1500);
        return true;
      } else if (!searchInputVisible && hasSeenUploading) {
        await sleep(1500);
        return true;
      }
    }
    await sleep(1500);
  }

  return hasUploadedFileAttachment(file, modal);
}

function hasUploadedFileAttachment(file, modal) {
  if (!file || !modal || typeof modal.querySelectorAll !== 'function') {
    return false;
  }

  const fileName = String(file.name || '').toLowerCase();
  const fileStem = fileName.replace(/\.[^.]+$/, '');
  if (!fileName) {
    return false;
  }

  return Array.from(modal.querySelectorAll('span, div, p, a, li, button')).some(el => {
    const text = (el.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!text) return false;
    if (text.includes(fileName)) return true;
    return fileStem && text.includes(fileStem) && (
      text.includes('.rtf') ||
      text.includes('attached') ||
      text.includes('uploaded') ||
      text.includes('remove')
    );
  });
}

function promptUserForReview(originalText, defaultFont = 'Calibri', options = {}) {
  return new Promise((resolve) => {
    const titleText = options.title || 'Review & Edit Cover Letter';
    const noteText = options.note || 'Review the generated text below. Clicking "Approve & Submit" will automatically attach this text to your application and fully submit it across the Handshake system instantaneously.';
    const previewNote = options.previewNote || '<b>Preview Mode:</b> This demonstrates exactly how Handshake will naturally format your spacing to employers.';
    const approveText = options.approveText || 'Approve & Submit';

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(31, 32, 44, 0.4); z-index: 9999999; display: flex; align-items: center; justify-content: center; font-family: "Noi Grotesk", system-ui, sans-serif;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background: #FFFFFF; width: 700px; max-width: 90vw; border: 1px solid rgba(31, 32, 44, 0.2); border-radius: 8px; box-shadow: 0 4px 20px rgba(31, 32, 44, 0.15); display: flex; flex-direction: column; overflow: hidden;';

    const header = document.createElement('div');
    header.style.cssText = 'padding: 12px 16px; background: #FFFFFF; color: #121212; font-weight: 700; font-size: 20px; line-height: 24px; letter-spacing: -0.15px; font-family: "Noi Grotesk", system-ui, sans-serif; border-bottom: 1px solid rgba(31, 32, 44, 0.2);';
    header.textContent = titleText;

    const body = document.createElement('div');
    body.style.cssText = 'padding: 16px; flex: 1; display: flex; flex-direction: column; position: relative; background: #FFFFFF;';

    const note = document.createElement('div');
    note.style.cssText = 'font-size: 12px; color: rgba(18, 18, 18, 0.7); margin-bottom: 12px; line-height: 1.4; font-family: "Noi Grotesk", system-ui, sans-serif;';
    note.textContent = noteText;

    const textarea = document.createElement('textarea');
    textarea.value = originalText;
    textarea.style.cssText = 'width: 100%; height: 360px; padding: 12px; border: 1px solid rgba(31, 32, 44, 0.2); border-radius: 8px; font-family: inherit; font-size: 15px; resize: vertical; box-sizing: border-box; outline: none; line-height: 1.5; color: #121212; background: transparent;';

    const previewDiv = document.createElement('div');
    previewDiv.style.cssText = 'width: 100%; height: 360px; padding: 12px; border: 1px solid rgba(31, 32, 44, 0.2); border-radius: 8px; font-family: inherit; font-size: 15px; box-sizing: border-box; line-height: 1.5; color: #121212; overflow-y: auto; white-space: pre-wrap; background: #F6F6F6; display: none;';

    const footer = document.createElement('div');
    footer.style.cssText = 'padding: 12px 16px; border-top: 1px solid rgba(31, 32, 44, 0.2); display: flex; justify-content: flex-end; gap: 8px; background: #FFFFFF; align-items: center; flex-wrap: wrap;';

    // Custom pill-button font picker — no native <select> so no focus-steal on open.
    const fonts = ['Calibri', 'Times New Roman', 'Verdana', 'Georgia', 'Cambria', 'Garamond', 'Trebuchet MS'];
    let currentFont = defaultFont;

    const fontPicker = document.createElement('div');
    fontPicker.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin-right: auto; align-items: center;';

    const pillBtns = fonts.map(f => {
      const btn = document.createElement('button');
      btn.textContent = f;
      const active = f === defaultFont;
      btn.style.cssText = `padding: 4px 10px; border-radius: 999px; border: 1px solid ${active ? 'rgba(31, 32, 44, 0.3)' : 'rgba(31, 32, 44, 0.2)'}; background: ${active ? '#EAEAEA' : '#FFFFFF'}; color: ${active ? '#121212' : 'rgba(18, 18, 18, 0.7)'}; font-size: 12px; cursor: pointer; font-family: "Noi Grotesk", "${f}", sans-serif; white-space: nowrap; transition: background-color 150ms ease-out, border-color 150ms ease-out;`;
      btn.addEventListener('click', () => {
        currentFont = f;
        textarea.style.fontFamily = f;
        if (isPreviewMode && previewDiv.firstChild) previewDiv.firstChild.style.fontFamily = f;
        pillBtns.forEach(b => {
          const sel = b === btn;
          b.style.background = sel ? '#EAEAEA' : '#FFFFFF';
          b.style.color = sel ? '#121212' : 'rgba(18, 18, 18, 0.7)';
          b.style.borderColor = sel ? 'rgba(31, 32, 44, 0.3)' : 'rgba(31, 32, 44, 0.2)';
        });
      });
      fontPicker.appendChild(btn);
      return btn;
    });

    textarea.style.fontFamily = defaultFont;

    const previewBtn = document.createElement('button');
    previewBtn.textContent = '👁️ Preview Format';
    previewBtn.style.cssText = 'padding: 0 12px; height: 36px; border: 1px solid rgba(31, 32, 44, 0.2); background: #FFFFFF; color: #121212; border-radius: 8px; cursor: pointer; font-weight: 500; font-family: "Noi Grotesk", system-ui, sans-serif; font-size: 15px; transition: background-color 150ms ease-out; margin-right: 8px;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Skip Job';
    cancelBtn.style.cssText = 'padding: 0 12px; height: 36px; border: 1px solid rgba(31, 32, 44, 0.2); background: #FFFFFF; border-radius: 8px; cursor: pointer; color: #121212; font-weight: 500; font-family: "Noi Grotesk", system-ui, sans-serif; font-size: 15px; transition: background-color 150ms ease-out;';

    const submitBtn = document.createElement('button');
    submitBtn.textContent = approveText;
    submitBtn.style.cssText = 'padding: 0 12px; height: 36px; border: none; background: #D3FB52; color: #052326; border-radius: 8px; cursor: pointer; font-weight: 500; font-family: "Noi Grotesk", system-ui, sans-serif; font-size: 15px; transition: background-color 150ms ease-out;';

    let isPreviewMode = false;
    function togglePreview() {
      isPreviewMode = !isPreviewMode;
      if (isPreviewMode) {
        let cleanText = textarea.value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        const paragraphs = cleanText.split(/\n\n+/);
        const formattedHtml = paragraphs.map((p, idx) => {
          if (idx === 0 && p.length < 200 && p.split('\n').length <= 4) {
            const lines = p.split('\n');
            if (lines.length > 0) {
              const nameLine = `<strong>${lines[0]}</strong>`;
              if (lines.length > 1) {
                const subLines = lines.slice(1).join(' &bull; ');
                return `<div style="text-align: center; margin-bottom: 24px;">${nameLine}<br>${subLines}</div>`;
              }
              return `<div style="text-align: center; margin-bottom: 24px;">${nameLine}</div>`;
            }
          }
          let formattedP = p
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\s*-\s+(.*)/g, '<br>&bull; $1')
            .replace(/\n/g, '<br>');
          return `<div style="margin-bottom: 16px; text-align: left;">${formattedP}</div>`;
        }).join('');

        previewDiv.innerHTML = `<div style="background: #FFFFFF; padding: 30px 40px; border: 1px solid rgba(31, 32, 44, 0.2); width: 100%; box-sizing: border-box; color: #121212; font-family: '${currentFont}', 'Noi Grotesk', sans-serif; font-size: 15px; line-height: 1.5;">${formattedHtml}</div>`;
        previewDiv.style.backgroundColor = '#F6F6F6';
        textarea.style.display = 'none';
        previewDiv.style.display = 'block';
        previewBtn.textContent = '✏️ Edit Text';
        previewBtn.style.background = '#EAEAEA';
        previewBtn.style.color = '#121212';
        note.innerHTML = previewNote;
      } else {
        textarea.style.display = 'block';
        previewDiv.style.display = 'none';
        previewBtn.textContent = '👁️ Preview Format';
        previewBtn.style.background = '#FFFFFF';
        previewBtn.style.color = '#121212';
        note.textContent = noteText;
      }
    }
    previewBtn.addEventListener('click', togglePreview);

    cancelBtn.onmouseover = () => cancelBtn.style.background = '#F6F6F6';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#FFFFFF';
    submitBtn.onmouseover = () => submitBtn.style.background = '#c8ec3a';
    submitBtn.onmouseout = () => submitBtn.style.background = '#D3FB52';
    previewBtn.onmouseover = () => { if (!isPreviewMode) previewBtn.style.background = '#F6F6F6'; };
    previewBtn.onmouseout = () => { if (!isPreviewMode) previewBtn.style.background = '#FFFFFF'; };

    body.appendChild(note);
    body.appendChild(textarea);
    body.appendChild(previewDiv);
    footer.appendChild(fontPicker);
    footer.appendChild(previewBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function cleanupOverlayListeners() {
      window.removeEventListener('click',      overlayClickCapture,      true);
      window.removeEventListener('mousedown',  overlayMousedownCapture,  true);
      window.removeEventListener('pointerdown',overlayPointercapture,    true);
      window.removeEventListener('focusout',   overlayFocusEventCapture, true);
      window.removeEventListener('focusin',    overlayFocusEventCapture, true);
      window.removeEventListener('blur',       overlayFocusEventCapture, true);
      window.removeEventListener('focus',      overlayFocusEventCapture, true);
    }

    function handleCancel() {
      cleanupOverlayListeners();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      resolve(null);
    }

    function handleSubmit() {
      cleanupOverlayListeners();
      const newText = textarea.value;
      overlay.style.display = 'none';
      resolve({ text: newText, font: currentFont, overlay });
    }

    // Intercept at window capture phase — runs before Handshake's document capture handler.
    // Stop the event dead and call handlers directly (no re-dispatch avoids Handshake seeing it).
    function overlayClickCapture(e) {
      if (!window.HandshakePlusDom.containsNode(overlay, e.target)) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (cancelBtn === e.target || window.HandshakePlusDom.containsNode(cancelBtn, e.target)) {
        handleCancel();
      } else if (submitBtn === e.target || window.HandshakePlusDom.containsNode(submitBtn, e.target)) {
        handleSubmit();
      } else if (previewBtn === e.target || window.HandshakePlusDom.containsNode(previewBtn, e.target)) {
        togglePreview();
      } else {
        for (let i = 0; i < pillBtns.length; i++) {
          if (pillBtns[i] === e.target || window.HandshakePlusDom.containsNode(pillBtns[i], e.target)) {
            const f = fonts[i];
            currentFont = f;
            textarea.style.fontFamily = f;
            fontPicker.querySelectorAll('button').forEach(b => {
              b.style.background = b === pillBtns[i] ? '#EAEAEA' : '#FFFFFF';
              b.style.color = b === pillBtns[i] ? '#121212' : 'rgba(18, 18, 18, 0.7)';
            });
            break;
          }
        }
      }
    }

    function overlayMousedownCapture(e) {
      if (!window.HandshakePlusDom.containsNode(overlay, e.target)) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.target === textarea || window.HandshakePlusDom.containsNode(textarea, e.target)) {
        textarea.focus();
      } else {
        e.preventDefault(); // suppress browser focus transfer so no focusout fires on Handshake dialog
      }
    }

    function overlayPointercapture(e) {
      if (!window.HandshakePlusDom.containsNode(overlay, e.target)) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.target !== textarea && !window.HandshakePlusDom.containsNode(textarea, e.target)) {
        e.preventDefault();
      }
    }

    // Stop any focus event where our overlay is either the source or destination.
    // Covers focusout, focusin, blur, focus — handles all the ways Handshake might detect
    // that focus left its dialog. stopPropagation at window capture prevents document-level
    // handlers from seeing it; actual focus transfer still happens normally.
    function overlayFocusEventCapture(e) {
      const targetInOverlay = window.HandshakePlusDom.containsNode(overlay, e.target);
      const relatedInOverlay = window.HandshakePlusDom.containsNode(overlay, e.relatedTarget);
      if (targetInOverlay || relatedInOverlay) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }

    window.addEventListener('click',       overlayClickCapture,      true);
    window.addEventListener('mousedown',   overlayMousedownCapture,  true);
    window.addEventListener('pointerdown', overlayPointercapture,    true);
    window.addEventListener('focusout',    overlayFocusEventCapture, true);
    window.addEventListener('focusin',     overlayFocusEventCapture, true);
    window.addEventListener('blur',        overlayFocusEventCapture, true);
    window.addEventListener('focus',       overlayFocusEventCapture, true);
  });
}

function isCoverLetterAutofillEnabled() {
  const savedState = localStorage.getItem('handshake-plus-cover-letter-enabled');
  // Default to enabled when user has not chosen a preference yet.
  if (savedState === null) {
    return true;
  }

  return savedState === 'true';
}

function isManualReviewEnabled() {
  const savedState = localStorage.getItem('handshake-plus-manual-review-enabled');
  return savedState === 'true';
}

function getResumePromptText(storage) {
  const useRawResume = localStorage.getItem('handshake-plus-raw-resume') === 'true';
  if (useRawResume && storage?.resumeText) {
    return storage.resumeText;
  }
  return storage?.resumeSummary || storage?.resumeText || '';
}

function checkIfModalStillOpen() {
  // Check if any modal is still visible on the page
  const modalSelectors = [
    '[role="dialog"]',
    '[class*="modal"]',
    '[class*="Modal"]',
    '[aria-modal="true"]'
  ];

  for (const selector of modalSelectors) {
    const modal = document.querySelector(selector);
    if (modal) {
      // Check if modal is visible
      const computedStyle = window.getComputedStyle(modal);
      const isVisible = modal.offsetParent !== null ||
        (computedStyle.display !== 'none' &&
          computedStyle.visibility !== 'hidden' &&
          computedStyle.opacity !== '0');

      if (isVisible) {
        return true; // Modal is still open
      }
    }
  }

  return false; // No modal found or all modals are hidden
}

async function closeModalManually(modal) {
  // Find close button
  const closeSelectors = [
    'button[aria-label*="close" i]',
    'button[aria-label*="cancel" i]',
    'button[class*="close"]',
    '[class*="Close"]'
  ];

  for (const selector of closeSelectors) {
    const closeButton = modal.querySelector(selector);
    if (closeButton) {
      simulateRealClick(closeButton);
      await sleep(500);
      return true;
    }
  }

  // Try Escape key as fallback
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
  await sleep(500);
  return true;
}

async function findNextButton() {
  const possibleSelectors = [
    'button[aria-label*="next"]',
    'a[aria-label*="next"]'
  ];

  for (const selector of possibleSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent.toLowerCase();
      const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';

      if (text.includes('next') || ariaLabel.includes('next')) {
        if (!element.disabled && !element.classList.contains('disabled')) {
          return element;
        }
      }
    }
  }

  return null;
}

function simulateRealClick(element) {
  const mouseDownEvent = new MouseEvent('mousedown', {
    view: window,
    bubbles: true,
    cancelable: true,
    buttons: 1
  });

  const mouseUpEvent = new MouseEvent('mouseup', {
    view: window,
    bubbles: true,
    cancelable: true,
    buttons: 1
  });

  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
    buttons: 1
  });

  element.dispatchEvent(mouseDownEvent);
  element.dispatchEvent(mouseUpEvent);
  element.dispatchEvent(clickEvent);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Randomized delay (ms) inserted after a successful submission. Configurable via
// localStorage handshake-plus-delay-min / -max (seconds). Default 4–9s. Set both
// to 0 to disable.
function getInterApplyDelayMs() {
  const toNum = (v, d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };
  let minS = toNum(localStorage.getItem('handshake-plus-delay-min'), 4);
  let maxS = toNum(localStorage.getItem('handshake-plus-delay-max'), 9);
  if (maxS < minS) maxS = minS;
  if (minS === 0 && maxS === 0) return 0;
  return Math.round((minS + Math.random() * (maxS - minS)) * 1000);
}

function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  if (set1.size !== set2.size) return false;
  for (const item of set1) {
    if (!set2.has(item)) return false;
  }
  return true;
}
