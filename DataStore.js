export default class DataStore {
  constructor() {
    this.storageKey = 'fashion_compare_data_v2';
    this.maxStorageItems = 100;
    this.storageExpiration = 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  async getAllProducts() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      return result[this.storageKey] || {};
    } catch (error) {
      console.error('Get All Products Error:', error);
      return {};
    }
  }

  async getProduct(url) {
    try {
      const data = await this.getAllProducts();
      return data[url] || null;
    } catch (error) {
      console.error('Get Product Error:', error);
      return null;
    }
  }

  async saveProduct(product) {
    try {
      const data = await this.getAllProducts();
      this.cleanOldEntries(data);

      data[product.url] = {
        ...product,
        savedTimestamp: Date.now()
      };

      await chrome.storage.local.set({ [this.storageKey]: data });
      return true;
    } catch (error) {
      console.error('Save Product Error:', error);
      return false;
    }
  }

  cleanOldEntries(data) {
    const now = Date.now();
    Object.keys(data).forEach(key => {
      if (now - data[key].savedTimestamp > this.storageExpiration) {
        delete data[key];
      }
    });

    const keys = Object.keys(data);
    if (keys.length > this.maxStorageItems) {
      keys.slice(0, keys.length - this.maxStorageItems)
        .forEach(key => delete data[key]);
    }
  }

  async clearAllData() {
    try {
      await chrome.storage.local.remove(this.storageKey);
      return true;
    } catch (error) {
      console.error('Clear Data Error:', error);
      return false;
    }
  }
}
