"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoLibreService = void 0;
const axios_1 = __importDefault(require("axios"));
const mercadolibre_mapper_1 = require("./mercadolibre.mapper");
class MercadoLibreService {
    accessToken;
    categoryId;
    currencyId;
    buyingMode;
    condition;
    listingTypeId;
    constructor(accessToken) {
        this.accessToken = accessToken;
        // Default values for mandatory ML fields (can be parameterized later)
        this.categoryId = 'MLA1430';
        this.currencyId = 'ARS';
        this.buyingMode = 'buy_it_now';
        this.condition = 'new';
        this.listingTypeId = 'gold_special';
    }
    async publishBatch(products) {
        const report = {
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
                }
                else {
                    report.failed.push({
                        original_sku: sku,
                        title: product.title,
                        error: result.reason.message || JSON.stringify(result.reason)
                    });
                }
            });
            // Wait before the next batch if there are more products
            if (i + batchSize < products.length) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        return report;
    }
    async publishSingleProduct(product) {
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
            const response = await axios_1.default.post('https://api.mercadolibre.com/items', payload, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            let errorMessage = 'Unknown error';
            if (error.response && error.response.data) {
                errorMessage = error.response.data.message || JSON.stringify(error.response.data.cause);
            }
            else if (error.message) {
                errorMessage = error.message;
            }
            throw new Error(errorMessage);
        }
    }
}
exports.MercadoLibreService = MercadoLibreService;
//# sourceMappingURL=mercadolibre.service.js.map