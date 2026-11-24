# ToDo — Integración WebPay Plus en Pedidos360 (extra +5 de EP5/EP6)

**Inicio:** 2026-11-24 · **Estado:** FASE 1 EN CURSO · **Responsable:** agente + usuario

## Reglas de trabajo (obligatorias)

1. **Antes de pasar al siguiente paso:** verificar lo implementado (tests, build o curl) y hacer commit de los avances en la rama `feature/webpay`.
2. Commits en español, línea de asunto corta e imperativa. Nunca trabajar directo en `main`.
3. No escribir credenciales AWS, API keys reales de Transbank ni datos de tarjeta (PAN/CVV) en ningún repo.
4. Antifraude: se reutiliza el de `ms-pagos` (Postgres, 4º intento/10 s). **No** se crea el tópico `payment-attempts` del material.
5. Transbank: solo modo integración (`597055555532` + `IntegrationApiKeys.WEBPAY`). Sin secretos.
6. Si la sesión de Learner Lab se acerca a su fin, parar en la última fase verificada y documentar el estado real.

---

## Fase 0 — Preparación

- [x] 0.1 Crear este archivo ToDo y dejarlo versionado (copia commiteada en `pedidos360-frontend/docs/TODO-WEBPAY.md`).
- [ ] 0.2 Verificar cuenta y tiempo de sesión de AWS: `aws sts get-caller-identity`. **(pendiente: STS aún no respondió; needs credenciales en ~/.aws/credentials)**
- [ ] 0.3 Configurar `~/.aws/credentials` (fuera de los repos; el usuario pegó las credenciales en chat, no se guardan aquí). **(pendiente)**
- [x] 0.4 Revisar `git status` de los 12 repos: los 9 con remoto estaban limpios; se hizo `fetch + pull --ff-only` en todos (frontend 66c83f6, admin 31acce0, carrito 3a67771, orders 6f03a42, productos 5accc54). Los 3 que no tenían `.git` se crearon desde el workspace de contexto y se commitearon.
- [x] 0.5 Crear rama `feature/webpay` en `pedidos360-ms-pagos` y `pedidos360-frontend`.
- [x] 0.6 Verificación: archivos clave de los 9 repos pulled son idénticos a los del contexto; ningún repo tiene secretos trackeados.
- **Commit checkpoint:** `pedidos360-frontend` `15a07be` "agrega ToDo de implementacion de WebPay"; nuevos repos locales: ms-pagos `4c63770`, analytics `0c026b7`, lambda `d071c40`.

## Fase 1 — Backend `pedidos360-ms-pagos`

- [x] 1.1 `pom.xml`: agregado `transbank-sdk-java:6.2.1` (API verificada con `javap`: `buildForIntegration`, `create`, `commit`).
- [x] 1.2 `application.properties`: variables `WEBPAY_COMMERCE_CODE`, `WEBPAY_API_KEY` (vacía = `IntegrationApiKeys.WEBPAY`), `WEBPAY_RETURN_URL`, `FRONTEND_ORIGIN`.
- [x] 1.3 `WebpayClient` + `TransbankWebpayClient` con records propios (`Crear`, `Confirmar`) para testear sin Transbank.
- [x] 1.4 `Pago.java`: campos `tokenWebpay` (único), `buyOrder`, valor `PENDIENTE` y getters/setters.
- [x] 1.5 `PagoService`: `verificar()` reutiliza el antifraude (4º intento/10 s → 429), `iniciarWebpay()` guarda PENDIENTE, `confirmarWebpay()` valida buyOrder/sessionId/amount antes de APROBADO/RECHAZADO.
- [x] 1.6 `PagoOutbox`: omite PENDIENTE sin cambiar la firma del repositorio.
- [x] 1.7 `PagoController`: `POST /webpay/iniciar` y `POST /webpay/retorno` (302 a `/pago/resultado`); `GET /pagos/{ordenId}` intacto.
- [x] 1.8 `IdentityConfig`: `permitAll` para el retorno y OPTIONS; CORS con origen exacto y método OPTIONS.
- [x] 1.9 Tests nuevos: 8 en controller (incluye inicio, 429 y ambos retornos), 4 de servicio, 1 de outbox. Workaround `src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker` con `SubclassByteBuddyMockMaker` porque el JDK instalado es 25 y el inline maker de Mockito no puede instrumentar.
- [x] 1.10 Verificación: `mvn test` → **17 tests, 0 fallos, 0 errores, 4 saltados** (los 4 requieren Postgres/Kafka por variable de entorno). `BUILD SUCCESS`.
- [ ] 1.11 Verificación manual con Docker: **movida a Fase 3** (Docker Desktop estaba apagado al cerrar esta fase).
- **Commit checkpoint:** `feature/webpay` en `pedidos360-ms-pagos` → `76a9bb2` "agrega pago con WebPay Plus al microservicio de pagos".

## Fase 2 — Frontend Angular

- [x] 2.1 `PagoService`: `iniciar(ordenId)` y `consultar(ordenId)` con base `useGateway ? apiUrl : pagosUrl`.
- [x] 2.2 `src/app/pago/pago.*`: ruta `/pago/:ordenId` con `sesionGuard`; botón y auto-POST de formulario con `token_ws`; mensaje específico para 429.
- [x] 2.3 `src/app/pago/resultado.*`: ruta `/pago/resultado`, consulta `GET /pagos/{ordenId}` con los interceptores existentes (estado auténtico, no el query param).
- [x] 2.4 `carrito.html/ts`: tras el checkout se guardan `ordenId`/`totalClp` y aparece el CTA "Pagar con WebPay".
- [x] 2.5 `app.routes.ts`: `/pago/resultado` antes que `/pago/:ordenId`; estilos con los tokens del mockup.
- [x] 2.6 Tests Angular nuevos: `pago.service.spec.ts` (2) y `resultado.spec.ts` (1).
- [x] 2.7 Verificación: `ng build --configuration production` exit 0; `ng test --watch=false --browsers=ChromeHeadless` → **25/25 SUCCESS** (antes 22). `npm ci` instaló dependencias. Se agregó `ng-*.log` al `.gitignore`.
- **Commit checkpoint:** `feature/webpay` en `pedidos360-frontend` con mensaje "agrega pantallas de pago WebPay y resultado".

## Fase 3 — Verificación local end-to-end

- [x] 3.1 Docker Desktop arrancado y Postgres de pagos levantado (`docker compose up -d` en ms-pagos).
- [x] 3.2 `mvn package` (online, para bajar plugins) y ms-pagos arrancado en 8089 con `Start-Process java -jar`; verificado `Started PagosApplication`.
- [x] 3.3 Smoke test local: `POST /webpay/retorno` sin token → **302** a `/pago/resultado?resultado=ERROR`; `GET /pagos/{id}` y `POST /webpay/iniciar` sin JWT → **401**.
- [x] 3.4 SDK contra Transbank integración (jshell, sin JWT): `create()` devolvió token y `https://webpay3gint.transbank.cl/webpayserver/initTransaction`. El `returnUrl` localhost fue aceptado.
- [ ] 3.5 Flujo completo con JWT real (checkout → orden → WebPay → commit): se hará en AWS (Fase 4), donde se creará el pool Cognito. Requiere sesión browser autenticada; no se pudo simular con token válido en local.
- [ ] 3.6 Ráfaga de 3 peticiones autenticadas → 429 y pago rechazado con Mastercard: queda para la verificación en vivo de Fase 4 (los equivalentes unitarios ya pasan).
- [ ] 3.7 Guardar capturas en `evidencia-local/` y actualizar su README (se hará con la evidencia AWS).
- **Commit checkpoint:** sin cambios de código en esta fase; ToDo actualizado en el frontend.

## Fase 4 — AWS (lab vacío, con time-box)

- [x] 4.1 RDS `p360-postgres` creada con 4 bases (pagos, productos, carrito, ordenes).
- [x] 4.2 EC2 `p360-core` (Rabbit + productos/carrito/login/orders) y `p360-webpay` (pagos + nginx). **Despliegue mínimo**: no se levantaron analytics, cupones, notificaciones, auditoría ni admin.
- [x] 4.3 Gateway negocio `w9om0sanri` con 30 rutas explícitas (cero proxy) y Gateway frontend `epko9lnv5a` con HTTPS y SPA fallback.
- [x] 4.4 Cognito pool `us-east-1_GKASCM5yT` + cliente + usuario `cliente@pedidos360.cl`. Authorizer JWT **nativo de Cognito** (no se desplegó la Lambda dual: no alcanzó el tiempo; Azure no autentica en este despliegue mínimo).
- [x] 4.5 Rutas WebPay: `POST /pagos/webpay/iniciar` con JWT y `POST /pagos/webpay/retorno` sin JWT (302 al frontend).
- [x] 4.6 `WEBPAY_RETURN_URL` apunta al retorno del Gateway; `FRONTEND_ORIGIN` al origin HTTPS exacto.
- [x] 4.7 Frontend compilado con `--base-href /desarrollo/` y nuevo pool; nginx con `try_files` (fallback SPA).
- [x] 4.8 Matriz verificada: catálogo 200, sin token 401, carrito/login con token 200, frontend 200.
- [x] 4.9 Flujo real: checkout → orden 18.990 CLP → `iniciar` 200 con token y URL de Transbank; `GET /pagos/{id}` = PENDIENTE; retorno 302 con ERROR (commit no completado en pasarela).
- [x] 4.10 Antifraude en vivo: 3 intentos 200, 4º **429**. Evidencia en `docs/evidencias-webpay.md`.
- **Commit checkpoint:** `environment.prod.ts` y evidencia en frontend; fix `buyOrder` en ms-pagos.

> Pendiente por tiempo: pago APROBADO de punta a punta requiere completar el formulario de tarjeta en el navegador de Transbank (no automatizable con curl); Lambda dual para Azure; WSS; servicios EP4/EP5 no desplegados en este lab.

## Fase 5 — Cierre y entrega

- [ ] 5.1 README de `ms-pagos`: documentar endpoints WebPay y tarjetas de prueba.
- [ ] 5.2 `ESTADO-EP5-EP6.md`: WebPay pasa de "no incluido" a "implementado y verificado (local/AWS)".
- [ ] 5.3 `guion-defensa-ep6.md`: punto WebPay y decisiones (retorno en backend, antifraude reutilizado).
- [ ] 5.4 Tags MINOR: `ms-pagos v1.1.0`, frontend `v1.6.0`; corregir tags desactualizados de los otros repos.
- [ ] 5.5 Push de los commits pendientes (usuario, por permisos de GitHub).
- [ ] 5.6 AVA + correo con los 12 enlaces (usuario).
- **Commit checkpoint:** documentación final.

---

## Registro de avances

| Fecha | Fase | Qué se completó | Commit / verificación |
|---|---|---|---|
| 2026-11-24 | 0 | ToDo creado; pull de los 9 repos; 3 repos nuevos creados desde el contexto | frontend `15a07be`, ms-pagos `4c63770`, analytics `0c026b7`, lambda `d071c40` |
| 2026-11-24 | 1 | Backend WebPay (SDK, servicio, controller, retorno, tests) | ms-pagos `76a9bb2`; `mvn test` 17/0/0 (4 saltados) |
| 2026-11-24 | 2 | Angular: servicio, página de pago, resultado, CTA en carrito, tests | frontend `25/25 SUCCESS`, build OK |
| 2026-11-24 | 3 | Smoke local (302/401) + SDK Transbank integración verificado (token + URL) | ms-pagos arrancó en 8089; E2E con JWT queda para AWS |
