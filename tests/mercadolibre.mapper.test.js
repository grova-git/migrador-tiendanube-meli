"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mercadolibre_mapper_1 = require("../src/services/mercadolibre.mapper");
const types_1 = require("../src/types");
describe('MercadoLibreMapper', () => {
    let mapper;
    beforeEach(() => {
        mapper = new mercadolibre_mapper_1.MercadoLibreMapper();
    });
    it('should trim titles intelligently avoiding trailing connectors', () => {
        const mockProduct = {
            id_original: '123',
            titulo: 'Remera de algodón manga corta estampada con diseño exclusivo y original', // length 71
            descripcion: 'description',
            precio: 100,
            stock: 10,
            imagenes: [],
            variantes: []
        };
        const result = mapper.mapCatalog([mockProduct]);
        expect(result.audit.titles_trimmed).toBe(1);
        expect(result.products[0].title.length).toBeLessThanOrEqual(60);
        // Should pop 'y' if it ends in 'y'
        expect(result.products[0].title.endsWith(' y')).toBe(false);
    });
    it('should remove URLs and stray HTML from descriptions', () => {
        const mockProduct = {
            id_original: '123',
            titulo: 'Short Title',
            descripcion: 'Check our site at https://mysite.com <style>body{color:red;}</style>',
            precio: 100,
            stock: 10,
            imagenes: [],
            variantes: []
        };
        const result = mapper.mapCatalog([mockProduct]);
        expect(result.products[0].description.plain_text).not.toContain('https://');
        expect(result.products[0].description.plain_text).not.toContain('<style>');
    });
    it('should map variations correctly to ML multidimensional format', () => {
        const mockProduct = {
            id_original: '123',
            titulo: 'Short Title',
            descripcion: 'desc',
            precio: 1500,
            stock: 30,
            imagenes: [],
            variantes: [
                { talle: 'L', color: 'Rojo', stock: 10, sku: '1' },
                { talle: 'M', color: 'Rojo', stock: 20, sku: '2' }
            ]
        };
        const result = mapper.mapCatalog([mockProduct]);
        const mlProduct = result.products[0];
        expect(mlProduct.variations).toBeDefined();
        expect(mlProduct.variations?.length).toBe(2);
        expect(mlProduct.variations[0].attribute_combinations).toEqual([
            { id: 'COLOR', name: 'Color', value_name: 'Rojo' },
            { id: 'SIZE', name: 'Talle', value_name: 'L' }
        ]);
    });
});
//# sourceMappingURL=mercadolibre.mapper.test.js.map