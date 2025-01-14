class PopupHandler {
  constructor() {
      this.dataStore = new DataStore();
      this.init();
  }

  async init() {
      try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
              const product = await this.dataStore.getProduct(tab.url);
              if (product) {
                  this.displayProduct(product);
                  await this.fetchAndDisplaySimilarProducts(product);
                  await this.fetchAndDisplayCoupons(product);
              }
          }
      } catch (error) {
          console.error('Initialization failed:', error);
      }
  }

  displayProduct(product) {
      const container = document.querySelector('.current-product');
      container.innerHTML = `
          <div class="product-card">
              <img src="${product.image || 'default-image.png'}" alt="${product.title || 'Product'}">
              <h3>${product.title || 'Unknown Product'}</h3>
              <p class="price">$${product.price || 'N/A'}</p>
          </div>
      `;
  }

  async fetchAndDisplaySimilarProducts(product) {
      try {
          const response = await chrome.runtime.sendMessage({
              type: 'GET_SIMILAR_PRODUCTS ',
              data: product
          });

          if (response && Array.isArray(response.products)) {
              const container = document.querySelector('.similar-products');
              if (response.products.length > 0) {
                  container.innerHTML = response.products.map(p => `
                      <div class="product-card">
                          <img src="${p.image}" alt="${p.title}">
                          <h3>${p.title}</h3>
                          <p class="price">$${p.price}</p>
                          <a href="${p.url}" target="_blank">View Product</a>
                      </div>
                  `).join('');
              } else {
                  container.innerHTML = '<p>No similar products found.</p>';
              }
          } else {
              console.error('Invalid products data:', response);
          }
      } catch (error) {
          console.error('Failed to fetch similar products:', error);
      }
  }

  async fetchAndDisplayCoupons(product) {
      try {
          const coupons = await this.fetchCoupons(product);
          if (Array.isArray(coupons) && coupons.length > 0) {
              const container = document.querySelector('.coupons');
              container.innerHTML = coupons.map(coupon => `
                  <div class="coupon-card">
                      <h4>${coupon.code}</h4>
                      <p>${coupon.description}</p>
                      <button onclick="copyCouponCode('${coupon.code}')">Copy Code</button>
                  </div>
              `).join('');
          } else {
              console.log('No coupons available.');
          }
      } catch (error) {
          console.error('Failed to fetch coupons:', error);
      }
  }

  async fetchCoupons(product) {
      // Implement actual coupon fetching logic here
      return [
          { code: 'FASHION20', description: '20% off your purchase' },
          { code: 'FREESHIP', description: 'Free shipping on orders over $50' }
      ];
  }
}

function copyCouponCode(code) {
  navigator.clipboard.writeText(code).then(() => {
      alert(`Coupon code "${code}" copied to clipboard!`);
  }).catch(err => {
      console.error('Failed to copy coupon code:', err);
  });
}

new PopupHandler();