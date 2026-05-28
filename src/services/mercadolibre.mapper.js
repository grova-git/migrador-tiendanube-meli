"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoLibreMapper = void 0;
const types_1 = require("../types");
class MercadoLibreMapper {
    mapCatalog(products) {
        let titles_trimmed = 0;
        const mappedProducts = products.map(product => {
            // 1. Trimming titles
            let originalTitle = product.titulo || '';
            let finalTitle = originalTitle;
            if (originalTitle.length > 60) {
                finalTitle = this.trimTitleIntelligently(originalTitle, 60);
                titles_trimmed++;
            }
            // 2. Description clean up
            const cleanDescription = this.cleanDescriptionForML(product.descripcion || '');
            // 3. Mapping Variations
            let variations = undefined;
            if (product.variantes && product.variantes.length > 0) {
                variations = product.variantes.map(v => {
                    const combinations = [];
                    if (v.color) {
                        combinations.push({ id: 'COLOR', name: 'Color', value_name: v.color });
                    }
                    if (v.talle) {
                        combinations.push({ id: 'SIZE', name: 'Talle', value_name: v.talle });
                    }
                    return {
                        price: product.precio,
                        available_quantity: v.stock,
                        attribute_combinations: combinations,
                        attributes: [
                            { id: 'SELLER_SKU', name: 'SKU', value_name: v.sku }
                        ]
                    };
                });
            }
            const mlProduct = {
                title: finalTitle,
                description: { plain_text: cleanDescription },
                price: product.precio,
                available_quantity: product.stock,
                pictures: product.imagenes ? product.imagenes.map(img => ({ source: img })) : [],
                attributes: [
                    { id: 'SELLER_SKU', name: 'SKU', value_name: String(product.id_original) }
                ],
            };
            if (variations && variations.length > 0) {
                mlProduct.variations = variations;
            }
            return mlProduct;
        });
        return {
            products: mappedProducts,
            audit: {
                total_processed: products.length,
                titles_trimmed
            }
        };
    }
    trimTitleIntelligently(title, maxLength) {
        if (title.length <= maxLength)
            return title;
        // Connectors and secondary words to remove if they are at the end
        const connectors = ['y', 'de', 'con', 'para', 'a', 'o', 'el', 'la', 'los', 'las'];
        let words = title.split(' ');
        let currentLength = 0;
        let keepWords = [];
        for (const word of words) {
            const spaceLen = keepWords.length > 0 ? 1 : 0;
            if (currentLength + word.length + spaceLen <= maxLength) {
                keepWords.push(word);
                currentLength += word.length + spaceLen;
            }
            else {
                break;
            }
        }
        // Check if the last word is a connector
        while (keepWords.length > 0 && connectors.includes(keepWords[keepWords.length - 1].toLowerCase())) {
            keepWords.pop();
        }
        let result = keepWords.join(' ');
        // Fallback if the first word is larger than max length
        if (result.length === 0) {
            result = title.substring(0, maxLength);
        }
        return result;
    }
    cleanDescriptionForML(description) {
        let text = description.replace(/<[^>]*>?/gm, ''); // Remove stray HTML tags
        text = text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ''); // Remove URLs
        // Optional: remove css leftovers if any exist like style={...}
        text = text.replace(/style="[^"]*"/g, '');
        text = text.replace(/class="[^"]*"/g, '');
        return text.trim();
    }
}
exports.MercadoLibreMapper = MercadoLibreMapper;
//# sourceMappingURL=mercadolibre.mapper.js.map