/**
 * SIMPLIFICADO: catálogo mockeado hasta que ms-productos exista (fase 3 del plan).
 * Upgrade: reemplazar por HttpClient contra /productos a través del Gateway.
 */
export type Categoria = 'Vinilos' | 'Tornamesas' | 'Audífonos' | 'Amplificadores';
export type ArteMock = 'cuadro' | 'circulo' | 'triangulo' | 'amplificador';

export interface Producto {
  id: number;
  titulo: string;
  artista: string;
  categoria: Categoria;
  precio: number; // CLP
  fondo: string; // color del arte de la carátula
  arte: ArteMock;
  acento: string; // color de la etiqueta del vinilo que asoma
}

export const CATEGORIAS: readonly Categoria[] = ['Vinilos', 'Tornamesas', 'Audífonos', 'Amplificadores'];

export const PRODUCTOS_MOCK: Producto[] = [
  { id: 1, titulo: 'Horizonte', artista: 'Trío Marejada — LP', categoria: 'Vinilos', precio: 18990, fondo: 'var(--sage)', arte: 'cuadro', acento: 'var(--copper)' },
  { id: 2, titulo: 'Tornamesa C-40', artista: 'Serie artesanal', categoria: 'Tornamesas', precio: 189990, fondo: 'var(--copper-dim)', arte: 'circulo', acento: 'var(--sage)' },
  { id: 3, titulo: 'Auriculares Séptimo', artista: 'Madera y cobre', categoria: 'Audífonos', precio: 79990, fondo: 'var(--rust)', arte: 'triangulo', acento: 'var(--copper)' },
  { id: 4, titulo: 'Amplificador MK II', artista: 'Edición limitada · válvulas', categoria: 'Amplificadores', precio: 249990, fondo: 'var(--panel-2)', arte: 'amplificador', acento: 'var(--sage)' },
  { id: 5, titulo: 'Costera EP', artista: 'Banda del Puerto', categoria: 'Vinilos', precio: 15990, fondo: 'var(--copper-dim)', arte: 'circulo', acento: 'var(--copper)' },
  { id: 6, titulo: 'Nocturno', artista: 'Ana Volant — LP', categoria: 'Vinilos', precio: 19990, fondo: 'var(--rust)', arte: 'cuadro', acento: 'var(--sage)' },
  { id: 7, titulo: 'Tornamesa R-2', artista: 'Portátil · belt-drive', categoria: 'Tornamesas', precio: 99990, fondo: 'var(--panel-2)', arte: 'circulo', acento: 'var(--copper)' },
  { id: 8, titulo: 'Monitores Estudio 5', artista: 'Par activo', categoria: 'Audífonos', precio: 129990, fondo: 'var(--copper-dim)', arte: 'amplificador', acento: 'var(--sage)' },
];

export function formatPrecio(precio: number): string {
  return '$' + precio.toLocaleString('es-CL');
}
