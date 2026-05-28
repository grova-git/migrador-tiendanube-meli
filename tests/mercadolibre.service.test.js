"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mercadolibre_service_1 = require("../src/services/mercadolibre.service");
const mercadolibre_mapper_1 = require("../src/services/mercadolibre.mapper");
const axios_1 = __importDefault(require("axios"));
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('MercadoLibreService', () => {
    let service;
    beforeEach(() => {
        service = new mercadolibre_service_1.MercadoLibreService('dummy_ml_token');
        jest.clearAllMocks();
    });
    it('should publish a batch of products and return a report', async () => {
        const products = [
            {
                title: 'Product 1',
                description: { plain_text: 'desc 1' },
                price: 100,
                available_quantity: 10,
                pictures: [],
                attributes: [{ id: 'SELLER_SKU', value_name: 'SKU1' }]
            },
            {
                title: 'Product 2',
                description: { plain_text: 'desc 2' },
                price: 200,
                available_quantity: 5,
                pictures: [],
                attributes: [{ id: 'SELLER_SKU', value_name: 'SKU2' }]
            }
        ];
        mockedAxios.post
            .mockResolvedValueOnce({ data: { id: 'MLA111' } }) // Product 1 success
            .mockRejectedValueOnce({ response: { data: { message: 'Invalid category' } } }); // Product 2 fails
        const report = await service.publishBatch(products);
        expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        // Check if status is paused
        const payload1 = mockedAxios.post.mock.calls[0][1];
        expect(payload1.status).toBe('paused');
        expect(report.total_processed).toBe(2);
        expect(report.successful.length).toBe(1);
        expect(report.successful[0].ml_id).toBe('MLA111');
        expect(report.successful[0].original_sku).toBe('SKU1');
        expect(report.failed.length).toBe(1);
        expect(report.failed[0].original_sku).toBe('SKU2');
        expect(report.failed[0].error).toBe('Invalid category');
    });
    it('should respect rate limiting (batching)', async () => {
        // Generate 25 products
        const products = Array(25).fill(null).map((_, i) => ({
            title: `Prod ${i}`,
            description: { plain_text: 'desc' },
            price: 100,
            available_quantity: 1,
            pictures: [],
            attributes: []
        }));
        mockedAxios.post.mockResolvedValue({ data: { id: 'MLA_TEST' } });
        const startTime = Date.now();
        const report = await service.publishBatch(products);
        const endTime = Date.now();
        expect(mockedAxios.post).toHaveBeenCalledTimes(25);
        expect(report.successful.length).toBe(25);
        // Because it processes 20, then delays 1000ms, then processes 5.
        expect(endTime - startTime).toBeGreaterThanOrEqual(900);
    });
});
//# sourceMappingURL=mercadolibre.service.test.js.map