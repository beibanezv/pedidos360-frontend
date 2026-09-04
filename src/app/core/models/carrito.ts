/**
 * Modelos del carrito (ms-carrito). El backend serializa BOTH precioUnitarioClp
 * y su alias precioClp (getter compat), así que el DTO admite ambos.
 */

export interface CarritoItemDTO {
  id: string;
  carritoId: string;
  productoId: string;
  cantidad: number;
  precioUnitarioClp?: number | null;
  precioClp?: number | null;
  agregadoEn?: string;
}

export interface CarritoDTO {
  id: string;
  usuarioId: string;
  createdAt: string;
  items: CarritoItemDTO[];
}

export interface CheckoutDTO {
  carritoId: string;
  usuarioId: string;
  itemsComprados: number;
  totalClp: number;
  estado: string;
}

export function precioItem(item: CarritoItemDTO): number {
  return item.precioUnitarioClp ?? item.precioClp ?? 0;
}

export function cantidadTotal(items: readonly CarritoItemDTO[]): number {
  return items.reduce((acc, i) => acc + i.cantidad, 0);
}

export function totalCarrito(items: readonly CarritoItemDTO[]): number {
  return items.reduce((acc, i) => acc + precioItem(i) * i.cantidad, 0);
}