import { MercadoLibreProduct } from './mercadolibre.mapper';
export interface PublishReport {
    successful: {
        original_sku?: string;
        ml_id: string;
        title: string;
    }[];
    failed: {
        original_sku?: string;
        title: string;
        error: string;
    }[];
    total_processed: number;
}
export declare class MercadoLibreService {
    private accessToken;
    private categoryId;
    private currencyId;
    private buyingMode;
    private condition;
    private listingTypeId;
    constructor(accessToken: string);
    publishBatch(products: MercadoLibreProduct[]): Promise<PublishReport>;
    private publishSingleProduct;
}
//# sourceMappingURL=mercadolibre.service.d.ts.map