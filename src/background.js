fpLogger.quiet('background.js loaded')

async function initialize () {
  fpLogger.debug('initialize()')

  await window.extensionStore.initialize()

  browser.browserAction.onClicked.addListener(() => {
    browser.tabs.create({
      url: browser.runtime.getURL('options/index.html')
    })
  })

  const iconPacks = window.extensionStore.getIconPacks()
  for await (const iconPack of iconPacks) {
    if (iconPack.name !== 'Ionicons') continue

    // Download only the latest version of the icon pack
    const versionMetadata = iconPack.versions[0]
    await window.extensionStore.downloadIconPackVersion(
      iconPack,
      versionMetadata
    )
  }

  browser.runtime.onMessage.addListener(
    async (request, sender, sendResponse) => {
      fpLogger.trace('request', request)
      fpLogger.trace('sender', sender)
      fpLogger.trace('sendResponse', sendResponse)

      if (request.action === 'replaceFavicon') {
        fpLogger.debug('replaceFavicon')

        const siteConfigs = await window.extensionStore.getActiveSiteConfigs()
        fpLogger.debug('siteConfigs', siteConfigs)

        const siteConfigsOrder =
          await window.extensionStore.getPreference('siteConfigsOrder')
        fpLogger.debug('siteConfigsOrder', siteConfigsOrder)

        const sortedSiteConfigs = siteConfigsOrder
          .map(id => siteConfigs.find(siteConfig => siteConfig.id === id))
          .filter(Boolean)

        fpLogger.debug('sortedSiteConfigs', sortedSiteConfigs)

        const siteConfig = sortedSiteConfigs.find(localSiteConfig => {
          if (!localSiteConfig.websitePattern) return false
          if (!localSiteConfig.iconId && !localSiteConfig.uploadId) return false

          let websitePattern = localSiteConfig.websitePattern
          fpLogger.debug('websitePattern', websitePattern)

          if (localSiteConfig.patternType === 0) {
            const escapedDomain = websitePattern.replace(
              /[-/\\^$*+?.()|[\]{}]/g,
              '\\$&'
            )
            websitePattern = `.*${escapedDomain}.*`
            fpLogger.debug('websitePattern', websitePattern)
          }

          try {
            const regexp = new RegExp(websitePattern, 'i')
            fpLogger.debug('regexp', websitePattern)

            const matches = regexp.test(sender.url)
            fpLogger.debug('matches', matches)

            return matches
          } catch (error) {
            fpLogger.error('Error creating RegExp', error)
            return false
          }
        })

        fpLogger.debug('siteConfig', siteConfig)

        if (!siteConfig) {
          browser.tabs.sendMessage(sender.tab.id, {
            action: 'setFavicon',
            imgUrl: null
          })

          return
        }

        let imgUrl = null

        if (siteConfig.uploadId) {
          const upload = await window.extensionStore.getUploadById(
            siteConfig.uploadId
          )
          fpLogger.debug('upload', upload)

          imgUrl = upload.dataUri
        } else {
          const darkThemeEnabled = await window.extensionStore.getPreference('darkThemeEnabled')
          fpLogger.debug('darkThemeEnabled', darkThemeEnabled)

          const lightThemeEnabled = await window.extensionStore.getPreference('lightThemeEnabled')
          fpLogger.debug('lightThemeEnabled', lightThemeEnabled)

          fpLogger.debug('request.colorScheme', request.colorScheme)
          switch (request.colorScheme) {
            case null:
              break
            case 'dark':
              if (darkThemeEnabled) imgUrl = siteConfig.darkPngUrl
              break
            default:
              if (lightThemeEnabled) imgUrl = siteConfig.lightPngUrl
              break
          }

          if (!imgUrl && !darkThemeEnabled && !lightThemeEnabled) {
            fpLogger.debug('!imgUrl && !darkThemeEnabled && !lightThemeEnabled')
            imgUrl = siteConfig.anyPngUrl
          }
        }

        fpLogger.debug('imgUrl', imgUrl)
        browser.tabs.sendMessage(sender.tab.id, {
          action: 'setFavicon',
          imgUrl
        })
      }
    }
  )
}

initialize()
