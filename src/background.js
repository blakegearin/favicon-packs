console.log("Favicon Packs: background.js loaded");

Object.defineProperty(String.prototype, 'capitalize', {
  value: function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  },
  enumerable: false
});

async function fetchIconsMetadata(metadataUrl) {
  let metadata;

  try {
    const response = await fetch(metadataUrl);

    // console.log(`response`);
    // console.dir(response, { depth: null });

    if (!response.ok) throw new Error("Network response was not ok");

    metadata = await response.text();
  } catch (error) {
    console.error("Fetch error: ", error);
  }

  // console.log(`metadata`);
  // console.dir(metadata, { depth: null });

  const iconsMetadata = JSON.parse(metadata).icons;

  // console.log(`iconsMetadata`);
  // console.dir(iconsMetadata, { depth: null });

  return iconsMetadata || null;
}

function getSiteConfigsOrder() {
  return JSON.parse(localStorage.getItem('siteConfigsOrder')) || [];
}

async function initialize() {
  await window.extensionStore.initialize();

  browser.browserAction.onClicked.addListener(() => {
    browser.tabs.create({ url: browser.runtime.getURL("src/options/index.html") });
  });

  const iconPacks = window.extensionStore.getIconPacks();
  for await (const iconPack of iconPacks) {
    const iconsMetadata = iconPack.metadataUrl ? await fetchIconsMetadata(iconPack.metadataUrl) : null;

    const response = await fetch(iconPack.svgUrl);

    // console.log(`response`);
    // console.dir(response, { depth: null });

    if (!response.ok) throw new Error("Network response was not ok");

    const responseString = await response.text();
    // console.log(`responseString`);
    // console.dir(responseString, { depth: null });

    const fileType = response.headers.get("content-type").split(";")[0];

    // console.log(`fileType`);
    // console.dir(fileType, { depth: null });

    const parser = new DOMParser();

    const buildIconId = (iconPack, iconName) => `${iconPack.name}-${iconPack.version}-${iconName}`;

    if (fileType === "text/html") {
      const htmlDoc = parser.parseFromString(responseString, fileType);
      const htmlElement = htmlDoc.documentElement;

      // console.log(`htmlElement`);
      // console.dir(htmlElement, { depth: null });

      const svgElements = htmlElement.querySelectorAll("a > svg");

      for await (const svgElement of svgElements) {
        svgElement.setAttribute("viewBox", "0 0 512 512");

        const symbolId = svgElement.children[0].getAttribute('href');

        // Fix PR: https://github.com/ionic-team/ionicons/pull/1433
        const brokenIcons = [
          "chevron-expand",
          "chevron-expand-outline",
          "chevron-expand-sharp",
          "logo-behance",
          "logo-bitbucket",
          "logo-docker",
          "logo-edge",
          "logo-facebook",
          "logo-npm",
          "logo-paypal",
          "logo-soundcloud",
          "logo-venmo",
        ];

        if (brokenIcons.includes(symbolId.replace('#', ''))) continue;

        const symbol = htmlElement.querySelector(symbolId);
        const iconName = symbol.id;
        const iconId = buildIconId(iconPack, iconName);

        symbol.id = iconId;

        const iconTags = iconsMetadata.find(
          (iconMetadata) => iconMetadata.name === iconName,
        ).tags;
        svgElement.setAttribute("tags", iconTags.join(" "));

        const iconStyle = iconPack.styles.find((style) => {
          return style.filter.test(iconName);
        }).name;

        const icon = {
          id: iconId,
          iconPackName: iconPack.name,
          name: iconName,
          style: iconStyle,
          tags: iconTags,
          symbol: symbol.outerHTML,
        };

        await window.extensionStore.addIcon(icon);
      };
    } else if (fileType === "application/json") {
      const iconsObject = JSON.parse(responseString);

      // console.log(`iconsObject`);
      // console.dir(iconsObject, { depth: null });

      for (const [originalIconName, iconMetadata] of Object.entries(iconsObject)) {
        // console.log(`iconMetadata`);
        // console.dir(iconMetadata, { depth: null });

        const iconTags = iconMetadata?.search?.terms || [];
        iconTags.push(originalIconName);

        const iconStyles = iconMetadata?.svgs?.classic;

        // console.log(`iconStyles`);
        // console.dir(iconStyles, { depth: null });

        for (const [iconStyle, iconStyleMetadata] of Object.entries(iconStyles)) {
          const iconName = `${originalIconName}-${iconStyle}`;
          const iconId = buildIconId(iconPack, iconName);

          // Convert svg to symbol; crude but simple & effective
          let symbolString = iconStyleMetadata.raw
            .replace('<svg', `<symbol id="${iconId}" class="font-awesome"`)
            .replace('svg>', 'symbol>');

          const icon = {
            id: iconId,
            iconPackName: iconPack.name,
            name: iconName,
            style: iconStyle.capitalize(),
            tags: iconTags,
            symbol: symbolString,
          };

          await window.extensionStore.addIcon(icon);
        }
      }
    }
  };

  browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "replaceFavicon") {
      // console.log(`sender`);
      // console.dir(sender, { depth: null });

      const siteConfigs = await window.extensionStore.getSiteConfigs();

      const siteConfigsOrder = getSiteConfigsOrder();
      const sortedSiteConfigs = siteConfigsOrder
        .map(id => siteConfigs.find(siteConfig => siteConfig.id === id))
        .filter(Boolean);

      // console.log(`sortedSiteConfigs`);
      // console.dir(sortedSiteConfigs, { depth: null });

      const siteConfig = sortedSiteConfigs.find((localSiteConfig) => {
        if (!localSiteConfig.active) return false;

        // console.log(`localSiteConfig.websitePattern`);
        // console.dir(localSiteConfig.websitePattern);

        if (!localSiteConfig.websitePattern) return false;
        if (!localSiteConfig.iconId && !localSiteConfig.uploadId) return false;

        let websitePattern = localSiteConfig.websitePattern;

        // console.log(`websitePattern`);
        // console.dir(websitePattern, { depth: null });

        if (localSiteConfig.patternType === 'Simple Match') {
          const escapedDomain = websitePattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          // websitePattern = `^https?:\/\/([a-zA-Z0-9-]+\.)*${escapedDomain}(\/.*)?$`;
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

      if (!siteConfig) {
        browser.tabs.sendMessage(sender.tab.id, {
          action: "setFavicon",
          imgUrl: null,
        });

        return;
      }

      // console.log(`siteConfig`);
      // console.dir(siteConfig, { depth: null });

      let imgUrl = null;

      if (siteConfig.uploadId) {
        const upload = await window.extensionStore.getUploadById(siteConfig.uploadId);

        // console.log(`upload`);
        // console.dir(upload, { depth: null });

        imgUrl = upload.dataUri;
      } else {
        // console.log(`request.colorScheme`);
        // console.dir(request.colorScheme);

        switch (request.colorScheme) {
          case null:
            break;
          case "dark":
            imgUrl = siteConfig.darkPngUrl;
            break;
          default:
            imgUrl = siteConfig.lightPngUrl;
            break;
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
