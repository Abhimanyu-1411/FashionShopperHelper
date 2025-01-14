class ProductPageHandler {
  constructor() {
      this.productExtractor = new ProductExtractor();
      this.init();
  }

  init() {
      console.log('Initializing ProductPageHandler');

      // Use MutationObserver for dynamic content
      const observer = new MutationObserver((mutations) => {
          if (this.isProductPage()) {
              this.extractAndSendProduct();
              observer.disconnect();
          }
      });

      observer.observe(document.body, {
          childList: true,
          subtree: true
      });

      // Fallback method
      setTimeout(() => {
          if (this.isProductPage()) {
              this.extractAndSendProduct();
          }
      }, 2000);
  }

  isProductPage() {
      const productIndicators = [
          () => /\/product|\/p\/|\/item|\/dp\/|\/stores\//.test(window.location.href),
          () => !!document.querySelector('[data-product-id], [data-pid], #product, .product, [itemtype*="Product"]'),
          () => !!document.querySelector('.price, [data-price], .product-price, [itemprop="price"]'),
          () => !!document.querySelector('button:contains("Add to Cart")'),
          () => !!document.querySelector('.product-gallery, .product-images, [data-gallery]'),
      ];

      return productIndicators.some(indicator => {
          try {
              return indicator();
          } catch (e) {
              console.error('Product detection error:', e);
              return false;
          }
      });
  }

  async extractAndSendProduct() {
      try {
          const product = await this.productExtractor.extract();

          if (product && product.title && product.price) {
              chrome.runtime.sendMessage(
                  {
                      type: 'SAVE_PRODUCT',
                      data: product,
                  },
                  (response) => {
                      if (chrome.runtime.lastError) {
                          console.error('Error sending message:', chrome.runtime.lastError.message);
                      } else {
                          console.log('Product saved:', product);
                      }
                  }
              );

              this.showNotification(`Product detected: ${product.title}`);
          } else {
              console.error('Invalid product data extracted');
          }
      } catch (error) {
          console.error('Product extraction failed:', error);
      }
  }

  showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'fashion-compare-notification';
      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => notification.remove(), 3000);
  }
}

// Ensure initialization after DOM is fully loaded
function initializeExtension() {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
      new ProductPageHandler();
  } else {
      document.addEventListener('DOMContentLoaded', () => {
          new ProductPageHandler();
      });
  }
}

initializeExtension();