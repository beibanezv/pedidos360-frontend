# Avance M01–M04 (reparto Benjamín/Matías, plan 2026-11-26)

Estado: ejecutado en local, **sin despliegue AWS**. C1/G0 siguen pendientes de Benjamín;
`environment.prod.ts` queda preparado para actualizar una sola vez con el entorno único.

| Bloque | Commit | Cambio | Verificación |
|---|---|---|---|
| M01 | `48c3953` | `cognito-auth.service` valida `exp` al restaurar y al usar el id_token; limpia sesiones vencidas; `sesionGuard` pregunta `sesionValida()` | 30 tests SUCCESS, build exit 0 |
| M02 | `3569957` | `Idempotency-Key` por operación de checkout, estado `registrando`, reintento acotado de la orden, 409 sin vaciar carrito | 33 tests SUCCESS, build exit 0 |
| M03 | `b25c6bb` | `getProductos()` ya no cae al catálogo mock; Home y Catálogo muestran error + reintento (503 diferenciado) | 33 tests SUCCESS, build exit 0 |
| M04 | `de590b7` | Pool de Cognito desde `environment`, textos de proveedor dual, rutas `/catalogo`, foco visible | 34 tests SUCCESS, build exit 0 |

Comandos (desde `pedidos360-frontend`):

```powershell
npm ci
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm test -- --watch=false --browsers=ChromeHeadless
npm run build -- --configuration production --base-href /desarrollo/
```

Notas para la integración:

- M02 implementa el contrato C2 del lado Angular; Benjamín debe confirmar que el backend
  acepta y persiste `Idempotency-Key` antes de dar por cerrado el checkout.
- M03 elimina el fallback productivo; las pruebas usan respuestas HTTP simuladas, no datos falsos.
- M04 no cambia la identidad visual (tokens, tipografías y efecto de vinilo intactos).
- No se crearon tags nuevos ni se tocó ningún repo de Benjamín.
