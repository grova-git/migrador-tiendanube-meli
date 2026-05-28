import { MercadoLibreService } from '../src/services/mercadolibre.service';
import { MercadoLibreProduct } from '../src/services/mercadolibre.mapper';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MercadoLibreService', () => {
  let service: MercadoLibreService;

  beforeEach(() => {
    service = new MercadoLibreService('dummy_ml_token');
    jest.clearAllMocks();
  });

  it('should publish a batch of products and return a report', async () => {
    const products: MercadoLibreProduct[] = [
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
    const payload1 = mockedAxios.post.mock.calls[0][1] as any;
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
    const products: MercadoLibreProduct[] = Array(25).fill(null).map((_, i) => ({
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
