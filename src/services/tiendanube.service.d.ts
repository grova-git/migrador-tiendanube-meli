import { CustomProduct } from '../types';
export declare class TiendanubeService {
    private accessToken;
    private storeId;
    private userAgent;
    constructor(accessToken: string, storeId: string, appName: string, email: string);
    getProducts(): Promise<CustomProduct[]>;
    mapProduct(product: any): CustomProduct;
}
//# sourceMappingURL=tiendanube.service.d.ts.map