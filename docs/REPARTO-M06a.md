# M06a — Topología Rabbit C3/C4 (2026-11-27)

Contrato: `respuesta-a-matias.md` §(a), aprobación G0 de Benjamín del 2026-11-27.
Estado: **solo topología**; PR abiertos, sin merge a `main`, sin despliegue y sin cambios en `environment.prod.ts`.

| Repo | Rama / commit | Verificación |
|---|---|---|
| `pedidos360-ms-productos` | `feature/matias-M06a-topologia` → `133c799` | 21 tests, 0 fallos; package OK |
| `pedidos360-ms-orders` | `feature/matias-M06a-topologia` → `b29473c` | 20 tests, 0 fallos; package OK |

## Colas declaradas

| Routing key | Cola | DLQ | Repo |
|---|---|---|---|
| `stock.liberado` | `p360.liberaciones.stock.queue` | `p360.liberaciones.stock.dlq` | productos |
| `stock.reservado`, `stock.rechazado` | `p360.reservas.ordenes.queue` | `p360.reservas.ordenes.dlq` | orders |
| `pago.resuelto` | `p360.pagos.ordenes.queue` | `p360.pagos.ordenes.dlq` | orders |

- Exchanges existentes: `p360.eventos` (topic) y `p360.dlx` (direct). No se crearon exchanges nuevos ni tópicos Kafka nuevos.
- Colas durables con `x-dead-letter-exchange=p360.dlx` y `x-dead-letter-routing-key` igual al nombre de la cola.
- No se purgaron colas ni se modificaron las existentes (`p360.stock.queue`, `p360.ordenes.queue`, colas de notificaciones/auditoría/cupones).
- Constantes centralizadas en los `RabbitMQConfig`.

## Fuera de este bloque (Benjamín)

- DTOs `StockReservadoEvent`, `StockRechazadoEvent`, `StockLiberadoEvent`, `PagoResueltoEvent` y sus consumidores.
- Publicación de `pago.resuelto` desde `ms-pagos` (ese repo no tiene `RabbitMQConfig` propio bajo mi propiedad).
- Persistencia `reservas_stock`, `productos_outbox`, estados de `ordenes`, `ordenes_outbox`, fases de saga y `pagos_outbox_rabbit`.
- Casos 16–22 del contrato y despliegue/operación AWS.

## C1

`environment.prod.ts` **no se modificó**: el contrato indica que Benjamín arma el environment desplegado desde el manifiesto C1 y prohíbe mezclar los literales del lab mínimo con los de C1.
