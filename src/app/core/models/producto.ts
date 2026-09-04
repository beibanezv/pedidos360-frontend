/**
 * Modelo de catálogo. Los nombres siguientes al backend de ms-productos
 * (id UUID, nombre, artistaOMarca, precioClp, categoría en minúscula sin tildes).
 * La clase Producto añade getters "visión" para reutilizar el template del home
 * (titulo/artista/precio) y la curaduría visual por categoría (fondo/arte/acento).
 */

export type Categoria = 'vinilo' | 'tornamesa' | 'audifono' | 'amplificador';

export type ArteMock = 'cuadro' | 'circulo' | 'triangulo' | 'amplificador';

/** JSON crudo que devuelve GET /productos de ms-productos. */
export interface ProductoBackend {
  id: string;
  nombre: string;
  artistaOMarca: string;
  categoria: Categoria;
  precioClp: number;
  stock: number;
  descripcion?: string;
}

export const CATEGORIA_LABEL: Record<Categoria, string> = {
  vinilo: 'Vinilos',
  tornamesa: 'Tornamesas',
  audifono: 'Audífonos',
  amplificador: 'Amplificadores',
};

/** Reutiliza las formas/colores del mock original, ahora asignados por categoría. */
export const CATEGORIA_ARTE: Record<Categoria, { fondo: string; arte: ArteMock; acento: string }> = {
  vinilo: { fondo: 'var(--sage)', arte: 'cuadro', acento: 'var(--copper)' },
  tornamesa: { fondo: 'var(--copper-dim)', arte: 'circulo', acento: 'var(--sage)' },
  audifono: { fondo: 'var(--rust)', arte: 'triangulo', acento: 'var(--copper)' },
  amplificador: { fondo: 'var(--panel-2)', arte: 'amplificador', acento: 'var(--sage)' },
};

export class Producto {
  constructor(readonly raw: ProductoBackend) {}

  get id(): string {
    return this.raw.id;
  }
  get titulo(): string {
    return this.raw.nombre;
  }
  get artista(): string {
    return this.raw.artistaOMarca;
  }
  get categoria(): Categoria {
    return this.raw.categoria;
  }
  get precio(): number {
    return this.raw.precioClp;
  }
  get stock(): number {
    return this.raw.stock;
  }
  get descripcion(): string | undefined {
    return this.raw.descripcion;
  }
  get etiqueta(): string {
    return CATEGORIA_LABEL[this.categoria];
  }
  get fondo(): string {
    return CATEGORIA_ARTE[this.categoria].fondo;
  }
  get arte(): ArteMock {
    return CATEGORIA_ARTE[this.categoria].arte;
  }
  get acento(): string {
    return CATEGORIA_ARTE[this.categoria].acento;
  }
}

export function formatPrecio(precio: number): string {
  return '$' + precio.toLocaleString('es-CL');
}