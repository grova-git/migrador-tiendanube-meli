import axios from 'axios';
import { MercadoLibreProduct } from './mercadolibre.mapper';

export interface PublishReport {
  successful: { original_sku?: string; ml_id: string; title: string }[];
  failed: { original_sku?: string; title: string; error: string }[];
  total_processed: number;
}

export class MercadoLibreService {
  private accessToken: string;
  private categoryId: string;
  private currencyId: string;
  private buyingMode: string;
  private condition: string;
  private listingTypeId: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    // Default values for mandatory ML fields (can be parameterized later)
    this.categoryId = 'MLA3530'; // Categoría 'Otros', mucho menos estricta
    this.currencyId = 'ARS';
    this.buyingMode = 'buy_it_now';
    this.condition = 'new';
    this.listingTypeId = 'gold_special';
  }

  async publishBatch(products: MercadoLibreProduct[], onProgress?: (current: number) => void): Promise<PublishReport> {
    const report: PublishReport = {
      successful: [],
      failed: [],
      total_processed: products.length
    };

    // Process in batches of 20 to respect basic rate limiting
    const batchSize = 20;
    const delayMs = 1000; // 1 second delay between batches

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const promises = batch.map(product => this.publishSingleProduct(product));
      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        const product = batch[index];
        const skuAttr = product.attributes.find(a => a.id === 'SELLER_SKU');
        const sku = skuAttr ? skuAttr.value_name : undefined;

        if (result.status === 'fulfilled') {
          report.successful.push({
            original_sku: sku,
            ml_id: result.value.id,
            title: product.title
          });
        } else {
          report.failed.push({
            original_sku: sku,
            title: product.title,
            error: result.reason.message || JSON.stringify(result.reason)
          });
        }
      });

      // Actualizar el progreso después de procesar un lote
      if (onProgress) {
        const currentCount = Math.min(i + batchSize, products.length);
        onProgress(currentCount);
      }

      // Wait before the next batch if there are more products
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return report;
  }

  private async publishSingleProduct(product: MercadoLibreProduct): Promise<any> {
    const payload = {
      ...product,
      category_id: this.categoryId,
      currency_id: this.currencyId,
      buying_mode: this.buyingMode,
      condition: this.condition,
      listing_type_id: this.listingTypeId,
      // CRITICAL: Set status to paused to avoid going live immediately
      status: 'paused', 
    };

    try {
      const response = await axios.post('https://api.mercadolibre.com/items', payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      let errorMessage = 'Unknown error';
      if (error.response && error.response.data) {
         const msg = error.response.data.message;
         const cause = error.response.data.cause ? JSON.stringify(error.response.data.cause) : '';
         errorMessage = `${msg} - Detalles: ${cause}`;
      } else if (error.message) {
         errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  }
}
