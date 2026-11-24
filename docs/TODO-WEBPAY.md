# ToDo — Integración WebPay Plus en Pedidos360 (extra +5 de EP5/EP6)

**Inicio:** 2026-11-24 · **Estado:** EN CURSO · **Responsable:** agente + usuario

## Reglas de trabajo (obligatorias)

1. **Antes de pasar al siguiente paso:** verificar lo implementado (tests, build o curl) y hacer commit de los avances en la rama `feature/webpay`.
2. Commits en español, línea de asunto corta e imperativa. Nunca trabajar directo en `main`.
3. No escribir credenciales AWS, API keys reales de Transbank ni datos de tarjeta (PAN/CVV) en ningún repo.
4. Antifraude: se reutiliza el de `ms-pagos` (Postgres, 4º intento/10 s). **No** se crea el tópico `payment-attempts` del material.
5. Transbank: solo modo integración (`597055555532` + `IntegrationApiKeys.WEBPAY`). Sin secretos.
6. Si la sesión de Learner Lab se acerca a su fin, parar en la última fase verificada y documentar el estado real.

---

## Fase 0 — Preparación

- [ ] 0.1 Crear este archivo ToDo y dejarlo versionado.
- [ ] 0.2 Verificar cuenta y tiempo de sesión de AWS: `aws sts get-caller-identity`.
- [ ] 0.3 Configurar `~/.aws/credentials` (fuera de los repos; el usuario pegó las credenciales en chat, no se guardan aquí).
- [ ] 0.4 Revisar `git status` de los 12 repos; identificar cambios sin commitear (frontend tiene 2 archivos modificados según `ANALISIS-PENDIENTES-EP5-EP6.md`).
- [ ] 0.5 Crear rama `feature/webpay` en `pedidos360-ms-pagos` y `pedidos360-frontend`.
- [ ] 0.6 Verificación: STS responde la cuenta correcta; ningún repo tiene secretos trackeados.
- **Commit checkpoint:** este ToDo (en `Documentacion`, repo raíz de contexto).

## Fase 1 — Backend `pedidos360-ms-pagos`

- [ ] 1.1 `pom.xml`: agregar `com.github.transbankdevelopers:transbank-sdk-java:6.2.1`. Confirmar que Jackson ya está cubierto por Spring Boot; no agregar Lombok.
- [ ] 1.2 `application.properties`: variables `WEBPAY_COMMERCE_CODE`, `WEBPAY_RETURN_URL`, `FRONTEND_ORIGIN` (sin valores secretos).
- [ ] 1.3 Crear `WebpayClient` (interfaz `crear`/`confirmar`) y `TransbankWebpayClient` (implementación con `WebpayPlus.Transaction.buildForIntegration`). Seam para tests.
- [ ] 1.4 `Pago.java`: campos `tokenWebpay`, `buyOrder` y nuevo valor `PENDIENTE` en `PagoService.Resultado`; getters necesarios.
- [ ] 1.5 `PagoService`: extraer verificación de velocidad existente; agregar `WEBPAY` a `TarjetaDemo`; métodos `iniciarWebpay(...)` y `confirmarWebpay(...)` con validación de `buyOrder`/`sessionId`/`amount` contra el pago guardado.
- [ ] 1.6 `PagoOutbox`: omitir pagos `PENDIENTE` (sin cambiar la firma del método del repositorio para no romper el test actual).
- [ ] 1.7 `PagoController`: `POST /pagos/webpay/iniciar` (JWT, 429 si bloqueado, `{url,token}` si OK) y `POST /pagos/webpay/retorno` (form `token_ws`, sin JWT, 302 al frontend). `GET /pagos/{ordenId}` intacto.
- [ ] 1.8 `IdentityConfig`: `permitAll` solo para `/pagos/webpay/retorno` y OPTIONS; CORS con origen exacto (`CORS_ALLOWED_ORIGINS`).
- [ ] 1.9 Tests: inicio OK, 429 por ráfaga, retorno aprobado, retorno rechazado/token desconocido, outbox no publica pendientes.
- [ ] 1.10 Verificación: `mvn test` (primera vez online para bajar el SDK) y luego `mvn -o test > mvn-test.log` + grep de resultados. Ningún test regresado.
- [ ] 1.11 Verificación manual: arrancar ms-orders + ms-pagos, `curl POST /pagos/webpay/iniciar` con JWT de prueba y confirmar 200/429.
- **Commit checkpoint:** `feature/webpay` en `pedidos360-ms-pagos` con mensaje "agrega pago con WebPay Plus al microservicio de pagos".

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
| 2026-11-24 | 0 | ToDo creado | — |
