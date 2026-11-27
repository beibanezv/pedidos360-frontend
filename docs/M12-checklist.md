# M12 — Checklist de regresión UI e integración final

> **Preparado el 2026-11-27. NO EJECUTADO.** Este documento es el guion para la sesión de
> verificación en navegador; ninguna casilla se marca como aprobada sin evidencia del entorno C1.
> Estado previo: login Microsoft y Cognito verificados; compra pequeña y pago WebPay **APROBADO en
> C1** (orden `1720e01f…`, $15.990, 2026-11-27); M07/M08/WSS/Dynamo no desplegados; M09 solo con
> evidencia local. El intento previo con `{"message":"Not Found"}` queda por reconciliar.

## Condiciones para ejecutarlo

- Entorno C1 estable y con el bundle `main-VOAE35FQ.js` sirviéndose desde `vnvm0n7p9a`.
- Sesiones reales disponibles: cuenta Cliente (Cognito) y cuenta Entra Admin.
- Navegador con los dos anchos: **390 px** y **1280 px**.
- Sin credenciales, tokens ni correos en capturas o documentos.

## Matriz a ejecutar

| # | Escenario | Resultado esperado | Estado |
|---|---|---|---|
| 1 | `GET /desarrollo/productos` sin sesión | 200 con 8 productos; sin errores JS | pendiente C1 |
| 2 | Catálogo y ficha de producto | Datos reales del backend; si falla la API se ve error + reintento, nunca catálogo mock | cubierto por tests unitarios; pendiente navegador |
| 3 | Recomendaciones | Similares por categoría de la última ficha vista; omite vistos y sin stock | pendiente navegador |
| 4 | Carrito: agregar, cambiar cantidad, quitar | Total calculado por el servidor; precio manipulado no altera el total | pendiente navegador |
| 5 | Email/cupón en checkout | Acepta correo del token o lo pide; cupón válido aplica descuento | pendiente navegador |
| 6 | Doble clic y reintento tras timeout | Un solo `ordenId`, misma `Idempotency-Key`; botón deshabilitado durante el registro | cubierto por tests (M02); pendiente con backend real |
| 7 | `/ordenes` y pertenencia | Usuario A no ve órdenes de B; estados coherentes con C4 | pendiente C1 |
| 8 | Pago WebPay | `iniciar` devuelve token/URL; resultado leído desde `GET /pagos/{id}`, nunca desde `?resultado=` de la URL | ✅ APROBADO en C1 (orden `1720e01f…`, $15.990); resta probar rechazo/abandono |
| 9 | Ráfaga de pagos | Cuarto intento en menos de 10 s → 429 con mensaje claro | verificado en local; pendiente C1 |
| 10 | `/cuenta` con Azure y con Cognito | Claims visibles; Cognito con `token_use="id"` | ✅ verificado 2026-11-27 |
| 11 | Login/logout y expiración | Sin bucle de redirección; token vencido se limpia y pide reingreso | cubierto por tests (M01); pendiente navegador |
| 12 | Consola y red | Sin 401 inesperados, mixed content, CORS fallido ni URLs de otro lab | pendiente |
| 13 | Comportamiento eventual | Navegación → evento → historial → recomendación; pago → evento → métrica | pendiente de M07/WSS desplegados |
| 14 | 390 px y 1280 px | Sin desbordes; foco visible y tabulación correcta | pendiente |
| 15 | Backend caído | Error visible; sin productos mock ni aprobación inventada | cubierto por tests (M03); pendiente navegador |

## Bloqueos conocidos

- La compra pequeña en C1 se ejecutó con pago WebPay aprobado; el rechazo y el abandono siguen sin probarse en navegador.
- El intento previo que terminó en `{"message":"Not Found"}` debe ser reconciliado por Benjamín en Transbank antes de dar por cerrado el cobro; su token no se documenta.
- M07/M08 están como código listo en ramas; orders/analytics desplegados siguen con JAR histórico del 22-11.
- No hay URL `wss://…/ws/metricas` ni tabla DynamoDB aprovisionada: los puntos 13 y parte del 15 no se pueden cerrar hoy.
- La evidencia Kafka cloud (M09) requiere sesión de lab nueva; solo existe la local.

## Cierre

Al ejecutar, anotar fecha, cuenta, SHA del bundle, código HTTP observado y enlace a la captura.
Marcar los bloqueos resueltos solo cuando haya evidencia. Después, ensayo individual de 5–10 min
con respaldo de 90 s por bloque; EP6 es individual y ambos deben defender el sistema completo.
