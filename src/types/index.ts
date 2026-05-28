export interface CustomProduct {
  id_original: string | number;
  titulo: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagenes: string[];
  variantes: Variant[];
}

export interface Variant {
  talle: string | null;
  color: string | null;
  stock: number;
  sku: string;
}
