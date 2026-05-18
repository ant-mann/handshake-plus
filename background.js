// Background service worker for Handshake Plus extension
importScripts('screening-utils.js', 'required-document-utils.js', 'ai-tab-utils.js', 'ai-prompt-utils.js');

let isProcessing = false;
let currentJobIndex = 0;
let currentPageNum = 1;
let appliedCount = 0;
let handshakeTabId = null;
const maxPages = 400;
let waitingForPageLoad = false; // Track if we're waiting for a page to load
let countCheckResolve = null; // Promise resolver for count check signal
let isCheckingCount = false; // Prevent multiple simultaneous count checks
let appsPageCountRefreshPromise = null;
let appsPageCountRefreshCache = null;
const APPS_PAGE_COUNT_REFRESH_CACHE_MS = 30000;

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function getStoredAppliedCountForToday() {
  const stored = await chrome.storage.local.get('handshake-plus-applied-today');
  const rec = stored['handshake-plus-applied-today'];
  if (rec && rec.date === getTodayStr() && typeof rec.count === 'number') {
    return Math.max(0, Math.floor(rec.count));
  }
  return 0;
}

function persistAppliedCountForToday(count) {
  appliedCount = Math.max(0, Math.floor(count || 0));
  chrome.storage.local.set({ 'handshake-plus-applied-today': { date: getTodayStr(), count: appliedCount } });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // 1. Properly launch into a new Tab (Windows get suppressed by Chrome's native security layer during Web Store installations)
    chrome.tabs.create({ url: 'https://app.joinhandshake.com/job-search', active: true }, (newTab) => {
      const newTabId = newTab ? newTab.id : null;
      
      // Wait explicitly for Handshake's SPA router to completely finish loading the DOM
      const loadListener = (tabId, changeInfo, tab) => {
        if (tabId === newTabId && changeInfo.status === 'complete') {
          // Check if they were redirected to the /login gateway. 
          // Only fire the final structural reload once they actually arrive precisely on the job-search dashboard!
          if (tab.url && tab.url.includes('job-search')) {
            setTimeout(() => chrome.tabs.reload(newTabId), 3500);
            chrome.tabs.onUpdated.removeListener(loadListener);
          }
        }
      };
      
      if (newTabId) {
        chrome.tabs.onUpdated.addListener(loadListener);
      }
      
      // 2. Refresh existing Handshake tabs (skipping the new tab)
      chrome.tabs.query({ url: "*://*.joinhandshake.com/*" }, (tabs) => {
        for (const tab of tabs) {
          if (tab.id && tab.id !== newTabId) {
            chrome.tabs.reload(tab.id);
          }
        }
      });
    });
  } else {
    // If it's just an update, refresh everything
    chrome.tabs.query({ url: "*://*.joinhandshake.com/*" }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.reload(tab.id);
      }
    });
  }
});

// Listen for tab updates to detect when page finishes loading (fixes throttling issues with inactive tabs)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only care about the Handshake tab finishing loading
  if (tabId === handshakeTabId && changeInfo.status === 'complete' && waitingForPageLoad && isProcessing) {
    waitingForPageLoad = false;

    // Give React a moment to render, then process
    setTimeout(() => {
      processCurrentPage();
    }, 3000); // 3 seconds for React to render
  }
});

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // if (message.action !== 'keepalive') {
  //   console.log('Background: Received message:', message);
  // }

  if (message.action === 'keepalive') {
    // Just respond to keep service worker alive
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'getState') {
    (async () => {
      // If not actively tracking (worker may have been killed), restore from storage
      if (!isProcessing) {
        appliedCount = await getStoredAppliedCountForToday();
      }
      sendResponse({
        isProcessing: isProcessing,
        appliedCount: appliedCount,
        currentPage: currentPageNum
      });
    })();
    return true;
  }

  if (message.action === 'startApplying') {
    // Verify the message is coming from a valid active Handshake page
    if (sender.tab && sender.tab.url && sender.tab.url.match(/^https:\/\/[a-z0-9-]+\.joinhandshake\.com\//)) {
      startProcessing();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Not on job search page' });
    }
  }

  if (message.action === 'stopApplying') {
    stopProcessing();
    sendResponse({ success: true });
  }

  if (message.action === 'jobProcessed') {
    // Content script finished processing a job
    const shouldStop = handleJobProcessed(message);
    sendResponse({ success: true, shouldStop: shouldStop });
  }

  if (message.action === 'pageComplete') {
    // Content script finished all jobs on current page
    handlePageComplete();
    sendResponse({ success: true });
  }

  if (message.action === 'countCheckComplete') {
    // Content script finished scraping count from /apps page
    // console.log('Background: Received countCheckComplete signal with count:', message.count);
    if (countCheckResolve) {
      // console.log('Background: Resolving promise with count:', message.count);
      if (typeof message.count === 'number') {
        countCheckResolve({ success: true, count: message.count });
      } else {
        countCheckResolve({ success: false, error: message.error || 'Application count unavailable' });
      }
      countCheckResolve = null;
    } else {
      // console.warn('Background: countCheckResolve is null - promise not set up or already resolved');
    }
    sendResponse({ success: true });
  }

  if (message.action === 'syncTodayApplicationCount') {
    (async () => {
      const count = Number.isFinite(message.count) ? Math.max(0, Math.floor(message.count)) : null;
      if (count !== null) {
        const storedCount = await getStoredAppliedCountForToday();
        persistAppliedCountForToday(Math.max(storedCount, appliedCount, count));
        chrome.runtime.sendMessage({
          action: 'updateStats',
          appliedCount: appliedCount,
          currentPage: currentPageNum,
          isProcessing: isProcessing
        }).catch(() => {});
        sendResponse({ success: true, appliedCount: appliedCount });
      } else {
        sendResponse({ success: false, error: 'Invalid count' });
      }
    })();
    return true;
  }

  if (message.action === 'refreshTodayApplicationCountFromAppsPage') {
    (async () => {
      try {
        const count = await getTodayApplicationCountFromAppsPage(sender.tab?.url || '');
        const storedCount = await getStoredAppliedCountForToday();
        persistAppliedCountForToday(Math.max(storedCount, appliedCount, count));
        sendResponse({ success: true, appliedCount: appliedCount });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.action === 'summarizeResume') {
    (async () => {
      try {
        sendAiStatus('🤖 Summarizing resume with AI...');
        const parsedData = await generateResumeSummary(message.resumeText, message.provider || 'gemini');
        sendAiStatus('Applying to jobs...');
        sendResponse({ success: true, summary: parsedData.summary, contact: parsedData.contact, screeningFacts: parsedData.screeningFacts });
      } catch (error) {
        sendAiStatus('Applying to jobs...');
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.action === 'generateCoverLetter') {
    (async () => {
      try {
        sendAiStatus(`🤖 Writing cover letter for ${message.jobTitle}...`);
        const coverLetter = await generateCoverLetter(message.jobTitle, message.companyName, message.jobSummary, message.resumeSummary, message.fullName, message.email, message.phone, message.location, message.provider || 'gemini');
        sendAiStatus('Applying to jobs...');
        sendResponse({ success: true, coverLetter: coverLetter });
      } catch (error) {
        sendAiStatus('Applying to jobs...');
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.action === 'generateRequiredDocument') {
    (async () => {
      try {
        sendAiStatus(`🤖 Writing required document for ${message.companyName || 'application'}...`);
        const documentText = await generateRequiredDocument(message.instruction, message.jobTitle, message.companyName, message.jobSummary, message.resumeSummary, message.provider || 'gemini', message.aggressive);
        sendAiStatus('Applying to jobs...');
        sendResponse({ success: true, documentText: documentText });
      } catch (error) {
        sendAiStatus('Applying to jobs...');
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  if (message.action === 'answerScreeningQuestions') {
    (async () => {
      try {
        sendAiStatus('🤖 Answering screening questions...');
        const result = await answerScreeningQuestionsWithAI({
          questions: message.questions || [],
          screeningFacts: message.screeningFacts || {},
          contactLocation: message.contactLocation || '',
          resumeSummary: message.resumeSummary || '',
          jobContext: message.jobContext || {},
          provider: message.provider || 'gemini',
          aggressive: message.aggressive
        });
        sendAiStatus('Applying to jobs...');
        sendResponse({ success: true, answers: result.answers, requiresReview: result.requiresReview });
      } catch (error) {
        sendAiStatus('Applying to jobs...');
        try {
          const screening = globalThis.HandshakePlusScreening;
          const fallback = screening.createNeedsReviewScreeningAnswers(message.questions || [], error.message);
          sendResponse({ success: true, answers: fallback.answers, requiresReview: fallback.requiresReview });
        } catch (fallbackError) {
          sendResponse({ success: false, error: error.message });
        }
      }
    })();
    return true;
  }

  if (message.action === 'openHandshakeWindow') {
    const targetUrl = message.targetUrl || 'https://app.joinhandshake.com/stu/postings';
    chrome.windows.create({ url: targetUrl, state: 'maximized' }, (win) => {
      if (win && win.tabs && win.tabs.length > 0) {
        const targetTabId = win.tabs[0].id;
        
        // Actively listen for the new tab to fully resolve its SAML/SSO redirect chain
        const redirectListener = function(tabId, changeInfo, tab) {
          if (tabId === targetTabId && changeInfo.status === 'complete') {
            const currentUrl = tab.url || changeInfo.url || '';
            
            // Wait until it lands on the actual job search app view
            if (currentUrl.includes('joinhandshake.com/') && (currentUrl.includes('/stu/') || currentUrl.includes('/job-search'))) {
              
              // Remove listener immediately to prevent an infinite reload loop
              chrome.tabs.onUpdated.removeListener(redirectListener);
              
              // Give React 3.5 seconds to fully execute JS, mount the DOM, and pull jobs before hard-reloading
              setTimeout(() => {
                chrome.tabs.reload(targetTabId);
              }, 3500); 
            }
          }
        };
        
        chrome.tabs.onUpdated.addListener(redirectListener);
      }
    });
    return true;
  }

  return true; // Keep channel open for async response
});

async function getTodayApplicationCountFromAppsPage(sourceUrl) {
  const now = Date.now();
  if (
    appsPageCountRefreshCache &&
    appsPageCountRefreshCache.date === getTodayStr() &&
    now - appsPageCountRefreshCache.timestamp < APPS_PAGE_COUNT_REFRESH_CACHE_MS
  ) {
    return appsPageCountRefreshCache.count;
  }

  if (!appsPageCountRefreshPromise) {
    appsPageCountRefreshPromise = fetchTodayApplicationCountFromAppsPage(sourceUrl)
      .then(count => {
        appsPageCountRefreshCache = {
          count,
          date: getTodayStr(),
          timestamp: Date.now()
        };
        return count;
      })
      .finally(() => {
        appsPageCountRefreshPromise = null;
      });
  }

  return appsPageCountRefreshPromise;
}

async function fetchTodayApplicationCountFromAppsPage(sourceUrl) {
  const origin = sourceUrl && sourceUrl.includes('joinhandshake.com')
    ? new URL(sourceUrl).origin
    : 'https://app.joinhandshake.com';
  const appsUrl = `${origin}/apps?start_date=${getTodayStr()}&per_page=25&page=1`;
  const tab = await chrome.tabs.create({ url: appsUrl, active: false });

  try {
    await waitForTabComplete(tab.id, 15000);
    for (let attempt = 0; attempt < 8; attempt++) {
      await sleep(750);
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrapeTodayApplicationsFromAppsPage' });
        if (response && response.success && typeof response.count === 'number') {
          return response.count;
        }
      } catch (e) {}
    }
    throw new Error('Could not read applications page count');
  } finally {
    if (tab && tab.id) {
      chrome.tabs.remove(tab.id).catch(() => {});
    }
  }
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Applications page timed out'));
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function startProcessing() {
  if (isProcessing) {
    // console.log('Background: Already processing');
    return;
  }

  // Set processing flag immediately so panel shows "Stop" during count check
  isProcessing = true;
  currentJobIndex = 0;

  // console.log('Background: Starting job application process');

  // Find or create Handshake tab
  const tabs = await chrome.tabs.query({ url: 'https://*.joinhandshake.com/*' });

  if (tabs.length > 0) {
    handshakeTabId = tabs[0].id;
    const tab = tabs[0];

    // Parse current page number from URL
    const url = new URL(tab.url);
    const pageParam = url.searchParams.get('page');
    currentPageNum = pageParam ? parseInt(pageParam, 10) : 1;

    // console.log(`Background: Using existing Handshake tab: ${handshakeTabId}, starting from page ${currentPageNum}`);
    await chrome.tabs.update(handshakeTabId, { active: true });
  } else {
    // No job-search tab found - this should not happen if the check in message listener works
    // console.error('Background: No job-search tab found. Cannot start processing.');
    stopProcessing();
    return;
  }

  // Check today's application count from Handshake before starting
  let countRetrieved = false;
  let todayCount = 0;

  // Prevent multiple simultaneous count checks
  if (isCheckingCount) {
    // console.warn('Background: Count check already in progress, skipping duplicate call');
    return;
  }

  try {
    isCheckingCount = true;
    // console.log('Background: Setting up count check...');

    // Clear any previous count check data
    await chrome.storage.local.remove(['countCheckComplete', 'todayApplicationCount', 'countCheckTimestamp']);
    // console.log('Background: Cleared previous count check data');

    // Create a promise that will be resolved when content script signals via storage or message
    const countCheckPromise = new Promise((resolve) => {
      countCheckResolve = resolve;
      // console.log('Background: Promise resolver set up');
    });

    // console.log('Background: Triggering navigation to /apps page...');

    // Ensure tab is ready and content script is loaded
    let navigationTriggered = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // console.log(`Background: Attempt ${attempt + 1} to send checkTodayApplications message`);

        // First, verify content script is loaded by pinging it
        const pingResponse = await chrome.tabs.sendMessage(handshakeTabId, {
          action: 'ping'
        }).catch(() => null);

        if (pingResponse) {
          // console.log('Background: Content script is responsive, sending navigation command');

          // Trigger navigation to apps page
          chrome.tabs.sendMessage(handshakeTabId, {
            action: 'checkTodayApplications'
          }).catch(() => {
            // Expected to fail/timeout since page navigates away
            // console.log('Background: Navigation message sent, page navigating (expected disconnect)');
          });

          navigationTriggered = true;
          break;
        } else {
          // console.warn(`Background: Content script not responding on attempt ${attempt + 1}`);
          if (attempt < 2) {
            await sleep(1000); // Wait 1 second before retry
          }
        }
      } catch (error) {
        // console.error(`Background: Error on attempt ${attempt + 1}:`, error);
        if (attempt < 2) {
          await sleep(1000);
        }
      }
    }

    if (!navigationTriggered) {
      // console.error('Background: Failed to trigger navigation after 3 attempts');
      throw new Error('Content script not responding');
    }

    // Poll chrome.storage for the count (in case service worker sleeps)
    const pollInterval = setInterval(async () => {
      // Check if user stopped during polling
      if (!isProcessing || !isCheckingCount) {
        // console.log('Background: User stopped, aborting count check poll');
        clearInterval(pollInterval);
        return;
      }

      // console.log('Background: Polling chrome.storage for count...');
      const result = await chrome.storage.local.get(['countCheckComplete', 'todayApplicationCount']);

      if (result.countCheckComplete && typeof result.todayApplicationCount === 'number') {
        // console.log(`Background: Found count in storage: ${result.todayApplicationCount}`);
        clearInterval(pollInterval);
        if (countCheckResolve) {
          countCheckResolve({ success: true, count: result.todayApplicationCount });
          countCheckResolve = null;
        }
      }
    }, 2000); // Poll every 2 seconds

    // Wait for the signal (with 30 second timeout as failsafe)
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        // console.log('Background: Count check timeout reached (30 seconds)');
        clearInterval(pollInterval);
        resolve({ success: false, timeout: true });
      }, 30000);
    });

    // console.log('Background: Waiting for count check signal or timeout...');
    const response = await Promise.race([countCheckPromise, timeoutPromise]);
    clearInterval(pollInterval);
    clearTimeout(timeoutId); // Clear timeout if count check succeeded first

    // Check if user clicked Stop during the wait
    if (!isProcessing) {
      // console.log('Background: User stopped during count check');
      return;
    }

    // console.log('Background: Response received:', response);

    if (response && response.cancelled) {
      // console.log('Background: Count check was cancelled by user');
      // Don't set countRetrieved, will show appropriate message
    } else if (response && response.success && typeof response.count === 'number') {
      // console.log(`Background: Count check succeeded! Count: ${response.count}`);
      todayCount = response.count;
      countRetrieved = true;
      // console.log(`Background: countRetrieved flag set to: ${countRetrieved}`);
    } else if (response && response.timeout) {
      // console.error('Background: Count check timed out after 30 seconds');
    } else {
      // console.error('Background: Unexpected response:', response);
    }
  } catch (error) {
    // console.error('Background: Error during count check:', error);
  } finally {
    // Always clean up, even on error
    isCheckingCount = false;
    countCheckResolve = null;
    await chrome.storage.local.remove(['countCheckComplete', 'todayApplicationCount', 'countCheckTimestamp']);
    // console.log('Background: Cleaned up count check data and reset flag');
  }

  // If count could not be retrieved, abort
  // console.log(`Background: Checking countRetrieved flag: ${countRetrieved}, todayCount: ${todayCount}, isProcessing: ${isProcessing}`);
  if (!countRetrieved) {
    // If user already stopped, don't show error
    if (!isProcessing) {
      // console.log('Background: Count check cancelled by user, not showing error');
      return;
    }

    // console.error('Background: Count was NOT retrieved, showing error');

    // Reset processing flag
    isProcessing = false;

    // Show error message to user
    if (handshakeTabId) {
      chrome.tabs.sendMessage(handshakeTabId, {
        action: 'countCheckFailed'
      }).catch(() => {});
    }

    return; // Don't start processing
  }

  // console.log(`Background: Count successfully retrieved: ${todayCount}, proceeding...`);

  // Set appliedCount to current count from Handshake and persist it
  const storedCount = await getStoredAppliedCountForToday();
  persistAppliedCountForToday(Math.max(storedCount, appliedCount, todayCount));

  // Update panel with initial count BEFORE processing any jobs
  if (handshakeTabId) {
    chrome.tabs.sendMessage(handshakeTabId, {
      action: 'updateProgress',
      appliedCount: appliedCount
    }).catch(() => {
      // Tab may not be ready, ignore error
    });
  }

  // Start processing the current page
  processCurrentPage();
}

function stopProcessing() {
  isProcessing = false;
  waitingForPageLoad = false; // Reset page load flag

  // Cancel ongoing count check if any
  if (isCheckingCount) {
    // console.log('Background: Cancelling ongoing count check due to stop');
    isCheckingCount = false;
    if (countCheckResolve) {
      countCheckResolve({ success: false, cancelled: true });
      countCheckResolve = null;
    }
  }

  // console.log('Background: Stopped processing');

  // Notify popup that processing has stopped
  chrome.runtime.sendMessage({
    action: 'stopped'
  }).catch(() => {
    // Popup may be closed, ignore error
  });
}

async function processCurrentPage() {
  if (!isProcessing || currentPageNum > maxPages) {
    // console.log('Background: Processing complete');
    isProcessing = false;
    return;
  }

  // console.log(`Background: Processing page ${currentPageNum}/${maxPages}`);

  // Send message to content script to start processing jobs on current page (with robust React SPA hydration polling)
  let success = false;
  for (let i = 0; i < 20; i++) {
    if (!isProcessing) return; // Break cleanly if user physically clicked Stop while the page was actively rendering

    try {
      await chrome.tabs.sendMessage(handshakeTabId, {
        action: 'processPage',
        pageNum: currentPageNum,
        startJobIndex: currentJobIndex
      });
      success = true;
      break;
    } catch (error) {
      // The Chrome Tab is likely mathematically mid-navigation or Handshake's React engine hasn't fully booted up the listener yet.
      await sleep(500);
    }
  }

  // If the target DOM permanently fails to hydrate gracefully after 10 full seconds, formally abort to prevent ghost processes
  if (!success) {
    stopProcessing();
  }
}

function handleJobProcessed(message) {
  if (message.status === 'Successfully applied') {
    appliedCount++;
    persistAppliedCountForToday(appliedCount);
  }

  currentJobIndex = message.nextJobIndex;

  // Update popup with stats
  chrome.runtime.sendMessage({
    action: 'updateStats',
    appliedCount: appliedCount,
    currentPage: currentPageNum,
    isProcessing: isProcessing
  }).catch(() => {
    // Popup may be closed, ignore error
  });

  // Update content script panel with current count
  if (handshakeTabId) {
    chrome.tabs.sendMessage(handshakeTabId, {
      action: 'updateProgress',
      appliedCount: appliedCount
    }).catch(() => {
      // Tab may not be ready, ignore error
    });
  }

  return false; // Continue processing
}

function handlePageComplete() {
  // Move to next page
  currentPageNum++;
  currentJobIndex = 0;

  if (isProcessing && currentPageNum <= maxPages) {
    // Navigate to next page
    waitingForPageLoad = true;

    chrome.tabs.sendMessage(handshakeTabId, {
      action: 'goToNextPage',
      pageNum: currentPageNum
    }).then(() => {
      // The chrome.tabs.onUpdated listener will call processCurrentPage() when page loads
    }).catch((error) => {
      // console.error('Background: Error going to next page:', error);
      waitingForPageLoad = false;
      stopProcessing();
    });
  } else {
    stopProcessing();
  }
}

function sendAiStatus(text) {
  if (handshakeTabId) {
    chrome.tabs.sendMessage(handshakeTabId, { action: 'aiStatus', text }).catch(() => {});
  }
}

async function wakeAiTab(tabId, reason) {
  try {
    console.log('[Handshake Plus] wakeAiTab:', reason);
    const aiTab = await chrome.tabs.get(tabId);
    if (!aiTab) return null;

    const previousTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const previousTab = previousTabs[0] && previousTabs[0].id !== tabId ? previousTabs[0] : null;

    if (!aiTab.active) {
      await chrome.tabs.update(tabId, { active: true });
    }
    if (aiTab.windowId) {
      await chrome.windows.update(aiTab.windowId, { focused: true }).catch(() => {});
    }

    return async () => {
      if (!previousTab || !previousTab.id) return;
      try {
        await chrome.tabs.update(previousTab.id, { active: true });
        if (previousTab.windowId) {
          await chrome.windows.update(previousTab.windowId, { focused: true }).catch(() => {});
        }
      } catch (e) {
        // Previous tab may have been closed; nothing to restore.
      }
    };
  } catch (error) {
    console.log('[Handshake Plus] wakeAiTab failed:', error.message);
    return null;
  }
}

function keepAiTabResident(tabId) {
  try {
    chrome.tabs.update(tabId, { autoDiscardable: false }).catch(() => {});
  } catch (e) {
    // Older Chromium builds may not support autoDiscardable updates.
  }
}

async function fetchViaClaudeAsMessageResponse(promptBundle, aggressive = false) {
  // Claude tab only.
  console.log('[Handshake Plus] fetchViaClaudeAsMessageResponse called, attempting claude.ai tab...');
  const text = await fetchViaClaudeTab(promptBundle, aggressive);
  if (text === null) throw new Error('[Handshake Plus] No claude.ai tab found. Open claude.ai and log in, then try again.');
  console.log('[Handshake Plus] fetchViaClaudeTab succeeded, response length:', text.length);
  return { content: [{ type: 'text', text }] };
}

// Sends the prompt to a claude.ai tab (existing ready one, or opens a fresh one).
// Returns the response text, or null if something went wrong.
async function fetchViaClaudeTab(promptBundle, aggressive = false) {
  const preparedPromptBundle = await applyStoredCustomAiInstructions(promptBundle, aggressive);
  const instructions = preparedPromptBundle.instructions ? preparedPromptBundle.instructions + '\n\n---\n\n' : '';
  const userContent = preparedPromptBundle.messages?.[preparedPromptBundle.messages.length - 1]?.content || '';
  const prompt = instructions + userContent;

  sendAiStatus('🤖 Connecting to Claude tab...');
  const tabId = await getReadyClaudeTabId();
  keepAiTabResident(tabId);
  sendAiStatus('🤖 Sending prompt to Claude...');

  return new Promise((resolve, reject) => {
    let aiPhase = 'connecting';
    let restoreAiTabFocus = null;
    const timeout = setTimeout(() => {
      cleanup();
      sendAiStatus('Applying to jobs...');
      reject(new Error('Claude tab timed out'));
    }, 90000);
    const wakeStartTimer = setTimeout(() => {
      if (aiPhase !== 'streaming') {
        wakeAiTab(tabId, 'Claude has not started responding yet. Waking tab to avoid Chrome background throttling.').then(restore => {
          if (restore && !restoreAiTabFocus) restoreAiTabFocus = restore;
        });
      }
    }, 5000);
    const wakeLongTimer = setTimeout(() => {
      wakeAiTab(tabId, 'Claude is taking a while. Waking tab to keep generation moving.').then(restore => {
        if (restore && !restoreAiTabFocus) restoreAiTabFocus = restore;
      });
    }, 25000);

    function cleanup() {
      clearTimeout(timeout);
      clearTimeout(wakeStartTimer);
      clearTimeout(wakeLongTimer);
      chrome.runtime.onMessage.removeListener(responseListener);
      if (restoreAiTabFocus) {
        restoreAiTabFocus();
        restoreAiTabFocus = null;
      }
    }

    function responseListener(message, sender) {
      if (sender.tab?.id !== tabId) return;
      if (message.type === 'handshakePlusAiProgress' && message.provider === 'claude') {
        aiPhase = message.phase || aiPhase;
        return;
      }
      if (message.type !== 'handshakePlusResponse') return;
      cleanup();
      if (message.error) {
        reject(new Error(message.error));
      } else {
        resolve(message.text);
      }
    }

    chrome.runtime.onMessage.addListener(responseListener);

    chrome.tabs.sendMessage(tabId, { type: 'handshakePlusPrompt', prompt })
      .then(() => sendAiStatus('🤖 Waiting for Claude to respond...'))
      .catch(err => {
        cleanup();
        reject(err);
      });
  });
}

// Tries to ping a tab; if it fails, injects claude.js programmatically and retries.
async function ensureClaudeScriptReady(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'handshakePlusPing' });
    return true;
  } catch (e) {
    // declarative injection missed this tab — inject programmatically
  }
  if (!chrome.scripting || typeof chrome.scripting.executeScript !== 'function') {
    console.log('[Handshake Plus] ensureClaudeScriptReady: chrome.scripting.executeScript is unavailable. Reload the extension from chrome://extensions so the scripting permission is active.');
    return false;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['claude-response-utils.js', 'claude.js'] });
  } catch (err) {
    console.log('[Handshake Plus] ensureClaudeScriptReady: inject failed for tab', tabId, err.message);
    return false;
  }
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'handshakePlusPing' });
      return true;
    } catch (e) { /* keep trying */ }
  }
  return false;
}

// Returns a tab ID for a claude.ai tab that has the content script ready.
// Pings existing tabs first (injecting if needed), then opens a fresh tab as last resort.
async function getReadyClaudeTabId() {
  const customUrl = await getConfiguredAiTabUrl('claude');
  const tabs = await chrome.tabs.query({ url: 'https://claude.ai/*' });
  console.log('[Handshake Plus] getReadyClaudeTabId: existing tabs:', tabs.length);

  const candidateTabs = customUrl
    ? tabs.filter(tab => HandshakePlusAiTabs.isSameAiProviderUrl(tab.url, customUrl))
    : tabs;

  for (const tab of candidateTabs) {
    const ready = await ensureClaudeScriptReady(tab.id);
    if (ready) {
      console.log('[Handshake Plus] getReadyClaudeTabId: tab', tab.id, 'is ready');
      return tab.id;
    }
    console.log('[Handshake Plus] getReadyClaudeTabId: tab', tab.id, 'could not be made ready');
  }

  // No ready tab — open a fresh one
  const targetUrl = customUrl || 'https://claude.ai/new';
  console.log('[Handshake Plus] getReadyClaudeTabId: opening tab:', targetUrl);
  const newTab = await chrome.tabs.create({ url: targetUrl, active: false });

  await new Promise((resolve) => {
    function listener(tabId, info) {
      if (tabId === newTab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });

  await new Promise(r => setTimeout(r, 1500));
  const ready = await ensureClaudeScriptReady(newTab.id);
  if (ready) {
    console.log('[Handshake Plus] getReadyClaudeTabId: new tab', newTab.id, 'ready');
    return newTab.id;
  }

  console.log('[Handshake Plus] getReadyClaudeTabId: new tab', newTab.id, 'not ready');
  throw new Error('Claude tab content script is not available. Reload the Handshake Plus extension at chrome://extensions, then refresh or reopen claude.ai.');
}

async function getConfiguredAiTabUrl(provider) {
  const storageKey = provider === 'gemini' ? 'handshakePlusGeminiUrl' : 'handshakePlusClaudeUrl';
  const result = await chrome.storage.local.get(storageKey);
  return HandshakePlusAiTabs.normalizeAiProviderUrl(provider, result[storageKey] || '');
}

async function applyStoredCustomAiInstructions(promptBundle, aggressive = false) {
  const result = await chrome.storage.local.get('handshakePlusCustomAiInstructions');
  return HandshakePlusAiPrompts.applyCustomAiInstructions(promptBundle, result.handshakePlusCustomAiInstructions || '', aggressive);
}

// ── Gemini tab helpers (mirror of Claude tab helpers above) ──────────────────

async function ensureGeminiScriptReady(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'handshakePlusGeminiPing' });
    return true;
  } catch (e) { /* try programmatic injection */ }
  if (!chrome.scripting || typeof chrome.scripting.executeScript !== 'function') {
    console.log('[Handshake Plus] ensureGeminiScriptReady: chrome.scripting.executeScript is unavailable. Reload the extension from chrome://extensions so the scripting permission is active.');
    return false;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['gemini.js'] });
  } catch (err) {
    console.log('[Handshake Plus] ensureGeminiScriptReady: inject failed for tab', tabId, err.message);
    return false;
  }
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'handshakePlusGeminiPing' });
      return true;
    } catch (e) { /* keep trying */ }
  }
  return false;
}

async function getReadyGeminiTabId() {
  const customUrl = await getConfiguredAiTabUrl('gemini');
  const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
  console.log('[Handshake Plus] getReadyGeminiTabId: existing tabs:', tabs.length);
  const candidateTabs = customUrl
    ? tabs.filter(tab => HandshakePlusAiTabs.isSameAiProviderUrl(tab.url, customUrl))
    : tabs;

  for (const tab of candidateTabs) {
    const ready = await ensureGeminiScriptReady(tab.id);
    if (ready) return tab.id;
  }
  const targetUrl = customUrl || 'https://gemini.google.com/';
  console.log('[Handshake Plus] getReadyGeminiTabId: opening tab:', targetUrl);
  const newTab = await chrome.tabs.create({ url: targetUrl, active: false });
  await new Promise((resolve) => {
    function listener(tabId, info) {
      if (tabId === newTab.id && info.status === 'complete') { chrome.tabs.onUpdated.removeListener(listener); resolve(); }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
  await new Promise(r => setTimeout(r, 2000));
  const ready = await ensureGeminiScriptReady(newTab.id);
  if (ready) {
    return newTab.id;
  }
  throw new Error('Gemini tab content script is not available. Reload the Handshake Plus extension at chrome://extensions, then refresh or reopen gemini.google.com.');
}

async function fetchViaGeminiTab(promptBundle, aggressive = false) {
  const preparedPromptBundle = await applyStoredCustomAiInstructions(promptBundle, aggressive);
  const instructions = preparedPromptBundle.instructions ? preparedPromptBundle.instructions + '\n\n---\n\n' : '';
  const userContent = preparedPromptBundle.messages?.[preparedPromptBundle.messages.length - 1]?.content || '';
  const prompt = instructions + userContent;

  sendAiStatus('✨ Connecting to Gemini tab...');
  const tabId = await getReadyGeminiTabId();
  keepAiTabResident(tabId);
  sendAiStatus('✨ Sending prompt to Gemini...');

  return new Promise((resolve, reject) => {
    let aiPhase = 'connecting';
    let restoreAiTabFocus = null;
    const timeout = setTimeout(() => {
      cleanup();
      sendAiStatus('Applying to jobs...');
      reject(new Error('Gemini tab timed out'));
    }, 120000);
    const wakeStartTimer = setTimeout(() => {
      if (aiPhase !== 'streaming') {
        wakeAiTab(tabId, 'Gemini has not started responding yet. Waking tab to avoid Chrome background throttling.').then(restore => {
          if (restore && !restoreAiTabFocus) restoreAiTabFocus = restore;
        });
      }
    }, 5000);
    const wakeLongTimer = setTimeout(() => {
      wakeAiTab(tabId, 'Gemini is taking a while. Waking tab to keep generation moving.').then(restore => {
        if (restore && !restoreAiTabFocus) restoreAiTabFocus = restore;
      });
    }, 25000);

    function cleanup() {
      clearTimeout(timeout);
      clearTimeout(wakeStartTimer);
      clearTimeout(wakeLongTimer);
      chrome.runtime.onMessage.removeListener(responseListener);
      if (restoreAiTabFocus) {
        restoreAiTabFocus();
        restoreAiTabFocus = null;
      }
    }

    function responseListener(message, sender) {
      if (sender.tab?.id !== tabId) return;
      if (message.type === 'handshakePlusAiProgress' && message.provider === 'gemini') {
        aiPhase = message.phase || aiPhase;
        return;
      }
      if (message.type !== 'handshakePlusGeminiResponse') return;
      cleanup();
      if (message.error) reject(new Error(message.error));
      else resolve(message.text);
    }

    chrome.runtime.onMessage.addListener(responseListener);

    chrome.tabs.sendMessage(tabId, { type: 'handshakePlusGeminiPrompt', prompt })
      .then(() => sendAiStatus('✨ Waiting for Gemini to respond...'))
      .catch(err => {
        cleanup();
        reject(err);
      });
  });
}

// Generate a resume summary and extract contact info using the selected AI tab.
async function generateResumeSummary(resumeText, provider = 'gemini') {
  try {
    // console.log('Background: Parsing resume using selected AI tab...');

    const instructionPrompt = `You are a professional career advisor and data extractor. 
Analyze the provided resume and return a STRICT JSON object with exactly three keys:
1. "summary": A 4-5 paragraph professional summary highlighting key qualifications, experience, skills, and achievements.
2. "contact": An object containing exactly "fullName", "email", "phone", and "location" extracted from the resume. If a field is missing, set it to an empty string.
3. "screeningFacts": An object containing exactly "languages", "relocationLocations", "workAuthorization", and "sponsorship".

For "screeningFacts":
- "languages" must be a comma-separated list of spoken languages explicitly shown in the resume, or "".
- "relocationLocations" must be a comma-separated list of locations the candidate explicitly says they are willing to relocate to, or "".
- "workAuthorization" must be "yes", "no", or "" only. Use "yes" only when the resume explicitly states US work authorization, citizenship, permanent residency, or no work restrictions. Use "no" only when it explicitly says the candidate is not authorized.
- "sponsorship" must be "yes", "no", or "" only. Use "yes" only when the resume explicitly states sponsorship is needed. Use "no" only when it explicitly states sponsorship is not needed.

IMPORTANT: Output ONLY one fenced JSON code block and no other text. Start with \`\`\`json and end with \`\`\`.`;

    const promptBundle = {
      instructions: instructionPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the resume text:\n\n${resumeText}`
        }
      ]
    };

    const rawText = provider === 'gemini'
      ? await fetchViaGeminiTab(promptBundle)
      : (await fetchViaClaudeAsMessageResponse(promptBundle))?.content?.[0]?.text;

    if (rawText) {
      let jsonText = rawText.trim();
      
      // Prefer the requested fenced JSON block, but tolerate raw JSON or extra provider text.
      const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (match && match[1]) {
        jsonText = match[1].trim();
      } else {
        // Fallback: If no markdown block exists but there is conversational text, 
        // aggressively find the first and last curly braces to extract the raw JSON object natively.
        const braceMatch = jsonText.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          jsonText = braceMatch[0].trim();
        }
      }

      try {
        const parsed = JSON.parse(jsonText);
        // console.log(`Background: Resume parsed successfully.`);
        return normalizeResumeParseResult(parsed);
      } catch (e) {
        console.error("Failed to parse AI JSON response:", jsonText);
        throw new Error("AI returned invalid JSON formatting.");
      }
    }

    throw new Error('Unexpected Claude response format');
  } catch (error) {
    console.error('Background: Error parsing resume:', error);
    throw error;
  }
}

function normalizeResumeParseResult(parsed) {
  const contact = parsed && typeof parsed.contact === 'object' && parsed.contact ? parsed.contact : {};
  const screeningFacts = parsed && typeof parsed.screeningFacts === 'object' && parsed.screeningFacts ? parsed.screeningFacts : {};

  return {
    summary: toCleanString(parsed?.summary),
    contact: {
      fullName: toCleanString(contact.fullName || contact.name || contact.full_name),
      email: toCleanString(contact.email || contact.emailAddress || contact.email_address),
      phone: toCleanString(contact.phone || contact.phoneNumber || contact.phone_number),
      location: toCleanString(contact.location || contact.currentLocation || contact.current_location),
    },
    screeningFacts: {
      languages: toCleanString(screeningFacts.languages),
      relocationLocations: toCleanString(screeningFacts.relocationLocations || screeningFacts.relocation_locations),
      workAuthorization: normalizeYesNoFact(screeningFacts.workAuthorization || screeningFacts.work_authorization),
      sponsorship: normalizeSponsorshipFact(screeningFacts.sponsorship || screeningFacts.visaSponsorship || screeningFacts.visa_sponsorship),
    },
  };
}

function toCleanString(value) {
  if (Array.isArray(value)) return value.map(toCleanString).filter(Boolean).join(', ');
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeYesNoFact(value) {
  const text = toCleanString(value).toLowerCase();
  if (!text || text === 'unknown' || text === 'n/a' || text === 'not specified') return '';
  if (text === 'no' || text === 'false' || text.includes('not authorized')) return 'no';
  if (text === 'yes' || text === 'true' || text.includes('authorized') || text.includes('citizen') || text.includes('permanent resident') || text.includes('no sponsorship')) return 'yes';
  return '';
}

function normalizeSponsorshipFact(value) {
  const text = toCleanString(value).toLowerCase();
  if (!text || text === 'unknown' || text === 'n/a' || text === 'not specified') return '';
  if (text === 'no' || text === 'false' || text.includes('no sponsorship') || text.includes('not need sponsorship') || text.includes('do not need sponsorship') || text.includes('does not require sponsorship') || text.includes('will not require sponsorship')) return 'no';
  if (text === 'yes' || text === 'true' || text.includes('requires sponsorship') || text.includes('require sponsorship') || text.includes('need sponsorship')) return 'yes';
  return '';
}

// Generate a cover letter using Claude (via claude.ai tab) or Gemini (via gemini.google.com tab).
async function generateCoverLetter(jobTitle, companyName, jobSummary, resumeSummary, fullName, email, phone, location, provider = 'gemini') {
  try {
    const instructionPrompt = `You are an expert career advisor. Write a highly tailored, concise cover letter strictly for the exact job listed: "${jobTitle}". Do NOT hallucinate alternative job titles or broad roles. Do NOT include any physical addresses, email addresses, phone numbers, or dates at the top. Start the letter directly with "Hello," followed by a natural sentence introducing the applicant. Make it highly human-like, include natural transitions, use clear language, and emphasize clarity. CRITICAL INSTRUCTION: You are strictly forbidden from using any hyphens, dashes, or em-dashes (e.g. no "-", "--", or "—") anywhere in the text under any circumstance. Avoid saying "Inc" or "LLC" in the company name to sound more natural.`;
    const userPrompt = `Please write a cover letter for the "${jobTitle}" position at "${companyName}" based on this job summary:\n"${jobSummary}"\n\nAnd here is my resume summary:\n"${resumeSummary}"\n\nStructure it exactly like this:\n\n1. Start directly with "Hello," followed by exactly TWO newlines, and then a first sentence that signals fit through concrete content, not by introducing me or stating that I am applying.\n\n2. In one or two short paragraphs, connect my experience directly to the company's most pressing needs. Do not list their requirements and my qualifications separately — weave them together. Frame my experience as outcomes and results, not duties or responsibilities. Use the company's own language and keywords from the job summary. Write as if I am a busy colleague sending a quick, confident email — not a candidate performing for a committee. Include one specific, concrete detail that shows I understand what this role actually demands.\n\n3. Close with one brief farewell sentence that is warm but not sycophantic.\n\nFinally, sign off with "Sincerely," followed by a newline, and then my name${fullName ? ` (${fullName})` : ''}.\n\nStrict constraints:\n- Total length: 150 to 180 words maximum\n- ZERO hyphens or dashes\n- Write the body in first person. Use "I", "my", "me". Never refer to me by name or in third person inside the letter.\n- No robotic or corporate jargon\n- No flattery phrases like "I am excited to apply" or "I believe my skills align"\n- No headers\n- Do not repeat the resume — add context the resume cannot provide\n- Every sentence must pass this test: does it tell them what changed or what I produced, not just what I was responsible for`;

    const promptBundle = {
      instructions: instructionPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    };

    let rawText;
    if (provider === 'gemini') {
      rawText = await fetchViaGeminiTab(promptBundle);
    } else {
      const result = await fetchViaClaudeAsMessageResponse(promptBundle);
      rawText = result?.content?.[0]?.text;
      if (!rawText) throw new Error('Unexpected Claude response format');
    }

    let coverLetter = rawText.trim();

    // Strip any thinking preamble: find the last "Hello," before "Sincerely,"
    const sincerelyIdx = coverLetter.search(/Sincerely,/i);
    if (sincerelyIdx > 0) {
      const beforeSincerely = coverLetter.slice(0, sincerelyIdx);
      const lastHello = beforeSincerely.lastIndexOf('Hello,');
      if (lastHello >= 0) coverLetter = coverLetter.slice(lastHello);
    } else {
      const helloIdx = coverLetter.search(/Hello,/i);
      if (helloIdx > 0) coverLetter = coverLetter.slice(helloIdx);
    }

    coverLetter = coverLetter.replace(/^(Hello,[ \t]*\n*)+/i, 'Hello,\n\n');
    coverLetter = coverLetter.replace(/\s*Sincerely,[ \t]*\n*/i, '\n\nSincerely,\n');

    // Prepend contact header + date
    if (fullName || email || phone || location) {
      let headerInfos = [];
      if (fullName) headerInfos.push(fullName);
      let subInfos = [];
      if (location) subInfos.push(location);
      if (phone) subInfos.push(phone);
      if (email) subInfos.push(email);
      if (subInfos.length > 0) headerInfos.push(subInfos.join(' | '));
      let header = headerInfos.join('\n') + '\n\n';
      const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
      header += formattedDate + '\n\n';
      coverLetter = header + coverLetter;
    }

    return coverLetter;
  } catch (error) {
    console.error('Background: Error generating cover letter:', error);
    throw error;
  }
}

async function generateRequiredDocument(instruction, jobTitle, companyName, jobSummary, resumeSummary, provider = 'gemini', aggressive = false) {
  try {
    const helper = globalThis.HandshakePlusRequiredDocuments;
    if (!helper) throw new Error('Required document helper is not loaded');

    const prompt = helper.buildRequiredDocumentPrompt({
      instruction,
      jobTitle,
      companyName,
      jobSummary,
      resumeSummary,
      aggressive
    });

    const promptBundle = {
      instructions: prompt.instructionPrompt,
      messages: [{ role: 'user', content: prompt.userPrompt }]
    };

    let rawText;
    if (provider === 'gemini') {
      rawText = await fetchViaGeminiTab(promptBundle, aggressive);
    } else {
      const result = await fetchViaClaudeAsMessageResponse(promptBundle, aggressive);
      rawText = result?.content?.[0]?.text;
      if (!rawText) throw new Error('Unexpected Claude response format');
    }

    return helper.extractRequiredDocumentText(rawText);
  } catch (error) {
    console.error('Background: Error generating required document:', error);
    throw error;
  }
}

async function answerScreeningQuestionsWithAI(input) {
  const screening = globalThis.HandshakePlusScreening;
  if (!screening) throw new Error('Screening answer helper is not loaded');

  const aggressive = input.aggressive === true;

  const prompt = screening.buildScreeningAnswerPrompt({
    questions: input.questions || [],
    screeningFacts: input.screeningFacts || {},
    contactLocation: input.contactLocation || '',
    resumeSummary: input.resumeSummary || '',
    jobContext: input.jobContext || {},
    aggressive,
  });

  const promptBundle = {
    instructions: prompt.instructionPrompt,
    messages: [{ role: 'user', content: prompt.userPrompt }]
  };

  let rawText;
  if (input.provider === 'gemini') {
    rawText = await fetchViaGeminiTab(promptBundle, aggressive);
  } else {
    const result = await fetchViaClaudeAsMessageResponse(promptBundle, aggressive);
    rawText = result?.content?.[0]?.text;
    if (!rawText) throw new Error('Unexpected Claude response format');
  }

  return screening.parseScreeningAnswerResponse(rawText, input.questions || [], aggressive);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
