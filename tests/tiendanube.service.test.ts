import { TiendanubeService } from '../src/services/tiendanube.service';

describe('TiendanubeService - JSON Transformation', () => {
  let service: TiendanubeService;

  beforeEach(() => {
    service = new TiendanubeService('dummy_token', '12345', 'App', 'test@test.com');
  });

  it('should correctly map a Tiendanube product to CustomProduct format', () => {
    const mockProduct = {
      id: 987654,
      name: { es: 'Remera Estampada' },
      description: { es: '<p>Remera de <strong>algodón</strong> muy linda.</p>' },
      attributes: [
        { es: 'Color' },
        { es: 'Talle' }
      ],
      variants: [
        {
          id: 111,
          price: '2500.00',
          stock: 15,
          sku: 'REM-BLA-M',
          values: [
            { es: 'Blanco' },
            { es: 'M' }
          ]
        },
        {
          id: 222,
          price: '2500.00',
          stock: 5,
          sku: 'REM-BLA-L',
          values: [
            { es: 'Blanco' },
            { es: 'L' }
          ]
        }
      ],
      images: [
        { src: 'http://example.com/img1.jpg' },
        { src: 'http://example.com/img2.jpg' }
      ]
    };

    const result = service.mapProduct(mockProduct);

    expect(result).toEqual({
      id_original: 987654,
      titulo: 'Remera Estampada',
      descripcion: 'Remera de algodón muy linda.',
      precio: 2500,
      stock: 20, // 15 + 5
      imagenes: [
        'http://example.com/img1.jpg',
        'http://example.com/img2.jpg'
      ],
      variantes: [
        {
          color: 'Blanco',
          talle: 'M',
          stock: 15,
          sku: 'REM-BLA-M'
        },
        {
          color: 'Blanco',
          talle: 'L',
          stock: 5,
          sku: 'REM-BLA-L'
        }
      ]
    });
  });

  it('should handle products with no variants properly', () => {
    const mockProduct = {
      id: 123,
      name: { es: 'Taza' },
      description: { es: 'Taza de cerámica' },
      variants: [],
      images: []
    };

    const result = service.mapProduct(mockProduct);

    expect(result.id_original).toBe(123);
    expect(result.precio).toBe(0);
    expect(result.stock).toBe(0);
    expect(result.variantes).toEqual([]);
    expect(result.imagenes).toEqual([]);
  });
});
