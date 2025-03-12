fpLogger.info('content.js loaded')
;(function () {
  const FAVICON_ID = 'favicon-packs-favicon'
  const MAX_RETRIES = 5

  let changeTimeout = null
  let currentFaviconHref = null
  let hasInitialized = false
  let isExtensionChange = false
  let isInitializing = false

  function setOurChange (value) {
    fpLogger.debug('setOurChange()')

    if (changeTimeout) clearTimeout(changeTimeout)

    isExtensionChange = value

    if (value) {
      changeTimeout = setTimeout(
        () => {
          isExtensionChange = false
          changeTimeout = null
        },
        1000 // 1 second
      )
    }
  }

  // Update the cleanupExistingIcons function to be more thorough
  function cleanupExistingIcons () {
    fpLogger.debug('cleanupExistingIcons()')

    const selectors = [
      'link[rel*="icon"]',
      'link[rel*="shortcut"]',
      'link[rel*="apple-touch"]',
      'link[rel*="mask-icon"]',
      'link[rel*="fluid-icon"]',
      'link[rel="manifest"]',
      'meta[name*="msapplication"]'
    ].join(',')

    // Remove elements and prevent new insertions
    const removeAndBlock = node => {
      if (node.id !== FAVICON_ID) {
        node.remove()
        // Mark as removed to prevent re-insertion
        node.dataset.removed = 'true'
      }
    }

    document.querySelectorAll(selectors).forEach(removeAndBlock)
  }

  function replaceFavicon (imgUrl) {
    fpLogger.debug('replaceFavicon()')

    // Prevent concurrent initializations
    if (isInitializing) {
      fpLogger.info('Already initializing, skipping')
      return
    }

    isInitializing = true

    try {
      cleanupExistingIcons()

      // Remove existing favicon if present
      const existingFavicon = document.getElementById(FAVICON_ID)
      if (existingFavicon) existingFavicon.remove()

      const link = document.createElement('link')
      link.rel = 'shortcut icon'
      link.type = 'image/png'
      link.id = FAVICON_ID
      link.href = imgUrl

      currentFaviconHref = imgUrl

      setOurChange(true)
      document.head.appendChild(link)

      // Add a style to prevent other favicons
      const style = document.createElement('style')
      style.id = 'favicon-packs-style'
      style.textContent = `
        link[rel*="icon"]:not(#${FAVICON_ID}),
        link[rel*="shortcut"]:not(#${FAVICON_ID}),
        link[rel*="apple-touch"]:not(#${FAVICON_ID}),
        link[rel*="mask-icon"]:not(#${FAVICON_ID}) {
          display: none !important;
        }
      `
      document.head.appendChild(style)

      fpLogger.quiet('Replaced favicon')
      return link
    } finally {
      isInitializing = false
    }
  }

  function getColorScheme () {
    fpLogger.debug('getColorScheme()')
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  // Update the persistence check to be more aggressive
  function persistentReplace (imgUrl, retryCount = 0) {
    fpLogger.debug('persistentReplace()')

    const favicon = replaceFavicon(imgUrl)
    if (!favicon) {
      fpLogger.quiet('Failed to replace favicon')
      return
    }

    // Randomization to avoid detection (300-500ms)
    const CHECK_INTERVAL = Math.floor(Math.random() * 200) + 300

    const checkInterval = setInterval(() => {
      const currentFavicon = document.getElementById(FAVICON_ID)
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]')
      const style = document.getElementById('favicon-packs-style')

      const needsReplacement =
        !currentFavicon ||
        !style ||
        currentFavicon.href !== currentFaviconHref ||
        existingFavicons.length > 1 ||
        !document.head.contains(currentFavicon)

      if (needsReplacement) {
        clearInterval(checkInterval)
        if (retryCount < MAX_RETRIES) {
          fpLogger.info(`Retry attempt ${retryCount + 1}`)

          // Add small random delay before retry
          setTimeout(() => {
            persistentReplace(imgUrl, retryCount + 1)
          }, Math.random() * 100)
        } else {
          fpLogger.info('Max retries reached, giving up')
        }
      }
    }, CHECK_INTERVAL)
  }

  // Listen for favicon updates from background script
  browser.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    fpLogger.trace('request', request)

    if (request.action === 'setFavicon') {
      fpLogger.debug('request.imgUrl', request.imgUrl)

      // Return early if imgUrl is null
      if (!request.imgUrl) {
        fpLogger.info('No favicon URL provided, stopping favicon management')

        hasInitialized = false
        isInitializing = false
        return
      }

      // Reset retryCount when it's a new page initialization
      const startingRetryCount = request.resetRetries
        ? 0
        : request.retryCount || 0
      persistentReplace(request.imgUrl, startingRetryCount)
    }
  })

  function initialize () {
    fpLogger.debug('initialize()')

    if (hasInitialized) {
      fpLogger.debug('Already initialized, skipping')
      return
    }

    hasInitialized = true
    browser.runtime.sendMessage({
      action: 'replaceFavicon',
      colorScheme: getColorScheme(),
      resetRetries: true
    })
  }

  function setupFaviconObserver () {
    fpLogger.debug('setupFaviconObserver()')

    const observer = new window.MutationObserver(mutations => {
      if (isExtensionChange) return

      let needsReset = false

      for (const mutation of mutations) {
        // Check for added nodes
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes)
          needsReset = addedNodes.some(node => {
            return (
              (node.nodeName === 'LINK' &&
                node.rel &&
                node.rel.includes('icon')) ||
              (node.nodeName === 'META' &&
                node.name &&
                node.name.includes('msapplication'))
            )
          })
        }

        // Check for attribute changes on our favicon
        if (
          mutation.type === 'attributes' &&
          mutation.target.id === FAVICON_ID
        ) {
          needsReset = true
        }
      }

      if (needsReset) {
        fpLogger.info('Favicon modification detected, resetting...')

        hasInitialized = false
        cleanupExistingIcons()

        browser.runtime.sendMessage({
          action: 'replaceFavicon',
          colorScheme: getColorScheme(),
          resetRetries: true
        })
      }
    })

    // Observe both head and body to catch all favicon changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'rel', 'src'],
      characterData: true
    })

    return observer
  }

  // Multiple initialization points to catch different site behaviors
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fpLogger.debug('DOMContentLoaded')

      initialize()
      setupFaviconObserver()
    })
  } else {
    fpLogger.debug('Already loaded')

    initialize()
    setupFaviconObserver()
  }

  // Watch for theme changes
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      fpLogger.info('Theme change detected, resetting...')

      hasInitialized = false
      initialize()
    })
})()
