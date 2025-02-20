console.log("Background running");

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

// const icons = [
//   {
//     iconPackName: "Ionicons",
//     name: "airplane",
//     tags:[ "airplane", "plane" ],
//     svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><style xmlns=\"http://www.w3.org/1999/xhtml\">.ionicon { fill: currentColor; stroke: currentColor; } .ionicon-fill-none { fill: none; } .ionicon-stroke-width { stroke-width: 32px; }</style><use href=\"#airplane\" xlink:href=\"#airplane\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"/><symbol id=\"airplane\" class=\"ionicon\" viewBox=\"0 0 512 512\"><path d=\"M186.62 464H160a16 16 0 01-14.57-22.6l64.46-142.25L113.1 297l-35.3 42.77C71.07 348.23 65.7 352 52 352H34.08a17.66 17.66 0 01-14.7-7.06c-2.38-3.21-4.72-8.65-2.44-16.41l19.82-71c.15-.53.33-1.06.53-1.58a.38.38 0 000-.15 14.82 14.82 0 01-.53-1.59l-19.84-71.45c-2.15-7.61.2-12.93 2.56-16.06a16.83 16.83 0 0113.6-6.7H52c10.23 0 20.16 4.59 26 12l34.57 42.05 97.32-1.44-64.44-142A16 16 0 01160 48h26.91a25 25 0 0119.35 9.8l125.05 152 57.77-1.52c4.23-.23 15.95-.31 18.66-.31C463 208 496 225.94 496 256c0 9.46-3.78 27-29.07 38.16-14.93 6.6-34.85 9.94-59.21 9.94-2.68 0-14.37-.08-18.66-.31l-57.76-1.54-125.36 152a25 25 0 01-19.32 9.75z\"/></symbol></svg>",
//   }
// ];

browser.browserAction.onClicked.addListener(function() {
  browser.tabs.create({ url: browser.runtime.getURL("src/options/index.html") });
});

function cacheIcon(name, svg) {
  browser.storage.local
    .set({ [name]: svg })
    .then(() => {
      // console.log("Icon cached:", name);
    })
    .catch((error) => {
      console.error("Error caching icon:", error);
    });
}

function getCachedIcon(name) {
  return browser.storage.local
    .get(name)
    .then((result) => {
      return result[name] || null;
    })
    .catch((error) => {
      console.error("Error retrieving cached icon:", error);
    });
}

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

iconPacks.forEach(async (iconPack) => {
  const iconsMetadata = await fetchIconsMetadata(iconPack.name);

  // iconsMetadata.forEach(async (iconMetadata) => {
  //   cacheIcon(iconMetadata.name, {
  //     svg: svgString,
  //     tags: iconMetadata.tags,
  //   });
  // });

  fetch(iconPack.svgUrl)
    .then((response) => {
      // console.log(`response`);
      // console.dir(response, { depth: null });

      if (!response.ok) throw new Error("Network response was not ok");
      return response.text();
    })
    .then((htmlString) => {
      // console.log(`htmlString`);
      // console.dir(htmlString, { depth: null });

      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(htmlString, "text/html");
      const htmlElement = htmlDoc.documentElement;

      // console.log(`htmlElement`);
      // console.dir(htmlElement, { depth: null });

      htmlElement.querySelectorAll("a > svg").forEach((svgElement) => {
        // console.log(`svgElement`);
        // console.dir(svgElement, { depth: null });

        // const svgString = symbol
        //   .replace( "<symbol", `<svg xmlns="http://www.w3.org/2000/svg"`)
        //   .replace("</symbol>", "</svg>");

        // element.innerHTML = symbol.innerHTML
        //   .replace(/<symbol/g, `<svg xmlns="http://www.w3.org/2000/svg"`)
        //   .replace(/<\/symbol>/g, `</svg>`);

        // const newSvgElement = document.createElement("svg");
        // svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
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

        if (brokenIcons.includes(symbolId.replace('#', ''))) return;

        // console.log(`symbolId`);
        // console.dir(symbolId, { depth: null });

        const symbol = htmlElement.querySelector(symbolId);

        // console.log(`symbol`);
        // console.dir(symbol, { depth: null });

        // const styleElement = document.createElement("style");
        // styleElement.textContent = `.ionicon { fill: currentColor; stroke: currentColor; } .ionicon-fill-none { fill: none; } .ionicon-stroke-width { stroke-width: 32px; }`;
        // svgElement.insertBefore(styleElement, svgElement.firstChild);

        // // Serialize the SVG to a string
        // const serializer = new XMLSerializer();
        // // const svg = link.querySelector("svg");
        // const svgString = serializer.serializeToString(svg);




        const iconName = symbol.id;
        const iconId = `${iconPack.name}-${iconPack.version}-${iconName}`;
        // svgElement.setAttribute("icon-id", iconId);

        const iconTags = iconsMetadata.find(
          (iconMetadata) => iconMetadata.name === iconName,
        ).tags;
        svgElement.setAttribute("tags", iconTags.join(" "));

        const iconStyle = iconPack.styles.find((style) => {
          return style.filter.test(iconName);
        }).name;




        // const iconName = symbol.id;
        // const iconId = `${iconPack.name}-${iconPack.version}-${iconName}`;
        // symbol.setAttribute("icon-id", iconId);

        // const iconTags = iconsMetadata.find(
        //   (iconMetadata) => iconMetadata.name === iconName,
        // ).tags;
        // symbol.setAttribute("tags", iconTags.join(" "));

        // const iconStyle = iconPack.styles.find((style) => {
        //   return style.filter.test(iconName);
        // }).name;


        // svgElement.setAttribute("icon-name", iconName);
        // svgElement.setAttribute("icon-pack-name", iconPack.name);
        // svgElement.setAttribute("icon-pack-version", iconPack.version);


        // symbol.removeAttribute("class");
        // symbol.removeAttribute("id");

        // const styleElement = document.createElement('style');
        // styleElement.textContent = `
        //   .ionicon { fill: currentColor; stroke: currentColor; }
        //   .ionicon-fill-none { fill: none; }
        //   .ionicon-stroke-width { stroke-width: 32px; }
        // `;
        // symbol.insertBefore(styleElement, symbol.firstChild);

        svgElement.appendChild(symbol);

        const serializer = new XMLSerializer();
        // const svg = link.querySelector("svg");
        // const symbolString = serializer.serializeToString(symbol);
        const svgString = serializer.serializeToString(svgElement);
        // const svgString = symbolString
        //   .replace("<symbol", `<svg`)
        //   .replace("</symbol>", "</svg>");

        // console.log(`svgString`);
        // console.dir(svgString, { depth: null });

        // console.log(`iconName`);
        // console.dir(iconName, { depth: null });

        // // Encode the SVG string to create a Data URI
        // const encodedSvg = encodeURIComponent(svgString);
        // const dataUri = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

        // // Store the Data URI for use
        // svgDataUrls.push(dataUri);
        // console.log(`SVG ${index + 1} Data URI:`, dataUri);

        cacheIcon(
          iconId,
          {
            name: iconName,
            style: iconStyle,
            tags: iconTags,
            svg: svgString,
            symbol: symbol.outerHTML,
          },
        );
      });
    });
});

// function buildFaviconUrl({ baseUrl, iconName, iconStyleName } = {}) {
//   return `${baseUrl}${iconName}${iconStyleName}.svg`;
// }

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // console.log(`request.action`);
  // console.dir(request.action, { depth: null });

  // console.log(`sender`);
  // console.dir(sender, { depth: null });

  if (request.action === "replaceFavicon") {
    const userSetting = userSettings.find((setting) => {
      return setting.url === sender.origin;
    });
    const iconPack = iconPacks.find((pack) => {
      return pack.name === userSetting.icon.packName;
    });
    const iconStyle = iconPack.styles.find((style) => {
      return style.name === userSetting.icon.styleName;
    });

    // // const svgUrl = `${iconPack.svgUrl}${userSetting.icon.name}${iconStyle.value}.svg`;
    // const svgUrl = buildFaviconUrl({
    //   baseUrl: iconPack.svgUrl,
    //   iconName: userSetting.icon.name,
    //   iconStyleName: iconStyle.value,
    // });

    // console.log(`svgUrl`);
    // console.dir(svgUrl);

    // fetch(svgUrl)
    //   .then((response) => {
    //     // console.log(`response`);
    //     // console.dir(response, { depth: null });

    //     if (!response.ok) throw new Error("Network response was not ok");
    //     return response.text();
    //   })
    //   .then((svgString) => {
    //     // console.log(`svgString`);
    //     // console.dir(svgString, { depth: null });

    //     // const blob = new Blob([svgString], { type: 'image/svg+xml' });
    //     // const blobUrl = URL.createObjectURL(blob);

    //     // console.log(`blobUrl`);
    //     // console.dir(blobUrl, { depth: null });

    //     // chrome.tabs.executeScript(sender.tab.id, {
    //     //   code: `
    //     //     const link = document.createElement('link');
    //     //     link.id = 'favicon-packs-favicon';
    //     //     link.rel = 'icon';
    //     //     link.type = 'image/svg+xml';
    //     //     link.href = '${blobUrl}';
    //     //     document.head.appendChild(link);
    //     //   `
    //     // }, (result) => {
    //     //   // console.log(`result`);
    //     //   // console.dir(result, { depth: null });

    //     //   if (chrome.runtime.lastError) {
    //     //     console.error('Error executing script:', chrome.runtime.lastError);
    //     //   } else {
    //     //     console.log('Favicon script executed successfully');
    //     //   }
    //     // });

    //     // console.log('After executeScript');

    //     // chrome.tabs.sendMessage(sender.tab.id, { action: "setFavicon", svg: svgString });

    //     const parser = new DOMParser();
    //     const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
    //     const svgElement = svgDoc.documentElement;

    //     // svgElement.setAttribute("fill", userSetting.icon.color);

    //     switch (iconStyle.paint) {
    //       case "fill":
    //         svgElement.setAttribute("fill", userSetting.icon.color);
    //         break;
    //       case "color":
    //         svgElement.style.setProperty("color", userSetting.icon.color);
    //     }

    //     const serializer = new XMLSerializer();
    //     const updatedSvgString = serializer.serializeToString(svgElement);

    //     console.log(`updatedSvgString`);
    //     console.dir(updatedSvgString, { depth: null });

    //     const encodedSvg = encodeURIComponent(updatedSvgString);

    //     chrome.tabs.sendMessage(sender.tab.id, {
    //       action: "setFavicon",
    //       svg: encodedSvg,
    //     });

    //     // const encodedSvg = encodeURIComponent(request.svg);
    //     // const dataUri = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

    //     // const link = document.createElement('link');
    //     // link.rel = 'icon';
    //     // link.type = 'image/svg+xml';
    //     // link.href = dataUri;
    //     // link.id = 'favicon-packs-favicon';

    //     // chrome.tabs.sendMessage(sender.tab.id, { action: "setFavicon", link });

    //     console.log("After sendMessage");
    //   })
    //   .catch((error) => {
    //     console.error("Error fetching SVG:", error);
    //   });

    // const svgString = getCachedIcon();

    getCachedIcon(`${userSetting.icon.packName}-${userSetting.icon.name}${iconStyle.value}`).then(
      (iconObject) => {
        // console.log(`getCachedIcon svgString`);
        // console.dir(svgString, { depth: null });

        if (iconObject) {
          const svgString = iconObject.svg;

          // console.log(`svgString`);
          // console.dir(svgString, { depth: null });

          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
          const svgElement = svgDoc.documentElement;

          // const styleElement = document.createElement('style');
          // styleElement.textContent = `
          //   .ionicon { fill: currentColor; stroke: currentColor; }
          //   .ionicon-fill-none { fill: none; }
          //   .ionicon-stroke-width { stroke-width: 32px; }
          // `;
          // svgElement.insertBefore(styleElement, svgElement.firstChild);

          // console.log(`before svgElement`);
          // console.dir(svgElement, { depth: null });

          // switch (iconStyle.paint) {
          //   case "fill":
          //     svgElement.setAttribute("fill", userSetting.icon.color);
          //     break;
          //   case "color":
          //     svgElement.style.setProperty("color", userSetting.icon.color);
          // }

          svgElement.style.setProperty("color", userSetting.icon.color);

          // console.log(`after svgElement`);
          // console.dir(svgElement, { depth: null });

          const serializer = new XMLSerializer();
          const updatedSvgString = serializer.serializeToString(svgElement);

          // console.log(`updatedSvgString`);
          // console.dir(updatedSvgString, { depth: null });

          const encodedSvg = encodeURIComponent(updatedSvgString);

          chrome.tabs.sendMessage(sender.tab.id, {
            action: "setFavicon",
            svg: encodedSvg,
          });
        } else {
          console.log("Icon not found in cache.");
        }
      }
    );
  }
});

// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (changeInfo.status === 'complete' && tab.url) {
//     const svgUrl = "https://unpkg.com/ionicons@7.4.0/dist/svg/accessibility-sharp.svg";

//     fetch(svgUrl)
//       .then(response => {
//         if (!response.ok) {
//           throw new Error('Network response was not ok');
//         }
//         return response.text();
//       })
//       .then(svgString => {
//         const blob = new Blob([svgString], { type: 'image/svg+xml' });
//         const blobUrl = URL.createObjectURL(blob);

//         // Now we can use tabId here because it's in the same scope
//         chrome.tabs.executeScript(tabId, {
//           code: `
//             const link = document.createElement('link');
//             link.rel = 'icon';
//             link.type = 'image/svg+xml';
//             link.href = '${blobUrl}';
//             link.id = 'favicon-packs-favicon'; // Add the ID here
//             document.head.appendChild(link);
//           `
//         }, (result) => {
//           console.log(``);
//           console.dir(, { depth: null });

//           if (chrome.runtime.lastError) {
//             console.error('Error executing script:', chrome.runtime.lastError);
//           } else {
//             console.log('Favicon script executed successfully');
//           }
//         });
//       })
//       .catch(error => {
//         console.error('Error fetching SVG:', error);
//       });
//   }
// });
