import axios from 'axios';
import { convert } from 'html-to-text';
import { CustomProduct, Variant } from '../types';

export class TiendanubeService {
  private accessToken: string;
  private storeId: string;
  private userAgent: string;

  constructor(accessToken: string, storeId: string, appName: string, email: string) {
    this.accessToken = accessToken;
    this.storeId = storeId;
    this.userAgent = `${appName} (${email})`;
  }

  async getProducts(): Promise<CustomProduct[]> {
    try {
      const response = await axios.get(`https://api.tiendanube.com/v1/${this.storeId}/products`, {
        headers: {
          'Authentication': `bearer ${this.accessToken}`,
          'User-Agent': this.userAgent,
        },
      });

      const tiendanubeProducts = response.data;
      return tiendanubeProducts.map((product: any) => this.mapProduct(product));
    } catch (error) {
      console.error('Error fetching products from Tiendanube:', error);
      throw error;
    }
  }

  public mapProduct(product: any): CustomProduct {
    const imagenes = product.images ? product.images.map((img: any) => img.src) : [];
    
    // Clean description HTML
    let descripcion = '';
    if (product.description && product.description.es) {
      descripcion = convert(product.description.es, {
        wordwrap: false
      });
    }

    // Default title from Spanish
    const titulo = product.name && product.name.es ? product.name.es : '';

    let precio = 0;
    let totalStock = 0;
    const variantes: Variant[] = [];

    // Find indices for Talle and Color
    let talleIndex = -1;
    let colorIndex = -1;

    if (product.attributes && Array.isArray(product.attributes)) {
      product.attributes.forEach((attr: any, index: number) => {
        const attrName = attr.es ? attr.es.toLowerCase() : '';
        if (attrName.includes('talle') || attrName.includes('tamaño') || attrName.includes('size')) {
          talleIndex = index;
        } else if (attrName.includes('color')) {
          colorIndex = index;
        }
      });
    }

    if (product.variants && Array.isArray(product.variants)) {
      if (product.variants.length > 0) {
        precio = parseFloat(product.variants[0].price) || 0;
      }

      product.variants.forEach((v: any) => {
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
            if (v.values.length > 0) talle = v.values[0].es || v.values[0];
            if (v.values.length > 1) color = v.values[1].es || v.values[1];
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
