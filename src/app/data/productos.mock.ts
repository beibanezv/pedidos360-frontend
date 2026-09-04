/**
 * Catálogo de respaldo (offline/dev sin backend o sin Gateway).
 * El ProductoService lo usa como fallback si la API no es alcanzable.
 * Ya no se exportan tipos: viven en core/models/producto.ts.
 */
import type { ProductoBackend } from '../core/models/producto';

export const PRODUCTOS_FALLBACK: ProductoBackend[] = [
  { id: 'mock-1', nombre: 'Horizonte', artistaOMarca: 'Trío Marejada — LP', categoria: 'vinilo', precioClp: 18990, stock: 12, descripcion: 'Prensado en calidad audiófila.' },
  { id: 'mock-2', nombre: 'Tornamesa C-40', artistaOMarca: 'Serie artesanal', categoria: 'tornamesa', precioClp: 189990, stock: 5, descripcion: 'Belt-drive, brazo de carbono.' },
  { id: 'mock-3', nombre: 'Auriculares Séptimo', artistaOMarca: 'Madera y cobre', categoria: 'audifono', precioClp: 79990, stock: 8, descripcion: 'Cerrados, impedancia 32Ω.' },
  { id: 'mock-4', nombre: 'Amplificador MK II', artistaOMarca: 'Edición limitada · válvulas', categoria: 'amplificador', precioClp: 249990, stock: 3, descripcion: 'Válvulas EL34, 2x40W.' },
  { id: 'mock-5', nombre: 'Costera EP', artistaOMarca: 'Banda del Puerto', categoria: 'vinilo', precioClp: 15990, stock: 20, descripcion: 'EP en vinilo color.' },
  { id: 'mock-6', nombre: 'Nocturno', artistaOMarca: 'Ana Volant — LP', categoria: 'vinilo', precioClp: 19990, stock: 15, descripcion: 'LP 180g con sleeve impreso.' },
  { id: 'mock-7', nombre: 'Tornamesa R-2', artistaOMarca: 'Portátil · belt-drive', categoria: 'tornamesa', precioClp: 99990, stock: 6, descripcion: 'Batería integrada, USB out.' },
  { id: 'mock-8', nombre: 'Monitores Estudio 5', artistaOMarca: 'Par activo', categoria: 'audifono', precioClp: 129990, stock: 4, descripcion: 'Bi-amplificados, 5".' },
];