# Despliegue en AWS — Pedidos360 (estado vigente 2026-10-14)

Perímetro real: un **HTTP API** de API Gateway (`p360-negocio`) como único
punto de entrada, con **authorizer Lambda `p360-dual`** (REQUEST, payload 2.0)
que valida Azure AD v1.0 y Cognito. La validación fina de roles/scopes vive en
los backends (`@PreAuthorize`), como exige la rúbrica.

Máquinas (lab `us-east-1`, cuenta del curso):
2. EC2 — ms-productos :8081 → RDS
3. EC2 — ms-carrito :8082 → RDS
4. EC2 — ms-login :8083 (sin BD: solo decodifica el JWT)
5. EC2 — frontend nginx :80, publicado con https vía un segundo HTTP API
   (ver sección 7).
6. EC2 `p360-rabbit` — clúster RabbitMQ 2 nodos + orders :8084,
   notificaciones :8085, auditoría :8086, admin :8087, cupones :8088
   (un `docker-compose`, imagen por servicio).
7. RDS Postgres `p360-postgres` con las 5 BD (`pedidos360_productos`,
   `pedidos360_carrito`, `pedidos360_ordenes`, `pedidos360_auditoria`,
   `pedidos360_cupones`).

> `docs/lambda-authorizer/` (Node + REST + Lambda TOKEN, issuer v2.0) queda
> como **referencia histórica de la evaluación 1, no desplegada**: la defensa
> usa la Lambda Java del repo `pedidos360-lambda-authorizer` (issuer v1.0 +
> Cognito, formato REQUEST 2.0). Avisar a Matías antes de borrarlo.

---

## 0. Pre-requisitos

- Cuenta AWS Academy Learner Lab. **OJO: el Lab resetea recursos entre
  sesiones** — IPs, EC2 y RDS pueden no existir al volver; reconstrúyelo cerca
  de la entrega (ver `runbook-fase3-aws.md` secc. 8 y `migrar-lab-nuevo.ps1`
  en la raíz del workspace). Tras cada reapertura hay que actualizar las URIs
  de las integraciones a las IPs nuevas (`update-integration` aplica altiro,
  sin redesplegar).
- Clave SSH vía `aws ec2-instance-connect send-ssh-public-key` (expira en
  60s: push + ssh/scp en la misma cadena). `ec2-user` necesita `sudo docker`.
- Tenant Azure + App Registration + pool Cognito listos.

## 1. Imágenes Docker (una por microservicio)

```bash
# en cada repo backend
mvn -o package -DskipTests
# Dockerfile slim: FROM eclipse-temurin:17-jre + COPY app.jar
docker build -t ms-productos .
```

El jar viaja por `scp` a cada EC2 y la imagen se construye allá (patrón
`redeploy-old.sh`: hereda el env del contenedor viejo, nunca imprime el
password del RDS).

## 2. EC2 + RDS

Cada servicio corre con env heredado; las variables que cambian por entorno:

```bash
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL="jdbc:postgresql://<RDS_ENDPOINT>:5432/pedidos360_<svc>"
SPRING_DATASOURCE_USERNAME="postgres"
SPRING_DATASOURCE_PASSWORD="<password>"   # nunca en el repo
AZURE_TENANT_ID="e5372bf0-c5e3-4286-887c-79069f209c1f"
RABBITMQ_HOST="<IP-privada-p360-rabbit>"  # misma VPC, no la pública
CORS_ALLOWED_ORIGINS="https://<API-FRONTEND>.execute-api.us-east-1.amazonaws.com"
```

`p360-rabbit` levanta con un compose único (rabbit-1/2 + 5 apps).
Verifica:

```bash
curl http://localhost:8081/productos    # 200
curl http://localhost:8082/carrito      # 401 (sin token)
curl http://localhost:8083/login/me     # 401 (sin token)
```

## 3. API Gateway HTTP API (34 rutas explícitas, cero `{proxy+}`)

El `{proxy+}` catch-all del API de negocio se eliminó (observación del profe
en la evaluación 1): cada ruta es MÉTODO + path 1:1 contra un endpoint real
del backend; una ruta inventada responde 404 del Gateway.

- `GET /productos`, `GET /productos/{id}` (públicas, sin autorizador)
- `POST /productos`, `PUT /productos/{id}`, `DELETE /productos/{id}`
- `GET /carrito`, `POST /carrito/items`, `PUT /carrito/items/{id}`,
  `DELETE /carrito/items/{id}`, `POST /carrito/checkout`
- `GET /login/me`, `GET /ordenes`, `GET /ordenes/{ordenId}`
- `POST /notificaciones/enviar`, `GET /auditoria`
- 7 rutas `/admin/*` (colas, exchanges, bindings, purge)
- `POST /cupones`, `GET /cupones/{codigo}`, `GET /cupones/{codigo}/validar`
- `OPTIONS` sin autorizador solo en los paths que el navegador llama.

Integraciones **HTTP_PROXY** al backend (`http://<IP>:<puerto>/<path>`; los
parámetros `{id}`/`{codigo}` se sustituyen igual que el viejo `{proxy}`).
OJO al crearlas por CLI: `create-integration` exige
`--payload-format-version 1.0`, y `{id}` contra `{proxy+}` al mismo nivel da
`ConflictException` (borrar primero el proxy). Las rutas nuevas tardan ~20s
en propagar; los `update-integration` aplican altiro.

## 4. Authorizer Lambda dual (rutas seguras → 401/403 sin token válido)

`p360-dual` (REQUEST, payload 2.0, `EnableSimpleResponses`, TTL 300):
lee el `iss` sin verificar firma y delega — Azure (JWKS v1 + audience
`api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c`) o Cognito (JWKS del pool +
`token_use` + `aud`/`client_id`). Cualquier fallo responde
`{"isAuthorized":false}` (nunca deja pasar por excepción). Primero se prueba
con `lambda invoke` y tokens reales de ambos proveedores, y recién después se
adjunta a las rutas (`CUSTOM`). El JWT nativo quedó jubilado.

Los backends con Spring Security (productos, carrito, login) además validan
con **segundo issuer**: prueban Azure y recurren al JWKS del pool; Cognito
mapea a `ROLE_Cliente` (comprador) y la escritura del catálogo sigue
exigiendo `ROLE_Admin` solo-Azure.

Prueba: ruta pública → 200; sin token → **401**; token malo → **403**;
Azure/Cognito válidos → 200; Cognito en escritura → 403.

## 5. CORS (consola del HTTP API)

Cerrado al origen exacto del frontend (sin path: el `Origin` del navegador no
lleva path): `https://<API-FRONTEND>.execute-api.us-east-1.amazonaws.com`.
`Allow-Headers`: `content-type, authorization`.
`Allow-Methods`: `GET,POST,PUT,DELETE,OPTIONS`.
OJO: un preflight sin headers (`Origin` + `Access-Control-Request-Method`)
falla con 401 aunque todo esté bien — probar siempre con los headers reales.

## 6. Pruebas (evidencia 401/403 vs 200)

```bash
BASE="https://<API_ID>.execute-api.<REGION>.amazonaws.com/desarrollo"

curl -i $BASE/productos                                  # público -> 200
curl -i $BASE/carrito                                    # sin token -> 401
curl -i -H "Authorization: Bearer abc.def.ghi" $BASE/carrito  # inválido -> 403
curl -i -H "Authorization: Bearer $TOKEN" $BASE/carrito  # válido -> 200
curl -i -X POST $BASE/productos -H "Authorization: Bearer $TOKEN_CO"  # Cognito sin Admin -> 403
curl -i $BASE/carrito/otracosa                           # inventada -> 404
```

## 7. Frontend (nginx en EC2 + https vía Gateway)

1. Build prod (`ng build --configuration production`, `baseHref /desarrollo/`).
2. nginx con **fallback SPA** (`try_files $uri $uri/ /index.html`): sin esto,
   entrar directo a `/login` o recargar da 404.
3. Segundo **HTTP API** con ruta `{proxy+}` ANY →
   `http://<IP-EC2-FRONTEND>/{proxy}` (stage `desarrollo`); su Invoke URL es
   la URL pública https. (Este `{proxy+}` es solo para publicar el frontend,
   NO para el API de negocio.) **OJO: el Gateway quita el prefijo del stage
   antes de reenviar** — el backend siempre ve `/login` pelado, no
   `/desarrollo/login`; el nginx debe servir desde la raíz.
4. Esa URL https va a los **redirect URIs** en Azure, a los **callbacks** en
   Cognito y a `environment.prod.ts`. Redesplegar ambos.

```ts
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  useGateway: true,
  apiUrl: 'https://<API_ID_NEGOCIO>.execute-api.<REGION>.amazonaws.com/desarrollo',
  azure: { /* tenant e5372bf0-… + clientId 446c57cb-… (públicos, no secretos) */ },
  cognito: { /* pool + client + dominio propios (ver PENDIENTES.md) */ },
};
```

> El `MsalInterceptor` adjunta Azure y el `cognitoInterceptor` el id_token de
> Cognito (el access no trae `email` y carrito lo exige).

## Errores comunes AWS

- **401 en ruta que debería ser pública** → revisa qué rutas llevan autorizador.
- **Ruta nueva 404 los primeros segundos** → propagación (~20s); reintentar.
- **`ConflictException` al crear ruta** → `{id}` choca con `{proxy+}` al mismo
  nivel: borrar el proxy primero.
- **403 en todas las rutas con token válido** → `aud`/`iss` mal, o falta el
  rol (revisar claims con jwt.io).
- **502 en la integración** → EC2 caída o IP vieja tras reapertura del lab
  (actualizar integraciones).
- **Preflight 401 aislado** → probar con headers reales (ver sección 5).
- **Frontend 404 en deep-link** → falta el fallback SPA del punto 7.
