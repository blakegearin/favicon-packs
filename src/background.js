console.log("Favicon Packs: background.js loaded");

function getSiteConfigsOrder() {
  return JSON.parse(localStorage.getItem('siteConfigsOrder')) || [];
}

async function initialize() {
  console.log('initialize');
  await window.extensionStore.initialize();

  browser.browserAction.onClicked.addListener(() => {
    browser.tabs.create({ url: browser.runtime.getURL("src/options/index.html") });
  });

  const iconPacks = window.extensionStore.getIconPacks();
  for await (const iconPack of iconPacks) {
    if (iconPack.name !== "Ionicons") continue;

    // Download only the latest version of the icon pack
    const versionMetadata = iconPack.versions[0];
    await window.extensionStore.downloadIconPackVersion(iconPack, versionMetadata);
  };

  browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    // console.log(`request`);
    // console.dir(request, { depth: null });
    // console.log(`sender`);
    // console.dir(sender, { depth: null });

    if (request.action === "replaceFavicon") {


      const activeSiteConfigs = await this.getActiveSiteConfigs();
      const validSiteConfigs = activeSiteConfigs.filter(siteConfig =>
        siteConfig.websitePattern && (siteConfig.iconId || siteConfig.uploadId)
      );

      const siteConfigsOrder = getSiteConfigsOrder();
      const sortedSiteConfigs = siteConfigsOrder
        .map(id => validSiteConfigs.find(siteConfig => siteConfig.id === id))
        .filter(Boolean);

      // console.log(`sortedSiteConfigs`);
      // console.dir(sortedSiteConfigs, { depth: null });

      const siteConfig = sortedSiteConfigs.find((localSiteConfig) => {
        let websitePattern = localSiteConfig.websitePattern;

        // console.log(`websitePattern`);
        // console.dir(websitePattern, { depth: null });

        if (localSiteConfig.patternType === 'Simple Match') {
          const escapedDomain = websitePattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          websitePattern = `.*${escapedDomain}.*`;
        }

        // console.log(`websitePattern`);
        // console.dir(websitePattern, { depth: null });

        try {
          const regexp = new RegExp(websitePattern, 'i');
          // console.log(`regexp`);
          // console.dir(regexp, { depth: null });

          const matches = regexp.test(sender.url);
          // console.log(`matches`);
          // console.dir(matches, { depth: null });

          return matches;
        } catch (error) {
          console.error("Error creating RegExp:", error);
        }
      });

      // console.log(`siteConfig`);
      // console.dir(siteConfig, { depth: null });

      if (!siteConfig) {
        browser.tabs.sendMessage(sender.tab.id, {
          action: "setFavicon",
          imgUrl: null,
        });

        return;
      }

      let imgUrl = null;

      if (siteConfig.uploadId) {
        const upload = await window.extensionStore.getUploadById(siteConfig.uploadId);
        // console.log(`upload`);
        // console.dir(upload, { depth: null });

        imgUrl = upload.dataUri;
      } else {
        // console.log(`request.colorScheme`);
        // console.dir(request.colorScheme);

        const settingsMetadata = window.extensionStore.getSettingsMetadata();
        // console.log(`settingsMetadata`);
        // console.dir(settingsMetadata, { depth: null });

        const darkThemeEnabled = settingsMetadata.darkThemeEnabled.getValue();
        // console.log(`darkThemeEnabled`);
        // console.dir(darkThemeEnabled, { depth: null });

        const lightThemeEnabled = settingsMetadata.lightThemeEnabled.getValue();
        // console.log(`lightThemeEnabled`);
        // console.dir(lightThemeEnabled, { depth: null });

        switch (request.colorScheme) {
          case null:
            break;
          case "dark":
            if (darkThemeEnabled) imgUrl = siteConfig.darkPngUrl;
            break;
          default:
            if (lightThemeEnabled) imgUrl = siteConfig.lightPngUrl;
            break;
        }

        console.log(`imgUrl`);
        console.dir(imgUrl, { depth: null });

        console.log(`!imgUrl && !darkThemeEnabled && !lightThemeEnabled`);
        console.dir(!imgUrl && !darkThemeEnabled && !lightThemeEnabled, { depth: null });

        if (!imgUrl && !darkThemeEnabled && !lightThemeEnabled) {
          imgUrl = siteConfig.anyPngUrl;
        }
      }

      // console.log(`imgUrl`);
      // console.dir(imgUrl, { depth: null });

      browser.tabs.sendMessage(sender.tab.id, {
        action: "setFavicon",
        imgUrl,
      });
    }
  });
}

void initialize();
