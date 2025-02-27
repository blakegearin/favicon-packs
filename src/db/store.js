// src/db/store.js
const DB_NAME = "faviconPacksData";
const DB_VERSION = 1;
const STORES = {
  icons: "icons",
  siteConfigs: "siteConfigs",
  uploads: "uploads",
};

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
          iconsStore.createIndex("name", "name", { unique: false });
          iconsStore.createIndex("style", "style", { unique: false });
        }

        if (!existingStoreNames.includes(STORES.siteConfigs)) {
          const siteConfigsStore = database.createObjectStore(STORES.siteConfigs, { keyPath: "id" });
          siteConfigsStore.createIndex("matchType", "matchType", { unique: false });
          siteConfigsStore.createIndex("active", "active", { unique: false });
        }

        if (!existingStoreNames.includes(STORES.uploads)) {
          const iconsStore = database.createObjectStore(STORES.uploads, { keyPath: "id" });
          iconsStore.createIndex("name", "name", { unique: false });
          iconsStore.createIndex("style", "style", { unique: false });
        }

        resolve();
      };
    });
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
// globalThis.extensionStore = new ExtensionStore();
// const extensionStore = new ExtensionStore();
// Object.assign(self, { extensionStore });
