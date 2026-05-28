import { MercadoLibreMapper } from '../src/services/mercadolibre.mapper';
import { CustomProduct } from '../src/types';

describe('MercadoLibreMapper', () => {
  let mapper: MercadoLibreMapper;

  beforeEach(() => {
    mapper = new MercadoLibreMapper();
  });

  it('should trim titles intelligently avoiding trailing connectors', () => {
    const mockProduct: CustomProduct = {
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
    const mockProduct: CustomProduct = {
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
    const mockProduct: CustomProduct = {
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
    expect(mlProduct.variations![0].attribute_combinations).toEqual([
      { id: 'COLOR', name: 'Color', value_name: 'Rojo' },
      { id: 'SIZE', name: 'Talle', value_name: 'L' }
    ]);
  });

  it('should format pictures correctly, filter invalid URLs, and preserve cover image order', () => {
    const mockProduct: CustomProduct = {
      id_original: '123',
      titulo: 'Short Title',
      descripcion: 'desc',
      precio: 1500,
      stock: 30,
      imagenes: [
        'https://tiendanube.com/img1.jpg',           // Valid, should be cover
        'http://tiendanube.com/img2.PNG',            // Valid, case insensitive
        'https://tiendanube.com/img3.gif',           // Invalid format
        'ftp://tiendanube.com/img4.jpg',             // Invalid protocol (regex only allows http/https but wait, ftp is handled? Let's check regex: /^https?:\/\/.*\.(jpg|jpeg|png)(\?.*)?$/i)
        'https://tiendanube.com/img5.jpeg?v=123',    // Valid with query
        'not_a_url.jpg',                             // Invalid URL structure
      ],
      variantes: []
    };

    const result = mapper.mapCatalog([mockProduct]);
    const pictures = result.products[0].pictures;

    // Should only keep 3 valid images (img1.jpg, img2.PNG, img5.jpeg?v=123)
    expect(pictures.length).toBe(3);
    
    // Cover image must be the first valid one
    expect(pictures[0].source).toBe('https://tiendanube.com/img1.jpg');
    expect(pictures[1].source).toBe('http://tiendanube.com/img2.PNG');
    expect(pictures[2].source).toBe('https://tiendanube.com/img5.jpeg?v=123');
  });
});
