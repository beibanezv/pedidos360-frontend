# Pendientes Pedidos360 — EP3 / EP4 (RabbitMQ)

**Última actualización: 2026-10-10 (madrugada)** — Cognito verificado vivo de punta a punta: pool propio en el lab, Lambda `p360-authorizer` con valores reales conectada al API de negocio (`p360-dual`), 33 rutas explícitas (cero `{proxy+}`), segundo issuer en los 3 backends con Spring Security y matriz dual 401/403/200 comprobada con tokens reales. Auditado contra `Enunciado 2`, pauta **EP3** y pauta **EP4**.

> Este archivo es el pendiente vivo del frontend de Pedidos360 para la evaluación 2 (EP3 encargo 12% + EP4 presentación 18%). La verdad del estado por fase vive en `ESTADO-EP3-EP4.md` (raíz del workspace) y en `AGENTS.md`; si algo de aquí contradice a esos dos, ganan ellos y este archivo está desactualizado.

**Estado general:** la evaluación 1 (EP1/EP2) está cerrada y verificada en AWS. EP3/EP4 está implementado, probado y **desplegado**: la infra del lab sobrevivió (API `13uwepgzy9`, 5 EC2, RDS) y la doble vía de login funciona viva. Lo que queda es **jubilar el authorizer nativo**, las **2 evidencias baratas** (tenant Entra ID + Postman), el **guion de defensa** y la **entrega en AVA**.

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

**Pruebas backend (carrito 15, productos 15, login 6, orders 12, notificaciones 11, cupones 18, admin 8, auditoría 6; corridas con `mvn -o test` en esta máquina).** `docs/evidencias.md` y versiones viejas de `ESTADO-EP3-EP4.md` decían "auditoría 5": son 6 en el código actual.

---

## Estado contra la pauta EP4 (11 puntos de la presentación)

> La pauta EP4 usa la **misma tabla de 8 indicadores de arriba**; acá van los puntos de las "Instrucciones específicas" (el enunciado lista 11, no 10). La presentación es **individual**: cada integrante defiende el sistema completo.

| # | Punto | Estado | Evidencia |
|---|---|---|---|
| 1 | Instancia de API Manager funcionando en la cloud | **CUMPLIDO** | HTTP API `13uwepgzy9` (`p360-negocio`), stage `desarrollo`, vivo el 2026-10-10: **33 rutas explícitas** (cero `{proxy+}`, cero `ANY`), authorizer `p360-dual` (Lambda Java con valores reales). Exchanges/colas del broker verificados en la misma sesión. |
| 2 | Configuración del API Manager para llamar al backend | **CUMPLIDO** | 15 integraciones nuevas 1:1 contra los 8 controllers + las 5 base reutilizadas (productos 44.203.235.220, carrito 3.88.84.104, login 3.85.212.235, resto 3.92.6.130). CORS cerrado al origen del frontend. |
| 3 | Frontend consume endpoints vía el API Manager | **CUMPLIDO** | Verificado en vivo 2026-09-28: 2 compras reales desde el navegador del usuario (órdenes `852f8d9b` y `7e2030f1`, ambas REGISTRADA, stock descontado, carrito vaciado). Capturas `docs/evidencias/fase5/` y fase 6. |
| 4 | API Manager valida JWT: rechaza inválidas, acepta correctas | **CUMPLIDO (matriz dual viva 2026-10-10)** | Sin token 401, token malo 403, `GET /productos` público 200, Azure válido 200, **Cognito válido 200** (carrito, login/me, auditoría, órdenes), `POST /productos` con Cognito 403 (sin `ROLE_Admin`, correcto), ruta inventada 404, `OPTIONS` 200 con ACAO. |
| 5 | Creación del tenant en IDaaS y existencia de usuarios registrados | **PARCIAL — falta captura** | El tenant existe y hay login real verificado con 2 cuentas (`benjamin.ibanez@josecamposar.onmicrosoft.com` y la guest `be.ibanezv@duocuc.cl`). **No hay captura de la consola de Entra ID mostrando el tenant ni la lista de usuarios** en `docs/evidencias/`. No depende de AWS: se puede sacar en cualquier momento. |
| 6 | Frontend usa OAuth 2.0/OIDC para obtener un JWT válido | **CUMPLIDO (doble vía viva)** | MSAL Angular con Authorization Code + PKCE; `sesionGuard` en `/cuenta`, `/carrito`, `/ordenes`, `/admin`; `MsalInterceptor` + `cognitoInterceptor` con `state` anti-CSRF. Segunda vía Cognito Hosted UI (PKCE) contra el **pool propio** `us-east-1_A8lrPsDta` (client `2ba1fjeai3c2i77sb5dpd7j91m`), callback `/cognito/callback` registrado en localhost y en prod. `ng build` + `ng test` 10/10 verdes. Usuarios: `cliente@pedidos360.cl`, `test-cognito@pedidos360.cl`. |
| 7 | Backend y frontend desplegados, activos e integrados en la nube | **CUMPLIDO** | 2026-10-10: 5 EC2 (productos, carrito, login, frontend nginx con build v1.3.1, `p360-rabbit`) + RDS `p360-postgres` + pool Cognito + Lambda `p360-authorizer`, todo respondiendo. |
| 8 | Dos nodos RabbitMQ configurados y en clúster | **CUMPLIDO en código y local / falta captura cloud** | `docker/rabbitmq-cluster/docker-compose.yml` (2 nodos, `rabbitmq:4.2-management`, mismo `RABBITMQ_ERLANG_COOKIE`) + `rabbitmq.conf`. Local: `cluster_status` muestra los 2 nodos. AWS: reportado "clúster rabbit@rabbitmq-1/2, 7 contenedores UP". |
| 9 | Tres colas con sus DLQ funcionando | **CUMPLIDO (hay 5, pide 3)** | `p360.ordenes.queue`, `p360.stock.queue`, `p360.notificaciones.queue`, `p360.auditoria.queue` (binding `#`), `p360.cupones.queue`, más `p360.dlx` y sus 5 DLQ (`p360.*.dlq`). DLQ con mensajes reales verificada en local (error permanente y reintento agotado). |
| 10 | Exchanges de tipo direct y topic bien configurados | **CUMPLIDO** | Direct `p360.ordenes.exchange` (routing key `orden.creada`), topic `p360.eventos` (`orden.registrada`), direct `p360.dlx` para las DLQ. Falta la captura de la pestaña Exchanges. |
| 11 | Ejecución de docker-compose levantando RabbitMQ en la nube | **CUMPLIDO según reporte de Fase 6 / falta captura** | Compose único en la EC2 `p360-rabbit` reportado con 7 contenedores UP. La captura de `docker compose ps` en la nube no existe todavía. |

---

## Lo que falta (pendiente real — actualizado 2026-10-10)

1. **Jubilar el authorizer nativo `azure-ad`.** Quedó definido pero sin rutas (es el rollback instantáneo). Diseño final: un solo authorizer dual. *Bloqueador:* ninguno — un comando cuando esté todo verde.
2. **Captura del tenant de Entra ID con los usuarios registrados** (punto 5 de EP4). *Bloqueador:* ninguno — solo acceso al portal de Azure. Es la evidencia más barata que queda.
3. **Prueba desde Postman a `POST /notificaciones/enviar` + captura del correo**, tal como pide el Enunciado 2 (vía gateway). *Bloqueador:* ninguno — el endpoint responde hoy.
4. **Purgar las DLQ viejas** (`p360.stock.dlq`=2, `p360.notificaciones.dlq`=1, restos del 28-09) o dejarlas como evidencia del mecanismo. *Bloqueador:* ninguno.
5. **Guion de defensa EP4 + ensayo** (5-10 min, orden de los 11 puntos, individual). *Bloqueador:* ninguno técnico.
6. **Entrega: subir a AVA + email al profe** con los enlaces de los 10 repos (todos tageados al HEAD, ver Notas). *Bloqueador:* conviene llegar con capturas y guion; no es bloqueo técnico.
7. **Subir el TTL del authorizer** (`p360-dual` quedó en 0 sin caché para las pruebas; producción usa 300). *Bloqueador:* ninguno.

---

## Cognito — verificado vivo 2026-10-10 (era el "orden obligatorio")

Detalle completo en `brief-cognito-lambda-authorizer.md` (raíz del workspace). Estado:

1. **Lambda authorizer: el Java del material de clase, con valores reales.** Repo propio **`pedidos360-lambda-authorizer`** (`beibanezv`, tag `v1.0.1`, 39/39 tests, sin el `function.jar` de 26 MB): Azure JWKS/issuer en **v1.0** (el repo base traia v2.0) + pool propio de Cognito. Desplegada como **`p360-authorizer`** (java21) y conectada al API de negocio como authorizer REQUEST **`p360-dual`** (payload 2.0, TTL 0 para las pruebas). El codigo Node no se reutilizo (politica IAM de REST API + issuer v2.0) y su copia del companero se perdio con su `%TEMP%`; la API demo `0kshk6n4yh` ya no existe. El nativo `azure-ad` quedo sin rutas como rollback.
2. **Gate: VERIFICADO con ambos proveedores.** Invoke directo a la Lambda: Cognito `true`, Azure v1.0 `true`, sin token `false`. Matriz viva por el gateway: sin token 401, malo 403, `GET /productos` 200, Azure 200, Cognito 200, `POST /productos` con Cognito 403 (sin Admin, correcto), `OPTIONS` 200.
3. **Frontend: doble via contra el pool propio.** `us-east-1_A8lrPsDta`, client `2ba1fjeai3c2i77sb5dpd7j91m`, dominio `pedidos360-945401641647.auth.us-east-1.amazoncognito.com` (el pool del companero era de su lab muerto). Callbacks de localhost **y** prod registrados en el client. Usuarios `cliente@pedidos360.cl`, `test-cognito@pedidos360.cl`. Mas `state` anti-CSRF y callback de prod (tag v1.3.0).
4. **Backends con Spring Security: segundo issuer.** carrito/productos/login prueban Azure y recurren al JWKS del pool; Cognito mapea a `ROLE_Cliente`, el admin sigue solo-Azure. Tags carrito/productos **v1.3.2**, login **v1.1.2** (tests 15/15/6). Vivo: `GET /carrito` 200, `POST /carrito/items` 201, `GET /login/me` 200.
5. **Rutas explicitas (fix del `{proxy+}` de la ev. 1).** 33 rutas 1:1 contra los 8 controllers, cero `{proxy+}` y cero `ANY`; ruta inventada responde 404.

**Por qué el orden no era negociable:** cada ruta de un HTTP API tiene **un solo** authorizer. El authorizer JWT nativo (`azure-ad`) acepta un issuer y un audience, así que sin Lambda los tokens de Cognito se rechazan y el checkout queda roto; y si se cambia el issuer del nativo a Cognito, se rompe Azure, que es lo que sostiene la evaluación 1.

El código de `docs/lambda-authorizer/index.mjs` **no se reutilizó**: responde con política IAM (formato REST API), y valida issuer/JWKS **v2.0** cuando los tokens reales de este tenant son **v1.0**. Queda como referencia de estudio.

---

## Comandos de verificación

> Lab propio del usuario con credenciales vigentes (cuenta 945401641647, `us-east-1`). Si un comando `aws` falla con `InvalidClientTokenId`, la sesión expiró: abrir una nueva y reescribir `~/.aws/credentials`. Procedimiento de reapertura en `runbook-fase3-aws.md` sección 8.

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

**Matriz dual viva contra el Gateway** (lab AWS; token Cognito vía `admin-initiate-auth`, token Azure vía login Microsoft):

```powershell
$gw = "https://13uwepgzy9.execute-api.us-east-1.amazonaws.com/desarrollo"
curl -i "$gw/productos"                                    # público -> 200
curl -i "$gw/carrito"                                      # sin token -> 401
curl -i -H "Authorization: Bearer abc.def.ghi" $gw/carrito # inválido -> 403
aws cognito-idp admin-initiate-auth --user-pool-id us-east-1_A8lrPsDta --client-id 2ba1fjeai3c2i77sb5dpd7j91m --auth-flow ADMIN_USER_PASSWORD_AUTH --auth-parameters USERNAME=cliente@pedidos360.cl,PASSWORD="<clave>" --query AuthenticationResult.IdToken --output text
curl -i -H "Authorization: Bearer <id_token>" "$gw/carrito"   # Cognito -> 200 (segundo issuer)
curl -i -H "Authorization: Bearer <azure>" "$gw/ordenes"      # Azure v1.0 -> 200
curl -i -X POST "$gw/productos" -H "Authorization: Bearer <id_token>"  # Cognito sin Admin -> 403
curl -i -X OPTIONS "$gw/carrito/items" -H "Origin: https://4zg0frz1qg.execute-api.us-east-1.amazonaws.com" -H "Access-Control-Request-Method: POST"  # preflight -> 200
```

**Rutas explícitas (API `13uwepgzy9`, 33 rutas, cero `{proxy+}`):**

```powershell
$gw = "https://13uwepgzy9.execute-api.us-east-1.amazonaws.com/desarrollo"
curl -i "$gw/productos/b1d1fce1-f913-40f5-9ed0-b276bcc9596c"  # {id} público -> 200
curl -i "$gw/carrito/otracosa"                               # sin greedy -> 404 del gateway
curl -i "$gw/ordenes?usuarioId=$oid" -H "Authorization: Bearer $token"  # -> 200
```

**Frontend:**

```powershell
ng build
ng test               # 10 pruebas (las 7 + cognito-auth.service.spec.ts con 3 casos del `state`)
```

---

## Notas

- **Lab AWS vigente 2026-10-10** (cuenta propia 945401641647): API `13uwepgzy9` con 33 rutas, 5 EC2 (productos 44.203.235.220, carrito 3.88.84.104, login 3.85.212.235, frontend EIP 52.73.189.238, rabbit 3.92.6.130), RDS `p360-postgres`, pool Cognito `us-east-1_A8lrPsDta`, Lambda `p360-authorizer`. La API demo `0kshk6n4yh` ya no existe.
- **El correo al comprador sale del host, no del token.** `ms-notificaciones` usa `emailComprador` del evento (nunca lee claims de Azure) y las credenciales SMTP salen de `spring.mail.*` por variables de entorno (`MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_FROM`), así que el remitente siempre es la cuenta Gmail que autentica. El código no loguea los envíos exitosos: la evidencia de envío es **cola drenada + DLQ intacta**. Verificado en local el 2026-10-08 (orden `710a5320-f363-486b-b7bb-11961a8ccc5a`, correo recibido en `be.ibanezv@duocuc.cl`).
- **Cada ruta del HTTP API tiene un solo authorizer.** Es la razón técnica detrás del orden obligatorio de Cognito y del porqué la Lambda es inevitable si se quiere un segundo proveedor.
- **Los 5 microservicios nuevos** (orders, notificaciones, auditoría, admin, cupones) **no llevan Spring Security a propósito**: confían en el authorizer del Gateway. productos, carrito y login quedaron con decoder dual Azure+Cognito (`cognito.jwks-uri` por env, default al pool propio) y Cognito mapea a `ROLE_Cliente`; la escritura del catálogo sigue exigiendo `ROLE_Admin` solo-Azure.
- **Material de clase utilizable** (`Material visto en clase/Unidad 2`): `2.3.1 RabbitMQ Cluster con Docker Compose.pdf` (clúster), `2.2.2 DLX y DLQ.pdf` y `2.2.3 políticas de retención y alertas.pdf` (DLQ), `2.2.1 publish/subscribe, acknowledgements y durabilidad.pdf` (ACK), `2.1.3 exchanges, bindings y routing keys.pdf` (topología), `Paso a paso autenticacion todo usuario con Cognito.docx` y `Validador de token con lambda y api Gateway.docx` (Cognito + Lambda), `PASO A PASO PARA ENVIO DE CORREOS.docx` (SMTP).
- **Higiene:** los logs de `ng serve` quedan cubiertos por el patrón `ng-serve-*.log` del `.gitignore`; el `.env` (agregado hoy) también.
- **Estado de los 10 repos:** todos tageados y sincronizados con `origin/main` — frontend v1.3.2, lambda-authorizer v1.0.1, productos v1.3.2, carrito v1.3.2, login v1.1.2, orders v1.2.0, notificaciones v1.1.0, auditoría v1.1.0, admin v1.0.0, cupones v1.1.1.
