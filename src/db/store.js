// src/db/store.js
const DB_NAME = "faviconPacksData";
const DB_VERSION = 1;
const STORES = {
  icons: "icons",
  siteConfigs: "siteConfigs",
  uploads: "uploads",
};

// Add helper method to the String prototype
Object.defineProperty(String.prototype, 'capitalize', {
  value: function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  },
  enumerable: false
});

class ExtensionStore {
  constructor() {
    this.db = null;
  }

  generateUUID() {
    const randomValues = new Uint8Array(16);
    crypto.getRandomValues(randomValues);

    randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
    randomValues[8] = (randomValues[8] & 0x3f) | 0x80;

    const hexArray = Array.from(randomValues).map(b =>
      b.toString(16).padStart(2, "0"));

    return [
      hexArray.slice(0, 4).join(""),
      hexArray.slice(4, 6).join(""),
      hexArray.slice(6, 8).join(""),
      hexArray.slice(8, 10).join(""),
      hexArray.slice(10, 16).join("")
    ].join("-");
  }

  async initialize() {
    if (this.db) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = async (event) => {
        const database = event.target.result;
        const existingStoreNames = Array.from(database.objectStoreNames);

        if (!existingStoreNames.includes(STORES.icons)) {
          const iconsStore = database.createObjectStore(STORES.icons, { keyPath: "id" });

          iconsStore.createIndex(
            "iconPackNameAndVersion",
            ["iconPackName", "iconPackVersion"],
            { unique: false },
          );
        }

        if (!existingStoreNames.includes(STORES.siteConfigs)) {
          const siteConfigsStore = database.createObjectStore(STORES.siteConfigs, { keyPath: "id" });
          siteConfigsStore.createIndex("active", "active", { unique: false });
        }

        if (!existingStoreNames.includes(STORES.uploads)) {
          const iconsStore = database.createObjectStore(STORES.uploads, { keyPath: "id" });
        }

        resolve();
      };
    });
  }

  async fetchIconsMetadata(metadataUrl) {
    let responseText;

    try {
      const response = await fetch(metadataUrl);

      // console.log(`response`);
      // console.dir(response, { depth: null });

      if (!response.ok) throw new Error("Network response was not ok");

      responseText = await response.text();
    } catch (error) {
      console.error("Fetch error: ", error);
    }

    // console.log(`metadata`);
    // console.dir(metadata, { depth: null });

    const parsedResponse = JSON.parse(responseText);

    // console.log(`parsedResponse`);
    // console.dir(parsedResponse, { depth: null });

    let iconsMetadata = parsedResponse;

    // console.log(`iconsMetadata`);
    // console.dir(iconsMetadata, { depth: null });

    if (parsedResponse?.icons) {
      const iconObjects = {};

      if (Array.isArray(parsedResponse.icons)) {
        // Ionicons
        for (const icon of parsedResponse.icons) {
          const { name, tags } = icon;
          iconObjects[name] = tags;
        }
      } else {
        // Tabler
        for (const iconMetadata of Object.values(parsedResponse)) {
          const { name, tags, category } = iconMetadata;

          const tagsArray = tags || [];
          tagsArray.push(category.toLowerCase());

          iconObjects[name] = tagsArray;
        };
      }

      iconsMetadata = iconObjects;
    }

    // console.log(`iconsMetadata`);
    // console.dir(iconsMetadata, { depth: null });

    return iconsMetadata || null;
  }

  async downloadSvgIconsFromUrl(iconPack, versionMetadata, url, iconsMetadata) {
    const response = await fetch(url.replaceAll("{VERSION}", versionMetadata.name));

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

    const buildIconId = (iconPack, iconName) => `${iconPack.name}-${versionMetadata.name}-${iconName}`;

    let iconCount = 0;

    if (fileType === "text/plain" || fileType === "image/svg+xml") {
      const saveIconFromSymbol = async (symbol, iconPack) => {
        const iconName = symbol.id.replace('tabler-', '');
        const iconId = buildIconId(iconPack, iconName);

        symbol.id = iconId;

        const iconTags = iconsMetadata[iconName];
        // symbol.setAttribute("tags", iconTags.join(" "));

        const iconStyle = iconPack.styles.find((style) => {
          return style.filter.test(iconName);
        }).name;

        const icon = {
          id: iconId,
          iconPackName: iconPack.name,
          iconPackVersion: versionMetadata.name,
          name: iconName,
          style: iconStyle,
          tags: iconTags,
          symbol: symbol.outerHTML,
        };

        await window.extensionStore.addIcon(icon);
        iconCount++;
      };

      // jsDelivr Docs: https://www.jsdelivr.com/documentation#id-restrictions
      if (fileType === "text/plain") {
        const htmlDoc = parser.parseFromString(responseString, 'text/html');
        const htmlElement = htmlDoc.documentElement;

        // console.log(`htmlElement`);
        // console.dir(htmlElement, { depth: null });

        const svgElements = htmlElement.querySelectorAll("a > svg");

        for await (const svgElement of svgElements) {
          svgElement.setAttribute("viewBox", "0 0 512 512");

          const symbolId = svgElement.children[0].getAttribute('href');

          const blockList = versionMetadata.blockList || [];
          if (blockList.includes(symbolId.replaceAll('#', ''))) continue;

          const symbol = htmlElement.querySelector(symbolId);
          await saveIconFromSymbol(symbol, iconPack);
        };
      } else if (fileType === "image/svg+xml") {
        const svgDoc = parser.parseFromString(responseString, fileType);
        const symbols = svgDoc.querySelectorAll("symbol");

        for await (const symbol of symbols) {
          symbol.classList.add(iconPack.name);
          if (versionMetadata.symbolViewBox) symbol.setAttribute("viewBox", versionMetadata.symbolViewBox);
          await saveIconFromSymbol(symbol, iconPack);
        }
      }
    } else if (fileType === "application/json") {
      const iconsObject = JSON.parse(responseString);

      // console.log(`iconsObject`);
      // console.dir(iconsObject, { depth: null });

      for (const [originalIconName, iconMetadata] of Object.entries(iconsObject)) {
        // console.log(`iconMetadata`);
        // console.dir(iconMetadata);

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
            .replace('<svg', `<symbol id="${iconId}" class="${iconPack.name}"`)
            .replace('svg>', 'symbol>');

          const icon = {
            id: iconId,
            iconPackName: iconPack.name,
            iconPackVersion: versionMetadata.name,
            name: iconName,
            style: iconStyle.capitalize(),
            tags: iconTags,
            symbol: symbolString,
          };

          await window.extensionStore.addIcon(icon);
          iconCount++;
        }
      }
    }

    return iconCount;
  }

  async downloadIconPackVersion(iconPack, versionMetadata) {
    const iconsMetadata =
      iconPack.metadataUrl ?
      await this.fetchIconsMetadata(iconPack.metadataUrl.replaceAll("{VERSION}", versionMetadata.name)) :
      null;

    // console.log(`iconsMetadata`);
    // console.dir(iconsMetadata, { depth: null });

    let iconCount = 0;

    if (Array.isArray(iconPack.svgUrl)) {
      for (const url of iconPack.svgUrl) {
        iconCount += await this.downloadSvgIconsFromUrl(iconPack, versionMetadata, url, iconsMetadata);
      }
    } else {
      iconCount = await this.downloadSvgIconsFromUrl(iconPack, versionMetadata, iconPack.svgUrl, iconsMetadata);
    }

    return iconCount;
  }

  async deleteIconsByIconPackVersion(iconPackName, iconPackVersion) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.icons], "readwrite");
      const store = transaction.objectStore(STORES.icons);
      let deletedCount = 0;

      // Use a cursor to iterate through all records and delete matching ones
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          if (record.iconPackName === iconPackName && record.iconPackVersion === iconPackVersion) {
            // Delete this record
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);

      transaction.oncomplete = () => {
        console.log(`Deleted ${deletedCount} icons from ${iconPackName} ${iconPackVersion}`);
        resolve(deletedCount);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getIconCountByIconPackVersion(iconPackName, iconPackVersion) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.icons], "readonly");
      const store = transaction.objectStore(STORES.icons);

      const index = store.index("iconPackNameAndVersion");
      const keyRange = IDBKeyRange.only([iconPackName, iconPackVersion]);

      const countRequest = index.count(keyRange);

      countRequest.onsuccess = () => {
        resolve(countRequest.result);
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  getIconPacks() {
    return [
      {
        name: "Ionicons",
        homepageUrl: 'https://ionic.io/ionicons',
        changelogUrl: "https://github.com/ionic-team/ionicons/blob/main/CHANGELOG.md",
        svgUrl: "https://cdn.jsdelivr.net/npm/ionicons@{VERSION}/dist/cheatsheet.html",
        metadataUrl: "https://cdn.jsdelivr.net/npm/ionicons@{VERSION}/dist/ionicons.json",
        styles: [
          {
            name: "Outline",
            filter: /-outline/,
          },
          {
            name: "Filled",
            filter: /^(?!.*-outline)(?!.*-sharp).*$/, // Not containing -outline or -sharp
          },
          {
            name: "Sharp",
            filter: /-sharp/,
          },
        ],
        versions: [
          // Fix PR: https://github.com/ionic-team/ionicons/pull/1433
          {
            name: "7.4.0",
            blockList: [
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
            ],
          },
          {
            name: "7.3.1",
            blockList: [
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
            ],
          },
        ],
      },
      {
        name: "Font_Awesome",
        homepageUrl: 'https://fontawesome.com',
        changelogUrl: "https://fontawesome.com/changelog",
        svgUrl: "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@{VERSION}/metadata/icon-families.json",
        styles: [
          {
            name: "Regular",
            filter: /-regular/,
          },
          {
            name: "Solid",
            filter: /-solid/,
          },
          {
            name: "Brands",
            filter: /-brand/,
          },
        ],
        versions: [
          { name: "6.7.2" },
          { name: "6.6.0" },
        ],
      },
      {
        name: "Lucide",
        homepageUrl: 'https://lucide.dev',
        changelogUrl: "https://github.com/lucide-icons/lucide/releases",
        svgUrl: "https://cdn.jsdelivr.net/npm/lucide-static@0.477.0/sprite.svg",
        metadataUrl: "https://cdn.jsdelivr.net/npm/lucide-static@0.477.0/tags.json",
        styles: [
          {
            name: "Regular",
            filter: /.*/,
          },
        ],
        versions: [
          {
            name: "0.477.0",
            // Issue: https://github.com/lucide-icons/lucide/issues/2768
            symbolViewBox: "0 0 24 24",
          },
        ],
      },
      {
        name: "Tabler",
        homepageUrl: "https://tabler.io/icons",
        changelogUrl: "https://tabler.io/changelog",
        svgUrl: [
          "https://cdn.jsdelivr.net/npm/@tabler/icons-sprite@{VERSION}/dist/tabler-sprite.svg",
          "https://cdn.jsdelivr.net/npm/@tabler/icons-sprite@{VERSION}/dist/tabler-sprite-filled.svg"
        ],
        metadataUrl: "https://cdn.jsdelivr.net/npm/@tabler/icons@{VERSION}/icons.json",
        styles: [
          {
            name: "Outline",
            filter: /^(?!filled-)/, // Not starting with filled-
          },
          {
            name: "Filled",
            filter: /^filled-/,
          },
        ],
        versions: [
          { name: "3.30.0" },
        ],
      },
    ];
  }

  checkAnyThemeEnabled() {
    const lightThemeHidden = document.documentElement.style.getPropertyValue('--light-theme-display') === 'none';
    const darkThemeHidden = document.documentElement.style.getPropertyValue('--dark-theme-display') === 'none';

    const anyThemeEnabled = lightThemeHidden && darkThemeHidden;

    document.documentElement.style.setProperty(
      '--any-theme-display',
      anyThemeEnabled ? 'table-cell' : 'none',
    );

    const anyThemeToggleId = "#any-theme-switch";
    const toggleElement = document.querySelector(anyThemeToggleId);
    if (toggleElement) toggleElement.checked = anyThemeEnabled;

    // this.getSetting('anyThemeEnabled').apply(anyTheme);
  }

  getSettingsMetadata() {
    return {
      lightThemeEnabled: {
        getValue: () => {
          const storageKey = "lightThemeEnabled";
          const existingValue = localStorage.getItem(storageKey);
          return existingValue?.toString() === 'true';
        },
        initialize: () => {
          const storageKey = "lightThemeEnabled";
          const inputId = "#light-theme-switch";
          const cssVariable = "--light-theme-display";
          const defaultValue = true;

          const apply = (value) => {
            const isEnabled = value.toString() === 'true';
            // console.log(`Setting ${storageKey} to ${isEnabled}`);

            localStorage.setItem(storageKey, isEnabled);

            const inputElement = document.querySelector(inputId);
            if (inputElement) inputElement.checked = isEnabled;

            document.documentElement.style.setProperty(
              cssVariable,
              isEnabled ? "table-cell" : "none"
            );

            this.checkAnyThemeEnabled();
          }

          const existingValue = localStorage.getItem(storageKey);
          apply(existingValue || defaultValue);

          const inputElement = document.querySelector(inputId);
          if (!inputElement) return;

          inputElement.addEventListener("sl-change", (event) => {
            const isEnabled = event.target.checked;
            apply(isEnabled);
          });
        }
      },
      darkThemeEnabled: {
        getValue: () => {
          const storageKey = "darkThemeEnabled";
          const existingValue = localStorage.getItem(storageKey);
          return existingValue?.toString() === 'true';
        },
        initialize: () => {
          const storageKey = "darkThemeEnabled";
          const inputId = "#dark-theme-switch";
          const cssVariable = "--dark-theme-display";
          const defaultValue = true;

          const apply = (value) => {
            const isEnabled = value.toString() === 'true';
            // console.log(`Setting ${storageKey} to ${isEnabled}`);

            localStorage.setItem(storageKey, isEnabled);

            const inputElement = document.querySelector(inputId);
            if (inputElement) inputElement.checked = isEnabled;

            document.documentElement.style.setProperty(
              cssVariable,
              isEnabled ? "table-cell" : "none"
            );

            this.checkAnyThemeEnabled();
          }

          const existingValue = localStorage.getItem(storageKey);
          apply(existingValue || defaultValue);

          const inputElement = document.querySelector(inputId);
          if (!inputElement) return;

          inputElement.addEventListener("sl-change", (event) => {
            const isEnabled = event.target.checked;
            apply(isEnabled);
          });
        }
      },
      lightThemeDefaultColor: {
        getValue: () => {
          const storageKey = "lightThemeDefaultColor";
          return localStorage.getItem(storageKey);
        },
        initialize: () => {
          const storageKey = "lightThemeDefaultColor";
          const inputId = "#default-light-theme-color";
          const defaultValue = '#333333';

          const apply = (value) => {
            // console.log(`Setting ${storageKey} to ${value}`);

            localStorage.setItem(storageKey, value);

            const inputElement = document.querySelector(inputId);
            if (inputElement) inputElement.value = value;
          }

          const existingValue = localStorage.getItem(storageKey);
          apply(existingValue || defaultValue);

          const inputElement = document.querySelector(inputId);
          if (!inputElement) return;

          inputElement.addEventListener('sl-blur', (event) => {
            event.target.updateComplete.then(() => {
              const color = event.target.input.value;
              apply(color);
            });
          });
        }
      },
      darkThemeDefaultColor: {
        getValue: () => {
          const storageKey = "darkThemeDefaultColor";
          return localStorage.getItem(storageKey);
        },
        initialize: () => {
          const storageKey = "darkThemeDefaultColor";
          const inputId = "#default-dark-theme-color";
          const defaultValue = '#cccccc';

          const apply = (value) => {
            // console.log(`Setting ${storageKey} to ${value}`);

            localStorage.setItem(storageKey, value);

            const inputElement = document.querySelector(inputId);
            if (inputElement) inputElement.value = value;
          }

          const existingValue = localStorage.getItem(storageKey);
          apply(existingValue || defaultValue);

          const inputElement = document.querySelector(inputId);
          if (!inputElement) return;

          inputElement.addEventListener('sl-blur', (event) => {
            event.target.updateComplete.then(() => {
              const color = event.target.input.value;
              apply(color);
            });
          });
        }
      },
      anyThemeDefaultColor: {
        getValue: () => {
          const storageKey = "anyThemeDefaultColor";
          return localStorage.getItem(storageKey);
        },
        initialize: () => {
          const storageKey = "anyThemeDefaultColor";
          const inputId = "#default-any-theme-color";
          const defaultValue = '#808080';

          const apply = (value) => {
            // console.log(`Setting ${storageKey} to ${value}`);

            localStorage.setItem(storageKey, value);

            const inputElement = document.querySelector(inputId);
            if (inputElement) inputElement.value = value;
          }

          const existingValue = localStorage.getItem(storageKey);
          apply(existingValue || defaultValue);

          const inputElement = document.querySelector(inputId);
          if (!inputElement) return;

          inputElement.addEventListener('sl-blur', (event) => {
            event.target.updateComplete.then(() => {
              const color = event.target.input.value;
              apply(color);
            });
          });
        }
      },
    };
  }

  getSetting(storageKey) {
    return this.getSettingsMetadata()[storageKey];
  }

  getSettingValue(storageKey) {
    return this.getSetting(storageKey).getValue();
  }

  // Methods for siteConfigs
  async addSiteConfig(siteConfig) {
    const configWithId = {
      ...siteConfig,
      id: this.generateUUID()
    };

    return this._addRecord(STORES.siteConfigs, configWithId);
  }

  async getSiteConfigById(id) {
    return await this._getRecord(STORES.siteConfigs, id);
  }

  async getSiteConfigs() {
    return this._getAllRecords(STORES.siteConfigs);
  }

  async updateSiteConfig(siteConfig) {
    return this._updateRecord(STORES.siteConfigs, siteConfig);
  }

  async deleteSiteConfig(id) {
    return this._deleteRecord(STORES.siteConfigs, id);
  }

  async deleteSiteConfigs(ids) {
    return this._deleteRecords(STORES.siteConfigs, ids);
  }

  // Methods for icons
  async addIcon(icon) {
    try {
      const iconRecord = icon.id ? await this.getIconById(icon.id) : null;

      if (!iconRecord) {
        return await this._addRecord(STORES.icons, icon);
      } else {
        // The icon already exists, so you can return the existing icon or handle it in a different way
        return iconRecord;
      }
    } catch (error) {
      if (error.name === 'DOMException' && error.code === DOMException.CONSTRAINT_ERR) {
        // Handle the constraint violation error
        console.error('Error adding icon:', error);
        // You can try to generate a new ID and retry the operation, or handle it in a different way
        return null;
      } else {
        // Rethrow the error for other types of errors
        throw error;
      }
    }
  }

  async getIconById(id) {
    return await this._getRecord(STORES.icons, id);
  }

  async getIcons() {
    return this._getAllRecords(STORES.icons);
  }

  async updateIcon(icon) {
    return this._updateRecord(STORES.icons, icon);
  }

  async deleteIcon(id) {
    return this._deleteRecord(STORES.icons, id);
  }

  // Methods for upload
  async addUpload(upload) {
    const configWithId = {
      ...upload,
      id: Date.now(),
    };

    return this._addRecord(STORES.uploads, configWithId);
  }

  async getUploadById(id) {
    return await this._getRecord(STORES.uploads, parseInt(id));
  }

  async getUploads() {
    return this._getAllRecords(STORES.uploads);
  }

  async updateUpload(upload) {
    return this._updateRecord(STORES.uploads, upload);
  }

  async deleteUpload(id) {
    return this._deleteRecord(STORES.uploads, id);
  }

  async deleteUploads(ids) {
    return this._deleteRecords(STORES.uploads, ids);
  }

  // Private helper methods
  async _addRecord(storeName, record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  async _getAllRecords(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _getRecord(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _updateRecord(storeName, record) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(record);

      request.onsuccess = () => resolve(record);
      request.onerror = () => reject(request.error);
    });
  }

  async _deleteRecord(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async _deleteRecords(storeName, ids) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      ids.forEach(id => store.delete(id));
    });
  }
}

window.extensionStore = new ExtensionStore();
