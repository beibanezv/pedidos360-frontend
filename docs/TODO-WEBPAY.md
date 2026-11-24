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

- [ ] 2.1 `src/app/services/pago.service.ts`: `iniciar(ordenId)` con base `useGateway ? apiUrl : pagosUrl`.
- [ ] 2.2 `src/app/pago/` (componente + HTML + CSS): ruta `/pago/:ordenId` con `sesionGuard`, botón "Pagar con WebPay", auto-POST oculto a la URL de Transbank con `token_ws`.
- [ ] 2.3 `src/app/pago/resultado.*`: ruta `/pago/resultado`, lee `ordenId` de query y consulta `GET /pagos/{ordenId}` con los interceptores existentes.
- [ ] 2.4 `carrito.html/ts`: CTA "Pagar con WebPay" tras el checkout apuntando a `/pago/{ordenId}?total=…`.
- [ ] 2.5 `app.routes.ts`: registrar las dos rutas nuevas. Estilos con los tokens del mockup (sin CSS inline azul del material).
- [ ] 2.6 Tests Angular: servicio y componente de resultado.
- [ ] 2.7 Verificación: `ng test` y `ng build` (production) sin errores.
- **Commit checkpoint:** `feature/webpay` en `pedidos360-frontend` con mensaje "agrega pantallas de pago WebPay y resultado".

## Fase 3 — Verificación local end-to-end

- [ ] 3.1 Docker: Postgres pagos (5439), clúster Kafka (9092-9094 + UI 8091) y RabbitMQ (2 nodos).
- [ ] 3.2 Arrancar ms-orders (8084), ms-pagos (8089) y `ng serve` (4200).
- [ ] 3.3 Flujo real local: checkout → orden → `/pago/:ordenId` → WebPay con tarjeta VISA aprobada.
- [ ] 3.4 Flujo rechazado con Mastercard y ráfaga de 3 peticiones → 429, sin eventos publicados.
- [ ] 3.5 Confirmar resultado final en `GET /pagos/{ordenId}` y mensaje en `p360.pagos.v1`.
- [ ] 3.6 Guardar capturas en `evidencia-local/` y actualizar su README.
- [ ] 3.7 Verificación: matriz local 200/429 + pago aprobado/rechazado visible.
- **Commit checkpoint:** evidencias y ajustes menores en los repos correspondientes.

## Fase 4 — AWS (lab vacío, con time-box)

- [ ] 4.1 RDS: crear instancia y todas las bases de los repos; anotar endpoint.
- [ ] 4.2 EC2: productos, carrito, login, host Rabbit+Kafka+ordenes/notif/audit/admin/cupones, host `ms-pagos`, host frontend nginx.
- [ ] 4.3 Obtener IPs públicas y actualizar integraciones del Gateway.
- [ ] 4.4 Compilar jar de `pedidos360-lambda-authorizer` y ejecutar `migrar-lab-nuevo.ps1` (Cognito + Lambda dual + API de 33 rutas).
- [ ] 4.5 Ejecutar `rutas-ep5.ps1` (pagos/analytics/admin) y agregar 3 rutas nuevas: `POST /pagos/webpay/iniciar` (CUSTOM), `POST /pagos/webpay/retorno` (NONE) y su OPTIONS.
- [ ] 4.6 Configurar `WEBPAY_RETURN_URL` con la invoke URL HTTPS del Gateway y `FRONTEND_ORIGIN` exacto.
- [ ] 4.7 `ng build --configuration production` con `apiUrl` real; redesplegar frontend nginx.
- [ ] 4.8 Matriz: catálogo 200, sin token 401, Cognito 200, escritura con Cognito 403, ruta inexistente 404.
- [ ] 4.9 Compra WebPay real por HTTPS con tarjeta de prueba; verificar resultado y evento Kafka.
- [ ] 4.10 Verificación: salida de la matriz guardada como evidencia.
- **Commit checkpoint:** cambios de configuración/scripts necesarios (nunca credenciales).

> Si quedan <45 min de sesión: parar en la última fase verificada y marcar aquí qué quedó pendiente. No afirmar despliegue incompleto.

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
