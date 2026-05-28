import { CustomProduct } from '../types';
export interface MercadoLibreProduct {
    title: string;
    description: {
        plain_text: string;
    };
    price: number;
    available_quantity: number;
    pictures: {
        source: string;
    }[];
    attributes: any[];
    variations?: MercadoLibreVariation[];
}
export interface MercadoLibreVariation {
    price: number;
    available_quantity: number;
    attribute_combinations: {
        id: string;
        name: string;
        value_id?: string;
        value_name: string;
    }[];
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
export declare class MercadoLibreMapper {
    mapCatalog(products: CustomProduct[]): MapperResult;
    private trimTitleIntelligently;
    private cleanDescriptionForML;
}
//# sourceMappingURL=mercadolibre.mapper.d.ts.map