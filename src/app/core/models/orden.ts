/**
 * Modelos de órdenes (ms-orders). El backend guarda los ítems como JSON
 * serializado (itemsJson); el front solo los cuenta para mostrar.
 */

export interface OrdenDTO {
  /** ms-orders lo devuelve como "ordenId" (ver OrdenController.resumen). */
  ordenId: string;
  usuarioId: string;
  totalClp: number;
  estado: string;
  itemsJson: string;
  createdAt: string;
}

/** Cuenta los ítems de una orden sin romperse si el JSON viene raro. */
export function cantidadItemsOrden(orden: OrdenDTO): number {
  try {
    const items = JSON.parse(orden.itemsJson) as { cantidad?: number }[];
    if (!Array.isArray(items)) return 0;
    return items.reduce((acc, i) => acc + (i.cantidad ?? 1), 0);
  } catch {
    return 0;
  }
}
