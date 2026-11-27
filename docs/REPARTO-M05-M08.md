# Avance M05–M08 (reparto Benjamín/Matías, plan 2026-11-26)

Estado: **código y pruebas locales listos; PR abiertos en beibanezv, sin merge a `main` y sin despliegue AWS/Azure**.
M06a (colas/bindings `stock.reservado/rechazado/liberado`) sigue esperando C3/C4.

| Bloque | Rama / commit | Cambio | Verificación |
|---|---|---|---|
| M05 | `feature/matias-M05-interacciones` — productos `54374a7`, carrito `d656c19` | Outbox de interacciones: se persiste antes de publicar y se marca tras el ACK | productos 19 tests, carrito 21; 0 fallos; package OK |
| M06b | `feature/matias-M06b-retry` (5 repos) | `BaseConsumer` reintenta 3 veces con 1 s en el mismo delivery y envía a DLQ; sin `requeue=true` | productos 19, orders 15, notificaciones 11, auditoría 6, cupones 18; 0 fallos; package OK |
| M07 | `feature/matias-M07-dynamodb` — `6da1231` | `DynamoDbHistorial` con inserción condicional por `eventoId`; archivo antes de la proyección PostgreSQL | analytics 15 ejecutadas, 0 fallidas, 5 omitidas (recursos reales) |
| M08 | `feature/matias-M08-wss` — analytics `0366bf8`, frontend `331cfe0` | Origen permitido, ticket de un uso/30 s, cuatro métricas, panel con reintentos acotados | analytics 13/0/0 (4 omitidas); frontend 35/35; build OK |

Notas para integración:

- Se agregó `src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker` en los repos Java
  tocados: el JDK local es 25 y el mock maker inline de Mockito no puede instrumentar. Es solo
  infraestructura de prueba; no cambia código de producción.
- M07 agrega `software.amazon.awssdk:dynamodb:2.25.70` al POM de analytics (repo propiedad de Matías).
  La tabla, región, permisos y el terminador WSS los provisiona Benjamín (C5/C6).
- La espera de reintento se puede acortar en pruebas con `-Dp360.retry.espera-ms=0`.
- `environment.metricasWsUrl` sigue vacío: el código está listo, pero no se afirma WSS desplegado.
- Ningún bloque hace merge en `main` ni crea tags nuevos.
