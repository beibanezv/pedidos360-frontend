# Pendientes Pedidos360 — EP3 / EP4 (RabbitMQ)

**Última actualización: 2026-10-09** (auditado contra `Enunciado 2`, pauta **EP3** y pauta **EP4**).

> Este archivo es el pendiente vivo del frontend de Pedidos360 para la evaluación 2 (EP3 encargo 12% + EP4 presentación 18%). La verdad del estado por fase vive en `ESTADO-EP3-EP4.md` (raíz del workspace) y en `AGENTS.md`; si algo de aquí contradice a esos dos, ganan ellos y este archivo está desactualizado.

**Estado general:** la evaluación 1 (EP1/EP2) está cerrada y verificada en AWS. El código de EP3/EP4 está completo y con pruebas verdes en local. Lo que queda es **evidencia en la nube**, la **tarea de Cognito** (con orden obligatorio), el **guion de defensa** y la **entrega en AVA**.

---

## Estado contra la pauta EP3 (8 indicadores)

| # | Indicador (pauta EP3) | Estado | Evidencia |
|---|---|---|---|
| 1 | Nombres de colas, exchanges y bindings centralizados en `application.yml` o clase `@Configuration` (12%) | **CUMPLIDO** | Cada uno de los 6 servicios con mensajería tiene `config/RabbitMQConfig.java` con los literales en `public static final String` (p. ej. `pedidos360-ms-orders/src/main/java/com/pedidos360/orders/config/RabbitMQConfig.java` líneas 31-44). Búsqueda de literales `"p360.*"` fuera de esas clases: solo 1, en `CuponConsumerTest` (cabecera `x-death` simulada), que no es nombre de topología. |
| 2 | Beans `Queue`, `Exchange` y `Binding` por caso de uso (13%) | **CUMPLIDO** | `ms-orders/RabbitMQConfig.java` declara `ordenesExchange` (direct), `ordenesQueue` con `x-dead-letter-exchange`/`x-dead-letter-routing-key`, `ordenesBinding`, `deadLetterExchange`, `ordenesDlq` + `ordenesDlqBinding`, `eventosExchange` (topic). Igual en ms-carrito, ms-productos, ms-notificaciones, ms-auditoria (binding `#`) y ms-cupones. |
| 3 | Configuración de mensajería separada de la lógica de negocio (10%) | **CUMPLIDO** | Los consumidores viven en `messaging/` y solo leen constantes de `RabbitMQConfig`; `ms-admin` aísla todo en `config/RabbitAdminConfig.java` (único bean: `RabbitAdmin`). Ningún controlador ni servicio de dominio declara colas. |
| 4 | `@RabbitListener` agrupados por dominio funcional (15%) | **CUMPLIDO** | Un consumidor por dominio, cada uno en su repo y paquete `messaging`: `OrdenConsumer`, `StockConsumer`, `NotificacionConsumer`, `AuditoriaConsumer`, `CuponConsumer`. |
| 5 | ACK explícito, manejo de errores con reintento/NACK/DLQ (20%) | **CUMPLIDO** | `BaseConsumer.consumir()`: `basicAck` en éxito; `IllegalArgumentException` = error permanente → `basicNack(requeue=false)` a la DLQ sin gastar reintentos; otra `RuntimeException` = transitoria → `basicNack(requeue=true)` hasta que `x-death` `count >= maxReintentos()` (3), después DLQ. `spring.rabbitmq.listener.simple.acknowledge-mode=manual` y `prefetch=1` en `application.properties`. Logging explícito de ACK, reintento, permanente y agotamiento. Verificado en vivo: SKU inexistente y cupón inexistente → 3 reintentos → `p360.*.dlq` = 1. |
| 6 | Microservicio administrador con endpoints REST bien definidos (13%) | **CUMPLIDO, CON OBSERVACIÓN** | `RabbitAdminController` (`/api/rabbitmq`): `POST /queues`, `POST /exchanges`, `POST /bindings`, `GET /queues/{nombre}`, `DELETE /queues/{nombre}`, `DELETE /exchanges/{nombre}`, `POST /queues/{nombre}/purge`. **Observación:** no hay `DELETE /bindings/...`, que la instrucción específica de EP3 pide ("creación y eliminación de colas, exchanges **y bindings**"). El indicador en sí no lo exige. |
| 7 | Lógica de crear colas/exchanges encapsulada en un servicio (10%) | **CUMPLIDO** | `service/RabbitAdminService.java`: `crearCola`, `crearExchange`, `crearBinding`, `infoCola`, `eliminarCola`, `eliminarExchange`, `purgarCola`. El controlador solo llama esos métodos y no toca `RabbitAdmin`. |
| 8 | Validación de parámetros de entrada con DTO (7%) | **CUMPLIDO** | `CrearColaRequest`/`CrearExchangeRequest`/`CrearBindingRequest` con `@NotBlank` (+ `@Pattern` para el tipo de exchange), `@Valid` en el controlador y `GlobalExceptionHandler` que devuelve 400 con mensajes claros, 404 si no existe y 503 si el broker está caído. |

**Pruebas backend (conteo observado leyendo `src/test` de cada repo en esta sesión; no se corrió `mvn test` acá):** productos 12, carrito 11, orders 12, notificaciones 11, cupones 18, admin 8, login 4, auditoría 6. `docs/evidencias.md` y `ESTADO-EP3-EP4.md` dicen "auditoría 5": son 6 en el código actual, quedó un número viejo. **Sin verificar en esta sesión:** la corrida fresca de `mvn -o test` en los 8 repos.

---

## Estado contra la pauta EP4 (10 puntos de la presentación)

> La pauta EP4 usa la **misma tabla de 8 indicadores de arriba**; acá van los puntos de las "Instrucciones específicas" (el enunciado lista 11, no 10). La presentación es **individual**: cada integrante defiende el sistema completo.

| # | Punto | Estado | Evidencia |
|---|---|---|---|
| 1 | Instancia de API Manager funcionando en la cloud | **CUMPLIDO (evidencia) / por rever en vivo** | HTTP API `13uwepgzy9` (`p360-negocio`), stage `desarrollo`. Capturas `docs/evidencias/15-gateway-rutas.png`, `16-gateway-authorizers.png`, `17-gateway-cors.png`. |
| 2 | Configuración del API Manager para llamar al backend | **CUMPLIDO (evidencia)** | Integraciones a las 4 EC2 + la nueva `p360-rabbit`; 20 rutas `ANY /svc` y `ANY /svc/{proxy+}`. Capturas 10-15. |
| 3 | Frontend consume endpoints vía el API Manager | **CUMPLIDO** | Verificado en vivo 2026-09-28: 2 compras reales desde el navegador del usuario (órdenes `852f8d9b` y `7e2030f1`, ambas REGISTRADA, stock descontado, carrito vaciado). Capturas `docs/evidencias/fase5/` y fase 6. |
| 4 | API Manager valida JWT: rechaza inválidas, acepta correctas | **CUMPLIDO (evidencia)** | Matriz verificada 2026-09-06: sin token 401, sin scope/rol 403, `GET /productos` público 200, escritura productos con Admin 201. Capturas 18, 19, 20. **Nota:** la matriz hay que repetir cuando se adjunte la Lambda de Cognito. |
| 5 | Creación del tenant en IDaaS y existencia de usuarios registrados | **PARCIAL — falta captura** | El tenant existe y hay login real verificado con 2 cuentas (`benjamin.ibanez@josecamposar.onmicrosoft.com` y la guest `be.ibanezv@duocuc.cl`). **No hay captura de la consola de Entra ID mostrando el tenant ni la lista de usuarios** en `docs/evidencias/`. No depende de AWS: se puede sacar en cualquier momento. |
| 6 | Frontend usa OAuth 2.0/OIDC para obtener un JWT válido | **CUMPLIDO** | MSAL Angular con Authorization Code + PKCE; `MsalGuard` en `/cuenta`, `/carrito`, `/ordenes`, `/admin`; `MsalInterceptor` con `protectedResourceMap`. Verificado con roles `Cliente`/`Admin` y scopes `Productos.Read`/`Carrito.ReadWrite` visibles en `/cuenta`. Capturas 21 y fase5/02. |
| 7 | Backend y frontend desplegados, activos e integrados en la nube | **CUMPLIDO (evidencia) / por rever en vivo** | 4 EC2 (productos, carrito, login, frontend nginx) + 1 RDS + EC2 `p360-rabbit`. Capturas 10-14. |
| 8 | Dos nodos RabbitMQ configurados y en clúster | **CUMPLIDO en código y local / falta captura cloud** | `docker/rabbitmq-cluster/docker-compose.yml` (2 nodos, `rabbitmq:4.2-management`, mismo `RABBITMQ_ERLANG_COOKIE`) + `rabbitmq.conf`. Local: `cluster_status` muestra los 2 nodos. AWS: reportado "clúster rabbit@rabbitmq-1/2, 7 contenedores UP". |
| 9 | Tres colas con sus DLQ funcionando | **CUMPLIDO (hay 5, pide 3)** | `p360.ordenes.queue`, `p360.stock.queue`, `p360.notificaciones.queue`, `p360.auditoria.queue` (binding `#`), `p360.cupones.queue`, más `p360.dlx` y sus 5 DLQ (`p360.*.dlq`). DLQ con mensajes reales verificada en local (error permanente y reintento agotado). |
| 10 | Exchanges de tipo direct y topic bien configurados | **CUMPLIDO** | Direct `p360.ordenes.exchange` (routing key `orden.creada`), topic `p360.eventos` (`orden.registrada`), direct `p360.dlx` para las DLQ. Falta la captura de la pestaña Exchanges. |
| 11 | Ejecución de docker-compose levantando RabbitMQ en la nube | **CUMPLIDO según reporte de Fase 6 / falta captura** | Compose único en la EC2 `p360-rabbit` reportado con 7 contenedores UP. La captura de `docker compose ps` en la nube no existe todavía. |

---

## Lo que falta (pendiente real)

1. **Capturas de evidencia RabbitMQ/AWS** — clúster de 2 nodos, exchanges, colas + DLQ, `docker compose ps` en la EC2, flujo completo del mensaje y correo recibido. *Bloqueador:* la credencial del AWS Learner Lab expiró (`InvalidClientTokenId` / `UnrecognizedClientException`); hay que abrir sesión de lab nueva.
2. **Login con Cognito en el frontend**, respetando el orden obligatorio de la sección siguiente. *Bloqueador:* hay que construir y verificar la Lambda authorizer primero (gate).
3. **Captura del tenant de Entra ID con los usuarios registrados** (punto 5 de EP4). *Bloqueador:* ninguno — solo acceso al portal de Azure. Es la evidencia más barata de conseguir y hoy no está.
4. **Prueba desde Postman a `POST /api/notificaciones/enviar` + captura del correo**, tal como pide el Enunciado 2 ("evidencia del microservicio de notificaciones mostrando el envío del correo electrónico (captura de la prueba realizada desde Postman o del cliente de correo)"). El endpoint existe y valida el DTO. *Bloqueador:* ninguno en local; para la captura en AWS se necesita el lab.
5. **Reescribir `docs/evidencias.md`** con las capturas nuevas (RabbitMQ, Postman, correo, tenant). *Bloqueador:* los ítems 1, 3 y 4.
6. **Guion de defensa EP4 + ensayo** (5-10 min, orden de los 11 puntos de arriba). Postergado a pedido del usuario hasta tener Cognito. *Bloqueador:* decisión del usuario.
7. **`DELETE /bindings` en ms-admin**, si se quiere cumplir al pie la instrucción de EP3 ("creación y eliminación de colas, exchanges y bindings"). *Bloqueador:* ninguno — es una mejora pequeña y acotada a `RabbitAdminController` + `RabbitAdminService` + su prueba. El indicador 6 de la pauta no lo exige, así que es opcional.
8. **Entrega: subir a AVA + email al profe** con los enlaces de los 9 repos (antes del 15-10-2026). *Bloqueador:* conviene llegar con las capturas y el guion; no es bloqueo técnico.

---

## Orden obligatorio para lo de Cognito

Detalle completo en `brief-cognito-lambda-authorizer.md` (raíz del workspace). Resumen:

1. **Construir la Lambda authorizer** (Node.js, tipo REQUEST, payload 2.0) para el HTTP API `13uwepgzy9`, con `jose` como única dependencia: detecta el proveedor leyendo `iss` sin verificar firma (`https://cognito-idp.<region>.amazonaws.com/<userPoolId>` → JWKS del user pool + `token_use`/`client_id`; `https://sts.windows.net/e5372bf0-c5e3-4286-887c-79069f209c1f/` → JWKS **v1** de Azure + audience `api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c`), con un `createRemoteJWKSet` por proveedor guardado fuera del handler (caché en caliente). Adjuntarla a las rutas seguras (`/carrito/*`, `/login/*`, `/ordenes`, `/notificaciones`, `/auditoria`, `/admin/*`, `/cupones/*`), **no** a `GET /productos` ni a las `OPTIONS`. Redesplegar el stage.
2. **Gate:** verificar la matriz completa contra el stage `desarrollo` con **ambos** tipos de token — sin token 401, token inválido o de otro issuer 401, token Azure válido 200/403 según ruta, token Cognito válido 200/403 según ruta, `OPTIONS` 200 sin token, `GET /productos` público 200. **Este es el punto de no retorno.**
3. **Recién después tocar el frontend:** segunda vía de login (Hosted UI de Cognito o Amplify) + cambios en `environment.prod.ts`.

**Por qué el orden no es negociable:** cada ruta de un HTTP API tiene **un solo** authorizer. El authorizer JWT nativo de hoy (`azure-ad`) acepta un issuer y un audience, así que sin Lambda los tokens de Cognito se rechazan y el checkout queda roto; y si se cambia el issuer del nativo a Cognito, se rompe Azure, que es lo que sostiene la evaluación 1.

El código de `docs/lambda-authorizer/index.mjs` **no se puede reutilizar tal cual**: responde con política IAM (formato REST API), y valida issuer/JWKS **v2.0** cuando los tokens reales de este tenant son **v1.0**. Queda como referencia de estudio.

---

## Comandos de verificación

> Los comandos del bloque local funcionan sin AWS. Los del bloque Gateway necesitan una sesión de laboratorio abierta y credenciales frescas: hoy fallan con `InvalidClientTokenId`.

**Clúster y topología (local, desde `pedidos360/pedidos360-ms-admin/docker/rabbitmq-cluster`):**

```powershell
docker compose up -d
docker compose ps
docker exec p360-rabbit-1 rabbitmqctl cluster_status          # los 2 nodos del clúster
docker exec p360-rabbit-1 rabbitmqctl list_queues name messages consumers
docker exec p360-rabbit-1 rabbitmqctl list_exchanges name type
# Management API (UI en http://localhost:15672, admin/admin123):
curl -u admin:admin123 http://localhost:15672/api/exchanges
curl -u admin:admin123 http://localhost:15672/api/queues
curl -u admin:admin123 http://localhost:15672/api/bindings
```

**Servicios** (ms-admin en :8087, productos :8081, carrito :8082, login :8083, orders :8084, notificaciones :8085, auditoría :8086, cupones :8088):

```powershell
mvn -o test            # en cada repo backend
curl http://localhost:8087/api/rabbitmq/queues/p360.stock.queue
```

**Matriz de seguridad contra el Gateway** (requiere lab AWS y un token Azure v1.0 real):

```powershell
$gw = "https://13uwepgzy9.execute-api.us-east-1.amazonaws.com/desarrollo"
curl -i "$gw/productos"                                    # público -> 200
curl -i "$gw/carrito/items"                                # sin token -> 401
curl -i -X POST "$gw/productos" -H "Authorization: Bearer $tokenCliente"   # sin rol Admin -> 403
curl -i "$gw/ordenes?usuarioId=$oid" -H "Authorization: Bearer $tokenAdmin" # -> 200
```

**Frontend:**

```powershell
ng build
ng test               # 7 pruebas (app.spec.ts, producto.service.spec.ts, carrito.service.spec.ts)
```

---

## Notas

- **Credencial AWS del Learner Lab expirada** desde el 2026-10-08: todo comando `aws` falla con `InvalidClientTokenId` / `UnrecognizedClientException`. Las capturas en la nube y la demo AWS esperan sesión de lab nueva. Procedimiento de reapertura en `runbook-fase3-aws.md` sección 8.
- **El correo al comprador sale del host, no del token.** `ms-notificaciones` usa `emailComprador` del evento (nunca lee claims de Azure) y las credenciales SMTP salen de `spring.mail.*` por variables de entorno (`MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_FROM`), así que el remitente siempre es la cuenta Gmail que autentica. El código no loguea los envíos exitosos: la evidencia de envío es **cola drenada + DLQ intacta**. Verificado en local el 2026-10-08 (orden `710a5320-f363-486b-b7bb-11961a8ccc5a`, correo recibido en `be.ibanezv@duocuc.cl`).
- **Cada ruta del HTTP API tiene un solo authorizer.** Es la razón técnica detrás del orden obligatorio de Cognito y del porqué la Lambda es inevitable si se quiere un segundo proveedor.
- **Los 5 microservicios nuevos** (orders, notificaciones, auditoría, admin, cupones) **no llevan Spring Security a propósito**: confían en el authorizer del Gateway. productos, carrito y login sí validan JWT internamente contra el JWKS **v1** de Azure. Decisión documentada; si Cognito va a llamar al Gateway, esos 3 servicios necesitan un segundo issuer.
- **Material de clase utilizable** (`Material visto en clase/Unidad 2`): `2.3.1 RabbitMQ Cluster con Docker Compose.pdf` (clúster), `2.2.2 DLX y DLQ.pdf` y `2.2.3 políticas de retención y alertas.pdf` (DLQ), `2.2.1 publish/subscribe, acknowledgements y durabilidad.pdf` (ACK), `2.1.3 exchanges, bindings y routing keys.pdf` (topología), `Paso a paso autenticacion todo usuario con Cognito.docx` y `Validador de token con lambda y api Gateway.docx` (Cognito + Lambda), `PASO A PASO PARA ENVIO DE CORREOS.docx` (SMTP).
- **Higiene:** hay un `ng-serve-mail.log` sin seguimiento en la raíz del frontend que el `.gitignore` no cubre (solo cubre `ng-serve.log`).
- **Estado de los 9 repos:** todos tagueados y sincronizados con `origin/main` — frontend v1.2.1 (HEAD `272fe80`), productos v1.3.0, carrito v1.3.0, login v1.1.0, orders v1.2.0, notificaciones v1.1.0, auditoría v1.0.0, admin v1.0.0, cupones v1.1.0.
