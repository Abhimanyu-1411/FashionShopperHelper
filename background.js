try {
  importScripts('lib/DataStore.js');
  const dataStore = new DataStore();
} catch (error) {
  console.error('Failed to load DataStore.js:', error);
}

class ProductSimilarityEngine {
  constructor() {
      this.productCache = new Map();
      this.similarityThreshold = 0.6;
  }

  async findSimilarProducts(baseProduct) {
      try {
          const allProducts = await this.fetchProductDatabase();
          return allProducts
              .filter(product => this.calculateSimilarity(baseProduct, product) > this.similarityThreshold)
              .slice(0, 5);
      } catch (error) {
          console.error('Similar Product Search Error:', error);
          return [];
      }
  }

  calculateSimilarity(product1, product2) {
      let similarity = 0;

      const titleSimilarity = this.textSimilarity(
          product1.title.toLowerCase(),
          product2.title.toLowerCase()
      );

      const priceSimilarity = 1 - Math.abs(
          (product1.price - product2.price) / product1.price
      );

      const domainPenalty = product1.domain === product2.domain ? 0.5 : 1;

      similarity = (titleSimilarity * 0.6 + priceSimilarity * 0.4) * domainPenalty;

      return Math.max(0, Math.min(1, similarity));
  }

  textSimilarity(text1, text2) {
      if (!text1 && !text2) return 0; // Both texts are empty
      const words1 = new Set(text1.split(/\s+/));
      const words2 = new Set(text2.split(/\s+/));
      const intersection = [...words1].filter(word => words2.has(word));
      return intersection.length / Math.max(words1.size, words2.size);
  }

  async fetchProductDatabase() {
      // Placeholder for actual product database fetch
      return [
          { title: 'Blue Denim Jacket', price: 89.99, domain: 'example.com' },
          { title: 'Vintage Blue Jeans', price: 79.99, domain: 'shop.com' }
      ];
  }
}

const similarityEngine = new ProductSimilarityEngine();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
      case 'SAVE_PRODUCT':
          dataStore.saveProduct(request.data)
              .then(success => {
                  sendResponse({ success });
              });
          return true;

      case 'GET_SIMILAR_PRODUCTS':
          similarityEngine.findSimilarProducts(request.data)
              .then(products => sendResponse({ products }));
          return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
      chrome.tabs.sendMessage(tabId, { type: 'URL_CHANGED', url: tab.url })
          .catch(() => {});
  }
});
