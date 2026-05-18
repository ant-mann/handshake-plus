document.addEventListener('DOMContentLoaded', async () => {

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we're on the job search page
  const isJobSearchPage = tab.url && tab.url.match(/^https:\/\/[a-z0-9-]+\.joinhandshake\.com\/job-search\//);

  const goBtn = document.getElementById('go-to-handshake-btn');
  const uniSelector = document.getElementById('university-selector');
  const uniInput = document.getElementById('university-input');
  const uniList = document.getElementById('university-list');

  // Dynamically update dropdown with ONLY top 5 best matches when typing!
  if (typeof handshakeUniversities !== 'undefined') {
    const allUnis = Object.keys(handshakeUniversities);
    
    // Default: seed the list with 5 popular ones so it's not totally empty on first click
    const defaultUnis = ['Cornell University', 'Harvard University', 'MIT', 'Stanford University', 'UC Berkeley'];
    const populateList = (matches) => {
      uniList.innerHTML = '';
      matches.forEach(uni => {
        const option = document.createElement('option');
        option.value = uni;
        uniList.appendChild(option);
      });
    };
    
    populateList(defaultUnis); // Seed on load
    
    // Instantly filter to top 5 based strictly on exactly what user is currently typing
    uniInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      if (!q) {
        populateList(defaultUnis);
        return;
      }
      
      const filtered = allUnis.filter(uni => uni.toLowerCase().includes(q))
                              .sort((a, b) => a.indexOf(q) - b.indexOf(q)) // Best matches bubble first!
                              .slice(0, 5);
      populateList(filtered);
    });
  }

  // Load previously saved university and query params from local storage
  chrome.storage.local.get(['savedUniversity', 'savedHandshakeQueryParams', 'savedHandshakePath'], (result) => {
    if (result.savedUniversity) uniInput.value = result.savedUniversity;
    window.savedHandshakeQueryParams = result.savedHandshakeQueryParams || '';
    window.savedHandshakePath = result.savedHandshakePath || '/stu/postings';
  });

  if (isJobSearchPage) {
    goBtn.style.display = 'none';
    if (uniSelector) uniSelector.style.display = 'none';
  } else {
    goBtn.style.display = 'block';
    if (uniSelector) uniSelector.style.display = 'block';

    goBtn.addEventListener('click', () => {
      let savedPath = window.savedHandshakePath || '/stu/postings';
      let targetUrl = `https://app.joinhandshake.com${savedPath}`; // Default fallback

      // If the user selected a valid university from our dictionary, route directly to its specific domain
      if (uniInput.value && typeof handshakeUniversities !== 'undefined' && handshakeUniversities[uniInput.value]) {
        targetUrl = `https://${handshakeUniversities[uniInput.value]}${savedPath}`;
        chrome.storage.local.set({ savedUniversity: uniInput.value });
      }

      // Inject previous active Handshake search parameters
      if (window.savedHandshakeQueryParams) {
        targetUrl += '?' + window.savedHandshakeQueryParams;
      }

      chrome.runtime.sendMessage({ action: 'openHandshakeWindow', targetUrl: targetUrl });
    });
  }
});
