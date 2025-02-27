console.log("Favicon Packs: content.js loaded");

(function() {
  const FAVICON_ID = "favicon-packs-favicon";
  const MAX_RETRIES = 5;
  let isInitializing = false;
  let currentFaviconHref = null;
  let hasInitialized = false;
  let isOurChange = false;
  let changeTimeout = null;

  function setOurChange(value) {
    if (changeTimeout) clearTimeout(changeTimeout);

    isOurChange = value;

    if (value) {
      changeTimeout = setTimeout(
        () => {
          isOurChange = false;
          changeTimeout = null;
        },
        1000, // 1 second
      );
    }
  }

  // Update the cleanupExistingIcons function to be more thorough
  function cleanupExistingIcons() {
    const selectors = [
      'link[rel*="icon"]',
      'link[rel*="shortcut"]',
      'link[rel*="apple-touch"]',
      'link[rel*="mask-icon"]',
      'link[rel*="fluid-icon"]',
      'link[rel="manifest"]',
      'meta[name*="msapplication"]',
    ].join(',');

    // Remove elements and prevent new insertions
    const removeAndBlock = (node) => {
      if (node.id !== FAVICON_ID) {
        node.remove();
        // Mark as removed to prevent re-insertion
        node.dataset.removed = 'true';
      }
    };

    document.querySelectorAll(selectors).forEach(removeAndBlock);
  }

  function replaceFavicon(imgUrl) {
    // Prevent concurrent initializations
    if (isInitializing) {
      console.log('Favicon Packs: Already initializing, skipping');
      return;
    }

    isInitializing = true;

    try {
      cleanupExistingIcons();

      // Remove existing favicon if present
      const existingFavicon = document.getElementById(FAVICON_ID);
      if (existingFavicon) existingFavicon.remove();

      const link = document.createElement("link");
      link.rel = "shortcut icon";
      link.type = "image/png";
      link.id = FAVICON_ID;
      link.href = imgUrl;

      currentFaviconHref = imgUrl;

      setOurChange(true);
      document.head.appendChild(link);

      // Add a style to prevent other favicons
      const style = document.createElement('style');
      style.id = 'favicon-packs-style';
      style.textContent = `
        link[rel*="icon"]:not(#${FAVICON_ID}),
        link[rel*="shortcut"]:not(#${FAVICON_ID}),
        link[rel*="apple-touch"]:not(#${FAVICON_ID}),
        link[rel*="mask-icon"]:not(#${FAVICON_ID}) {
          display: none !important;
        }
      `;
      document.head.appendChild(style);

      console.log('Favicon Packs: Successfully replaced favicon');
      return link;
    } finally {
      isInitializing = false;
    }
  }

  function getColorScheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  // Update the persistence check to be more aggressive
  function persistentReplace(imgUrl, retryCount = 0) {
    const favicon = replaceFavicon(imgUrl);
    if (!favicon) {
      console.log('Favicon Packs: Failed to replace favicon');
      return;
    }

    // Randomization to avoid detection (300-500ms)
    const CHECK_INTERVAL = Math.floor(Math.random() * 200) + 300;

    const checkInterval = setInterval(
      () => {
        const currentFavicon = document.getElementById(FAVICON_ID);
        const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
        const style = document.getElementById('favicon-packs-style');

        const needsReplacement =
          !currentFavicon ||
          !style ||
          currentFavicon.href !== currentFaviconHref ||
          existingFavicons.length > 1 ||
          !document.head.contains(currentFavicon);

        if (needsReplacement) {
          clearInterval(checkInterval);
          if (retryCount < MAX_RETRIES) {
            console.log(`Favicon Packs: Retry attempt ${retryCount + 1}`);

            // Add small random delay before retry
            setTimeout(
              () => {
                persistentReplace(imgUrl, retryCount + 1);
              },
              Math.random() * 100,
            );
          } else {
            console.log('Favicon Packs: Max retries reached, giving up');
          }
        }
      },
      CHECK_INTERVAL,
    );
  }

  // Listen for favicon updates from background script
  browser.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.action === "setFavicon") {
      console.log(`request.imgUrl`);
      console.dir(request.imgUrl, { depth: null });

      // Return early if imgUrl is null
      if (!request.imgUrl) {
        console.log('Favicon Packs: No favicon URL provided, stopping favicon management');
        hasInitialized = false;
        isInitializing = false;
        return;
      }

      // Reset retryCount when it's a new page initialization
      const startingRetryCount = request.resetRetries ? 0 : request.retryCount || 0;
      persistentReplace(request.imgUrl, startingRetryCount);
    }
  });

  function initialize() {
    if (hasInitialized) {
      console.log('Favicon Packs: Already initialized, skipping');
      return;
    }

    hasInitialized = true;
    browser.runtime.sendMessage({
      action: "replaceFavicon",
      colorScheme: getColorScheme(),
      resetRetries: true,
    });
  }

  function setupFaviconObserver() {
    const observer = new MutationObserver((mutations) => {
      if (isOurChange) return;

      let needsReset = false;

      for (const mutation of mutations) {
        // Check for added nodes
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          needsReset = addedNodes.some(node =>
            (node.nodeName === 'LINK' && node.rel && node.rel.includes('icon')) ||
            (node.nodeName === 'META' && node.name && node.name.includes('msapplication'))
          );
        }

        // Check for attribute changes on our favicon
        if (mutation.type === 'attributes' && mutation.target.id === FAVICON_ID) {
          needsReset = true;
        }
      }

      if (needsReset) {
        console.log('Favicon modification detected, resetting...');
        hasInitialized = false;
        cleanupExistingIcons();

        browser.runtime.sendMessage({
          action: "replaceFavicon",
          colorScheme: getColorScheme(),
          resetRetries: true
        });
      }
    });

    // Observe both head and body to catch all favicon changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'rel', 'src'],
      characterData: true
    });

    return observer;
  }

  // Multiple initialization points to catch different site behaviors
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initialize();
      setupFaviconObserver();
    });
  } else {
    initialize();
    setupFaviconObserver();
  }

  // Watch for theme changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    hasInitialized = false;
    initialize();
  });
})();
