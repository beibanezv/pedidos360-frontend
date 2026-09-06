# Registro de evidencias — Pedidos360 (EP1 / EP2)

Mini-informe del sistema funcionando. Cada punto tiene la foto que lo prueba,
qué demuestra y cómo repetirlo. Sirve como anexo para AVA/email y como guion
de la presentación.

## Cómo agregar una foto

1. Guarda la captura en la carpeta `docs/evidencias/` con nombre ordenado
   (ej: `01-cuenta-chips.png`).
2. Reemplaza la línea `<!-- foto: ... -->` por:
   `![descripción corta](evidencias/01-cuenta-chips.png)`
3. En GitHub la foto se ve sola. Para el email al profesor adjunta las fotos
   o exporta este archivo a PDF.

## 1. Login con Microsoft y tokens

- [x] **Mi cuenta con nombre, roles y scopes**
  ![Mi cuenta con nombre, roles y scopes](evidencias/01-cuenta-chips.png)
  Qué demuestra: el login con Microsoft entrega un token con los permisos
  esperados (roles Cliente/Admin, scopes Productos.Read y Carrito.ReadWrite).
  Cómo repetirla: Ingresar → Continuar con Microsoft → abrir Mi cuenta.

- [x] **Datos del usuario según ms-login**
  ![Datos del usuario según ms-login](evidencias/02-cuenta-login-me.png)
  Qué demuestra: el microservicio ms-login lee el token y devuelve los datos
  del usuario (sección "Datos desde ms-login" en Mi cuenta).
  Cómo repetirla: con sesión iniciada, abrir Mi cuenta y bajar a esa sección.

## 2. Acceso bloqueado sin login (401)

- [x] **Agregar sin login: error 401 real en consola y red**
  ![Error 401 en consola](evidencias/03-401-consola.png)
  ![Peticiones OPTIONS y POST 401 en red](evidencias/04-401-red.png)
  Qué demuestra: sin sesión no hay token, el backend rechaza con 401 y la
  página lleva al login. Las dos líneas (OPTIONS 200 de permiso + POST 401
  de rechazo) son el comportamiento esperado.
  Cómo repetirla: sin login, en Home o Catálogo pulsar Agregar con la
  consola y la pestaña Red abiertas.

## 3. Roles y administración

- [x] **Panel admin solo para rol Admin**
  ![Panel de administración](evidencias/05-admin-panel.png)
  Qué demuestra: la ruta /admin solo se abre con el rol Admin.
  Cómo repetirla: con sesión Admin, abrir Administración.

- [x] **Crear y eliminar un producto**
  ![Crear un producto](evidencias/06-admin-crear.png)
  ![Eliminar un producto](evidencias/07-admin-eliminar.png)
  Qué demuestra: el rol Admin administra el catálogo (ms-productos).
  Cómo repetirla: en Administración, crear un producto de prueba y
  eliminarlo después.

## 4. Microservicios corriendo

- [x] **Bases de datos y servicios arriba**
  ![Contenedores Docker corriendo](evidencias/08-docker-ps.png)
  Qué demuestra: Postgres de productos y carrito corriendo en Docker.
  Cómo repetirla: `docker ps` en el equipo de desarrollo.

- [x] **Catálogo público responde**
  ![Respuesta del catálogo público](evidencias/09-get-productos.png)
  Qué demuestra: ms-productos responde el catálogo sin login (ruta pública).
  Cómo repetirla: abrir `http://localhost:8081/productos` en el navegador.

## 5. Problemas encontrados y solución

| Problema | Qué pasaba | Solución |
|---|---|---|
| CORS | El navegador bloqueaba las llamadas del frontend a los MS | Permitir `http://localhost:4200` en los 3 MS |
| Token no llegaba | El interceptor no adjuntaba el JWT (versión nueva exige `/*`) | Mapa con `/*` por servicio |
| Rebote al login de Microsoft | Entrar a la home redirigía a Microsoft | El catálogo público no pide token |
| Error NG0203 | `inject()` fuera de contexto al agregar sin login | Inyección como campo de la clase |
| Cuenta personal rechazada | La app solo acepta cuentas del tenant del curso | Invitación de invitado + rol Cliente |
| Sin permiso de registro | La cuenta no administra flujos de usuario del tenant | Lo configura el profesor; invitación como alternativa |

## 6. Pendiente: AWS (cuando haya curso fresco)

- [ ] Rutas del API Gateway (`/productos/*`, `/carrito/*`, `/login/*`).
- [ ] Autorizador JWT contra Azure (rechazo 401/403 vs 200 autorizado).
- [ ] CORS restringido al origen del frontend.
- [ ] Instancias EC2 + base de datos RDS corriendo.
