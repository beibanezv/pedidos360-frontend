# Evidencia — WebPay Plus en Pedidos360 (2026-11-24)

Entorno: Learner Lab cuenta `394368726174`, región `us-east-1`, sesión del 2026-11-24.
Sin credenciales ni tokens en este archivo.

## Recursos desplegados

- RDS PostgreSQL `p360-postgres`: bases `pedidos360_pagos`, `pedidos360_productos`, `pedidos360_carrito`, `pedidos360_ordenes`.
- EC2 `p360-core` (`18.212.253.205`): RabbitMQ + ms-productos:8081 + ms-carrito:8082 + ms-login:8083 + ms-orders:8084.
- EC2 `p360-webpay` (`54.144.117.60`): ms-pagos:8089 + frontend nginx:80.
- Cognito: pool `us-east-1_GKASCM5yT`, cliente `3t7gk2dqc29fn1bjgr87j31j81`, usuario de prueba `cliente@pedidos360.cl`.
- API Gateway negocio `w9om0sanri` (30 rutas explícitas, authorizer JWT nativo de Cognito): `https://w9om0sanri.execute-api.us-east-1.amazonaws.com/desarrollo`.
- API Gateway frontend `epko9lnv5a`: `https://epko9lnv5a.execute-api.us-east-1.amazonaws.com/desarrollo/`.
- Transbank modo integración: commerce code `597055555532`, SDK `6.2.1`.

## Matriz verificada

| Prueba | Resultado |
|---|---|
| `GET /productos` sin token | 200 (8 productos) |
| `GET /carrito` sin token | 401 |
| `GET /carrito` con JWT Cognito | 200 |
| `GET /login/me` con JWT Cognito | 200 |
| Frontend HTTPS `/desarrollo/` y `/desarrollo/pago/resultado` | 200 |
| `POST /carrito/items` + `POST /carrito/checkout` con JWT | 201 / 200, orden `5b808825-…`, total 18.990 CLP |
| `POST /pagos/webpay/iniciar` con JWT | 200 → token WebPay + `https://webpay3gint.transbank.cl/webpayserver/initTransaction` |
| `GET /pagos/{ordenId}` tras iniciar | `resultado: PENDIENTE`, total 18.990 |
| `POST /pagos/webpay/retorno?token_ws=…` | 302 → `/pago/resultado?resultado=ERROR` (commit rechazado: la transacción no se completó en la pasarela) |
| Ráfaga de 4 `iniciar` sobre la misma orden | 200, 200, 200, **429** (antifraude reutilizado) |

## Hallazgo corregido en vivo

Transbank rechaza `buyOrder` de más de 26 caracteres (UUID = 36). El backend ahora envía
`"TX" + 22 caracteres del UUID sin guiones` (24 caracteres) y guarda ese mismo valor para
validar el commit. Tras el fix, `iniciar` responde 200 con token y URL de WebPay.

## Limitación conocida

Si Transbank devuelve error en el `commit`, el pago queda en `PENDIENTE` y el retorno redirige
con `resultado=ERROR`. No se aprueba nada, pero la fila no pasa a `RECHAZADO` (mejora pendiente).
