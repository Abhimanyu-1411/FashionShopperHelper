class ProductExtractor {
  constructor() {
      this.selectors = {
          title: [
              '[itemprop="name"]',
              '.product-title',
              '.product-name',
              'h1',
              '[data-product-title]',
              '[class*="product"][class*="title"]',
              '[class*="product"][class*="name"]'
          ],
          price: [
              '[itemprop="price"]',
              '.product-price',
              '.price',
              '[data-price]',
              '[class*="product"][class*="price"]',
              '.current-price',
              '[data-product-price]'
          ],
          image: [
              '[itemprop="image"]',
              '.product-image img',
              '.product-gallery img',
              '[data-product-image]',
              '[class*="product"][class*="image"] img',
              '[class*="gallery"] img'
          ],
          description: [
              '[itemprop="description"]',
              '.product-description',
              '[data-product-description]',
              '[class*="product"][class*="description"]',
              '#description'
          ],
          brand: [
              '[itemprop="brand"]',
              '.product-brand',
              '[data-brand]',
              '[class*="product"][class*="brand"]',
              '.brand'
          ]
      };
  }

  async extract() {
      try {
          const product = {
              url: window.location.href,
              timestamp: new Date().toISOString(),
              title: this.extractTitle(),
              price: this.extractPrice(),
              images: this.extractImages(),
              description: this.extractDescription(),
              brand: this.extractBrand(),
              metadata: this.extractMetadata()
          };

          // Clean and validate the data
          this.cleanProduct(product);
          
          if (this.validateProduct(product)) {
              return product;
          }
          
          throw new Error('Invalid product data extracted');
      } catch (error) {
          console.error('Product extraction failed:', error);
          return null;
      }
  }

  extractTitle() {
      const jsonLd = this.extractJsonLd();
      if (jsonLd?.name) {
          return jsonLd.name;
      }

      const metaTitle = document.querySelector('meta[property="og:title"]')?.content;
      if (metaTitle) {
          return metaTitle;
      }

      for (const selector of this.selectors.title) {
          const element = document.querySelector(selector);
          if (element) {
              return element.textContent.trim();
          }
      }

      return document.title.split('|')[0].trim();
  }

  extractPrice() {
      const jsonLd = this.extractJsonLd();
      if (jsonLd?.offers?.price) {
          return this.normalizePrice(jsonLd.offers.price);
      }

      const metaPrice = document.querySelector('meta[property="product:price:amount"]')?.content;
      if (metaPrice) {
          return this.normalizePrice(metaPrice);
      }

      for (const selector of this.selectors.price) {
          const element = document.querySelector(selector);
          if (element) {
              return this.normalizePrice(element.textContent);
          }
      }

      return null;
  }

  extractImages() {
      const images = new Set();
      const jsonLd = this.extractJsonLd();
      if (jsonLd?.image) {
          const imageUrls = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
          imageUrls.forEach(url => images.add(url));
      }

      const metaImage = document.querySelector('meta[property="og:image"]')?.content;
      if (metaImage) {
          images.add(metaImage);
      }

      for (const selector of this.selectors.image) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
              const src = element.src || element.dataset.src;
              if (src) {
                  images.add(src);
              }
          });
      }

      return Array.from(images);
  }

  extractDescription() {
      const jsonLd = this.extractJsonLd();
      if (jsonLd?.description) {
          return jsonLd.description;
      }

      const metaDescription = document.querySelector('meta[property="og:description"]')?.content;
      if (metaDescription) {
          return metaDescription;
      }

      for (const selector of this.selectors.description) {
          const element = document.querySelector(selector);
          if (element) {
              return element.textContent.trim();
          }
      }

      return null;
  }

  extractBrand() {
      const jsonLd = this.extractJsonLd();
      if (jsonLd?.brand?.name) {
          return jsonLd.brand.name;
      }

      const metaBrand = document.querySelector('meta[property="product:brand"]')?.content;
      if (metaBrand) {
return metaBrand;
      }

      for (const selector of this.selectors.brand) {
          const element = document.querySelector(selector);
          if (element) {
              return element.textContent.trim();
          }
      }

      return null;
  }

  extractMetadata() {
      const metadata = {};
      const jsonLd = this.extractJsonLd();
      if (jsonLd) {
          Object.assign(metadata, {
              sku: jsonLd.sku,
              color: jsonLd.color,
              category: jsonLd.category,
              availability: jsonLd.offers?.availability,
              condition: jsonLd.offers?.itemCondition
          });
      }

      const metaTags = document.querySelectorAll('meta[property^="product:"], meta[property^="og:"]');
      metaTags.forEach(tag => {
          const property = tag.getAttribute('property').split(':').pop();
          metadata[property] = tag.content;
      });

      return metadata;
  }

  extractJsonLd() {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
          try {
              const data = JSON.parse(script.textContent);
              if (Array.isArray(data)) {
                  return data.find(item => item['@type'] === 'Product') || null;
              } else if (data['@type'] === 'Product') {
                  return data;
              }
          } catch (e) {
              console.error('Error parsing JSON-LD:', e);
          }
      }
      return null;
  }

  normalizePrice(price) {
      if (!price) return null;

      const matches = price.toString().match(/[\d.]+/);
      if (!matches) return null;

      const normalizedPrice = parseFloat(matches[0]);
      return isNaN(normalizedPrice) ? null : normalizedPrice;
  }

  cleanProduct(product) {
      product.title = this.stripHtml(product.title);
      product.description = this.stripHtml(product.description);
      product.brand = this.stripHtml(product.brand);

      product.images = product.images
          .filter(url => url && url.startsWith('http'))
          .map(url => url.split('?')[0]);

      Object.keys(product).forEach(key => {
          if (product[key] === null || product[key] === undefined) {
              delete product[key];
          }
      });
  }

  stripHtml(text) {
      if (!text) return null;
      const tmp = document.createElement('div');
      tmp.innerHTML = text;
      return tmp.textContent.trim() || null;
  }

  validateProduct(product) {
      if (!product.title || !product.price) {
          return false;
      }

      if (typeof product.price !== 'number' || product.price <= 0) {
          return false;
      }

      if (!product.url || !product.url.startsWith('http')) {
          return false;
      }

      return true;
  }
}

// Make the class available globally
window.ProductExtractor = ProductExtractor;