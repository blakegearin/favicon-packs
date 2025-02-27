console.log("Favicon Packs: background.js loaded");

const iconPacks = [
  {
    name: "Ionicons",
    version: "7.4.0",
    svgUrl: "https://unpkg.com/ionicons@7.4.0/dist/cheatsheet.html",
    metadataUrl: "https://unpkg.com/ionicons@7.4.0/dist/ionicons.json",
    styles: [
      {
        name: "Outline",
        value: "-outline",
        paint: "color",
        filter: /-outline/,
      },
      {
        name: "Filled",
        value: "",
        paint: "fill",
        filter: /^(?!.*-outline)(?!.*-sharp).*$/, // Not containing -outline or -sharp
      },
      {
        name: "Sharp",
        value: "-sharp",
        paint: "fill",
        filter: /-sharp/,
      },
    ],
  },
];

const userSettings = [
  {
    url: "https://www.mozilla.org",
    icon: {
      packName: "Ionicons",
      styleName: "Outline",
      name: "thunderstorm",
      color: "white",
    },
  },
  {
    url: "https://www.wikipedia.org",
    icon: {
      packName: "Ionicons",
      styleName: "Outline",
      name: "aperture",
      color: "blue",
    },
  },
  {
    url: "https://duckduckgo.com",
    icon: {
      packName: "Ionicons",
      styleName: "Filled",
      name: "people-circle",
      color: "purple",
    },
  },
];

async function fetchIconsMetadata(iconPackName) {
  const iconPack = iconPacks.find((iconPack) => iconPack.name === iconPackName);
  const metadataUrl = iconPack.metadataUrl;

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

  browser.browserAction.onClicked.addListener(function() {
    browser.tabs.create({ url: browser.runtime.getURL("src/options/index.html") });
  });

  for await (const iconPack of iconPacks) {
    const iconsMetadata = await fetchIconsMetadata(iconPack.name);
    const response = await fetch(iconPack.svgUrl);

    // console.log(`response`);
    // console.dir(response, { depth: null });

    if (!response.ok) throw new Error("Network response was not ok");

    const htmlString = await response.text();

    // console.log(`htmlString`);
    // console.dir(htmlString, { depth: null });

    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(htmlString, "text/html");
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
      const iconId = `${iconPack.name}-${iconPack.version}-${iconName}`;

      const iconTags = iconsMetadata.find(
        (iconMetadata) => iconMetadata.name === iconName,
      ).tags;
      svgElement.setAttribute("tags", iconTags.join(" "));

      const iconStyle = iconPack.styles.find((style) => {
        return style.filter.test(iconName);
      }).name;

      const icon = {
        id: iconId,
        name: iconName,
        style: iconStyle,
        tags: iconTags,
        symbol: symbol.outerHTML,
      };

      await window.extensionStore.addIcon(icon);
    };
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

        // console.log(`localSiteConfig.siteMatch`);
        // console.dir(localSiteConfig.siteMatch);

        // console.log(`!localSiteConfig.iconId && !localSiteConfig.uploadId`);
        // console.dir(!localSiteConfig.iconId && !localSiteConfig.uploadId, { depth: null });

        if (!localSiteConfig.iconId && !localSiteConfig.uploadId) return false;
        if (!localSiteConfig.siteMatch) return false;

        let siteMatch = localSiteConfig.siteMatch;

        // console.log(`siteMatch`);
        // console.dir(siteMatch, { depth: null });

        if (localSiteConfig.matchType === 'Domain') {
          const escapedDomain = siteMatch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          // siteMatch = `^https?:\/\/([a-zA-Z0-9-]+\.)*${escapedDomain}(\/.*)?$`;
          siteMatch = `.*${escapedDomain}.*`;
        }

        // console.log(`siteMatch`);
        // console.dir(siteMatch, { depth: null });

        try {
          const regexp = new RegExp(siteMatch, 'i');

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
