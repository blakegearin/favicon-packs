fpLogger.info('content.js loaded')

;(function () {
  const CUSTOM_FAVICON_CLASS = 'favicon-packs-custom-favicon'

  let customFaviconHref = null
  let hasInitialized = false
  let isInitializing = false
  let currentCheckInterval = null
  let currentObserver = null
  let observerConfig = null

  let lastUrl = window.location.href
  let urlCheckInterval = null

  let currentStrategy = {
    removeExistingIcons: true,
    addCssHiding: true,
    addShortcutLink: true,
    observeMutations: {
      enabled: true,
      attributeFilter: ['href', 'rel', 'src']
    },
    persistence: {
      enabled: true,
      checkIntervalTime: 400,
      randomizationFactor: 0.2,
      retryLimit: null
    },
    urlChangeDetection: {
      enabled: true,
      checkIntervalTime: 1000
    }
  }

  async function sendMessageWithRetry (message, maxRetries = 3, delay = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await browser.runtime.sendMessage(message)
        return
      } catch (error) {
        if (attempt === maxRetries) {
          fpLogger.error(
            `Failed to send message to background script after ${maxRetries} attempts:`,
            error
          )
        } else {
          fpLogger.silent(
            `Message send attempt ${attempt} failed, retrying in ${delay}ms...`
          )
          await new Promise(resolve => setTimeout(resolve, delay))
          delay *= 2 // Exponential backoff
        }
      }
    }
  }

  function cleanupExistingIcons (strategy = {}) {
    fpLogger.debug('cleanupExistingIcons()')

    if (strategy.removeExistingIcons === false) {
      fpLogger.debug('Skipping icon removal due to strategy settings')
      return
    }

    const selectors = [
      'link[rel*="icon"]',
      'link[rel*="shortcut"]',
      'link[rel*="apple-touch"]',
      'link[rel*="mask-icon"]',
      'link[rel*="fluid-icon"]',
      'link[rel="manifest"]',
      'meta[name*="msapplication"]'
    ].join(',')

    const removeAndBlock = node => {
      if (node.class !== CUSTOM_FAVICON_CLASS) {
        node.remove()
        // Mark as removed to prevent re-insertion
        node.dataset.removed = 'true'
      }
    }

    document.querySelectorAll(selectors).forEach(removeAndBlock)
  }

  function replaceFavicon (imgUrl, strategy = {}) {
    fpLogger.debug('replaceFavicon()')

    if (isInitializing) {
      fpLogger.info('Already initializing, skipping')
      return
    }

    isInitializing = true

    try {
      // Temporarily disconnect the observer to prevent infinite loops
      const needToReconnect = currentObserver !== null
      if (needToReconnect) {
        fpLogger.debug('Temporarily disconnecting mutation observer')
        currentObserver.disconnect()
      }

      cleanupExistingIcons(strategy)

      const existingFavicons = document.querySelectorAll(CUSTOM_FAVICON_CLASS)
      if (existingFavicons) existingFavicons.forEach(node => node.remove())

      const iconLink = document.createElement('link')
      iconLink.rel = 'icon'
      iconLink.type = 'image/png'
      iconLink.classList.add(CUSTOM_FAVICON_CLASS)
      iconLink.href = imgUrl

      customFaviconHref = imgUrl

      if (strategy.addShortcutLink !== false) {
        const shortcutLink = iconLink.cloneNode(true)
        shortcutLink.rel = 'shortcut icon'
        document.head.appendChild(shortcutLink)
      }

      document.head.appendChild(iconLink)

      if (strategy.addCssHiding !== false) {
        const styleId = 'favicon-packs-style'

        if (!document.getElementById(styleId)) {
          const style = document.createElement('style')
          style.id = styleId
          style.textContent = `
            link[rel*="icon"]:not(.${CUSTOM_FAVICON_CLASS}),
            link[rel*="shortcut"]:not(.${CUSTOM_FAVICON_CLASS}),
            link[rel*="apple-touch"]:not(.${CUSTOM_FAVICON_CLASS}),
            link[rel*="mask-icon"]:not(.${CUSTOM_FAVICON_CLASS}) {
              display: none !important;
            }
          `
          document.head.appendChild(style)
        }
      }

      // Reconnect the observer after changes are complete
      if (needToReconnect && observerConfig) {
        fpLogger.debug('Reconnecting mutation observer')
        currentObserver.observe(document.documentElement, observerConfig)
      }

      fpLogger.info('Replaced favicon')
      return iconLink
    } finally {
      isInitializing = false
    }
  }

  function setupPersistenceChecking (imgUrl, strategy = {}, retryCount = 0) {
    fpLogger.debug('setupPersistenceChecking()')

    if (currentCheckInterval) {
      clearInterval(currentCheckInterval)
      currentCheckInterval = null
    }

    const persistenceSettings = strategy.persistence || {}
    let checkIntervalTime = persistenceSettings.checkIntervalTime

    // If no checkIntervalTime is provided, no persistence
    if (!checkIntervalTime) {
      fpLogger.debug('Persistence disabled (no checkIntervalTime provided)')
      return
    }

    // Apply randomization if configured
    if (persistenceSettings.randomizationFactor && checkIntervalTime > 0) {
      const randomFactor = persistenceSettings.randomizationFactor
      const randomVariation = Math.floor(
        checkIntervalTime * randomFactor * (Math.random() * 2 - 1)
      )
      checkIntervalTime = Math.max(50, checkIntervalTime + randomVariation)
    }

    // If interval time is 0 or negative, disable persistence
    if (checkIntervalTime <= 0) {
      fpLogger.debug('Persistence disabled (checkIntervalTime <= 0)')
      return
    }

    currentCheckInterval = setInterval(() => {
      const customFavicon = document.querySelectorAll(
        `.${CUSTOM_FAVICON_CLASS}`
      )
      const expectedFaviconCount = strategy.addShortcutLink !== false ? 2 : 1
      const existingFavicons = document.querySelectorAll('link[rel*="icon"]')
      const style = document.getElementById('favicon-packs-style')

      const styleNeeded = strategy.addCssHiding !== false
      const styleValid = !styleNeeded || style

      const needsReplacement =
        customFavicon.length !== expectedFaviconCount ||
        !styleValid ||
        (customFavicon.length > 0 &&
          customFavicon[0].href !== customFaviconHref) ||
        (customFavicon.length > 1 &&
          customFavicon[1].href !== customFaviconHref) ||
        (strategy.removeExistingIcons !== false &&
          existingFavicons.length > expectedFaviconCount) ||
        (customFavicon.length > 0 && !document.head.contains(customFavicon[0]))

      if (needsReplacement) {
        clearInterval(currentCheckInterval)
        currentCheckInterval = null

        // Get retry limit from persistence settings
        const retryLimit = persistenceSettings.retryLimit

        // If no retry limit is set, don't retry
        if (retryLimit === undefined) {
          fpLogger.debug('Persistence retry disabled (no retryLimit provided)')
          return
        }

        if (retryCount < retryLimit) {
          fpLogger.info(`Persistence retry attempt ${retryCount + 1}`)

          // Add small random delay before retry
          setTimeout(() => {
            setupPersistenceChecking(imgUrl, strategy, retryCount + 1)
          }, Math.random() * 100)
        } else {
          fpLogger.info(
            `Persistence retry limit (${retryLimit}) reached, giving up`
          )
        }
      }
    }, checkIntervalTime)
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

        // Clear any existing check interval
        if (currentCheckInterval) {
          clearInterval(currentCheckInterval)
          currentCheckInterval = null
        }
        return
      }

      currentStrategy = request.replaceStrategy || currentStrategy
      fpLogger.trace('currentStrategy', currentStrategy)

      // Strategy 1: Basic favicon replacement (always happens)
      fpLogger.debug('Applying basic favicon replacement')
      replaceFavicon(request.imgUrl, currentStrategy)

      // Strategy 2: Persistence checking
      if (currentStrategy.persistence?.enabled === true) {
        fpLogger.debug('Setting up persistence checking')
        setupPersistenceChecking(request.imgUrl, currentStrategy, 0)
      }

      // Strategy 3: Mutation observer
      if (currentObserver) {
        currentObserver.disconnect()
        currentObserver = null
      }

      if (
        hasInitialized &&
        currentStrategy.observeMutations?.enabled === true
      ) {
        fpLogger.debug('Setting up mutation observer')
        currentObserver = setupFaviconObserver(currentStrategy)
      }

      // Strategy 4: URL change detection
      setupUrlChangeDetection(currentStrategy)
    }
  })

  function initialize (forceReset = false) {
    fpLogger.debug('initialize()')

    if (hasInitialized && !forceReset) {
      fpLogger.debug('Already initialized, skipping')
      return
    }

    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'
    fpLogger.debug('colorScheme', colorScheme)

    hasInitialized = true

    sendMessageWithRetry({
      action: 'replaceFavicon',
      colorScheme,
      url: window.location.href
    })
  }

  function setupFaviconObserver (strategy = {}) {
    fpLogger.debug('setupFaviconObserver()')

    if (!strategy.observeMutations?.enabled) {
      fpLogger.debug('Mutation observation disabled by strategy')
      return null
    }

    const attributeFilter = strategy.observeMutations?.attributeFilter

    observerConfig = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter,
      characterData: true
    }

    const observer = new window.MutationObserver(mutations => {
      for (const mutation of mutations) {
        fpLogger.trace('mutation', mutation)

        if (!customFaviconHref) {
          fpLogger.error(
            'Mutation detected but no favicon URL is available - this is unexpected'
          )
          continue
        }

        fpLogger.info('Resetting favicon due to mutation')
        replaceFavicon(customFaviconHref, currentStrategy)
      }
    })

    // Determine which element to observe
    let targetElement = document.documentElement

    const targetSelector = strategy.observeMutations?.targetSelector
    fpLogger.debug('targetSelector', targetSelector)

    if (targetSelector) {
      try {
        // Try to find the element with the selector
        const foundElement = document.querySelector(targetSelector)

        if (foundElement) {
          fpLogger.debug(
            `Observing element matching selector: ${targetSelector}`
          )
          targetElement = foundElement
        } else {
          fpLogger.error(
            'No element found matching selector, falling back to document'
          )
        }
      } catch (error) {
        fpLogger.error(
          'No element found matching selector, falling back to document',
          error
        )
      }
    } else {
      fpLogger.debug('No target selector provided, observing entire document')
    }

    observer.observe(targetElement, observerConfig)
    return observer
  }

  function setupUrlChangeDetection (strategy = {}) {
    if (!strategy.urlChangeDetection?.enabled) {
      fpLogger.debug('URL change detection disabled by strategy')
      return
    }

    fpLogger.debug('Setting up URL change detection for SPAs')

    window.addEventListener('popstate', () => {
      fpLogger.debug('Pop state detected, checking for URL change')
      checkForUrlChange()
    })

    window.addEventListener('hashchange', () => {
      fpLogger.debug('Hash change detected, checking for URL change')
      checkForUrlChange()
    })

    const checkIntervalTime = strategy.urlChangeDetection?.checkIntervalTime

    if (checkIntervalTime && checkIntervalTime > 0) {
      if (urlCheckInterval) clearInterval(urlCheckInterval)

      urlCheckInterval = setInterval(checkForUrlChange, checkIntervalTime)
    }
  }

  function checkForUrlChange () {
    const currentUrl = window.location.href

    if (currentUrl !== lastUrl) {
      fpLogger.info(`URL changed from ${lastUrl} to ${currentUrl}`)
      lastUrl = currentUrl

      hasInitialized = false
      initialize(true)
    }
  }

  // Avoid running on demo site
  if (window.location.href.includes('faviconpacks.com')) {
    fpLogger.info('Running on demo site, halting execution')
    return
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fpLogger.debug('DOMContentLoaded')

      initialize()
    })
  } else {
    fpLogger.debug('Already loaded')

    initialize()
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
