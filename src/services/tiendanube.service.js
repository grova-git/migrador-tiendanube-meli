"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiendanubeService = void 0;
const axios_1 = __importDefault(require("axios"));
const html_to_text_1 = require("html-to-text");
const types_1 = require("../types");
class TiendanubeService {
    accessToken;
    storeId;
    userAgent;
    constructor(accessToken, storeId, appName, email) {
        this.accessToken = accessToken;
        this.storeId = storeId;
        this.userAgent = `${appName} (${email})`;
    }
    async getProducts() {
        try {
            const response = await axios_1.default.get(`https://api.tiendanube.com/v1/${this.storeId}/products`, {
                headers: {
                    'Authentication': `bearer ${this.accessToken}`,
                    'User-Agent': this.userAgent,
                },
            });
            const tiendanubeProducts = response.data;
            return tiendanubeProducts.map((product) => this.mapProduct(product));
        }
        catch (error) {
            console.error('Error fetching products from Tiendanube:', error);
            throw error;
        }
    }
    mapProduct(product) {
        const imagenes = product.images ? product.images.map((img) => img.src) : [];
        // Clean description HTML
        let descripcion = '';
        if (product.description && product.description.es) {
            descripcion = (0, html_to_text_1.convert)(product.description.es, {
                wordwrap: false
            });
        }
        // Default title from Spanish
        const titulo = product.name && product.name.es ? product.name.es : '';
        let precio = 0;
        let totalStock = 0;
        const variantes = [];
        // Find indices for Talle and Color
        let talleIndex = -1;
        let colorIndex = -1;
        if (product.attributes && Array.isArray(product.attributes)) {
            product.attributes.forEach((attr, index) => {
                const attrName = attr.es ? attr.es.toLowerCase() : '';
                if (attrName.includes('talle') || attrName.includes('tamaño') || attrName.includes('size')) {
                    talleIndex = index;
                }
                else if (attrName.includes('color')) {
                    colorIndex = index;
                }
            });
        }
        if (product.variants && Array.isArray(product.variants)) {
            if (product.variants.length > 0) {
                precio = parseFloat(product.variants[0].price) || 0;
            }
            product.variants.forEach((v) => {
                const stock = v.stock === null ? 0 : v.stock;
                totalStock += stock;
                let talle = null;
                let color = null;
                if (v.values && Array.isArray(v.values)) {
                    if (talleIndex !== -1 && v.values[talleIndex]) {
                        talle = v.values[talleIndex].es || v.values[talleIndex];
                    }
                    if (colorIndex !== -1 && v.values[colorIndex]) {
                        color = v.values[colorIndex].es || v.values[colorIndex];
                    }
                    // Fallback if attributes were not found but values exist
                    if (talleIndex === -1 && colorIndex === -1) {
                        if (v.values.length > 0)
                            talle = v.values[0].es || v.values[0];
                        if (v.values.length > 1)
                            color = v.values[1].es || v.values[1];
                    }
                }
                variantes.push({
                    talle: typeof talle === 'string' ? talle : null,
                    color: typeof color === 'string' ? color : null,
                    stock: stock,
                    sku: v.sku || ''
                });
            });
        }
        return {
            id_original: product.id,
            titulo,
            descripcion,
            precio,
            stock: totalStock,
            imagenes,
            variantes
        };
    }
}
exports.TiendanubeService = TiendanubeService;
//# sourceMappingURL=tiendanube.service.js.map