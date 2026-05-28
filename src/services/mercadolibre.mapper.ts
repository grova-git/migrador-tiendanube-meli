import { CustomProduct } from '../types';

export interface MercadoLibreProduct {
  title: string;
  description: { plain_text: string };
  price: number;
  available_quantity: number;
  pictures: { source: string }[];
  attributes: any[];
  variations?: MercadoLibreVariation[];
}

export interface MercadoLibreVariation {
  price: number;
  available_quantity: number;
  attribute_combinations: { id: string; name: string; value_id?: string; value_name: string }[];
  attributes?: any[];
  picture_ids?: string[];
}

export interface MapperResult {
  products: MercadoLibreProduct[];
  audit: {
    total_processed: number;
    titles_trimmed: number;
  };
}

export class MercadoLibreMapper {
  public mapCatalog(products: CustomProduct[]): MapperResult {
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
      let variations: MercadoLibreVariation[] | undefined = undefined;
      
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

      const mlProduct: MercadoLibreProduct = {
        title: finalTitle,
        description: { plain_text: cleanDescription },
        price: product.precio,
        available_quantity: product.stock,
        pictures: this.processPictures(product.imagenes || []),
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

  private trimTitleIntelligently(title: string, maxLength: number): string {
    if (title.length <= maxLength) return title;
    
    // Connectors and secondary words to remove if they are at the end
    const connectors = ['y', 'de', 'con', 'para', 'a', 'o', 'el', 'la', 'los', 'las'];
    
    let words = title.split(' ');
    let currentLength = 0;
    let keepWords: string[] = [];

    for (const word of words) {
      const spaceLen = keepWords.length > 0 ? 1 : 0;
      if (currentLength + word.length + spaceLen <= maxLength) {
        keepWords.push(word);
        currentLength += word.length + spaceLen;
      } else {
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

  private cleanDescriptionForML(description: string): string {
    let text = description.replace(/<[^>]*>?/gm, ''); // Remove stray HTML tags
    text = text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ''); // Remove URLs
    // Optional: remove css leftovers if any exist like style={...}
    text = text.replace(/style="[^"]*"/g, '');
    text = text.replace(/class="[^"]*"/g, '');
    return text.trim();
  }

  private processPictures(images: string[]): { source: string }[] {
    if (!images || images.length === 0) return [];
    
    // Regex to validate URL and ensure it ends with .jpg, .jpeg, or .png
    // It also accounts for possible query parameters at the end.
    const validImageRegex = /^https?:\/\/.*\.(jpg|jpeg|png)(\?.*)?$/i;

    const validPictures = images
      .filter(img => validImageRegex.test(img))
      .map(img => ({ source: img }));

    // The order is naturally preserved by .filter and .map, ensuring the first 
    // valid image is the cover picture for Mercado Libre.
    return validPictures;
  }
}
