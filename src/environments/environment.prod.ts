/**
 * Entorno de producción: el frontend siempre apunta al API Gateway de AWS.
 * Es el archivo que Angular inyecta al buildar con --configuration production
 * (fileReplacements en angular.json).
 *
 * Reemplaza el TODO-GATEWAY y el redirectUri con los valores reales al desplegar (fase 3).
 * clientId/tenantId NO son secretos: este archivo SÍ se commitea.
 */
export const environment = {
  production: true,
  useGateway: true,
  // Invoke URL del API Gateway de negocio (stage "desarrollo").
  // Los resources del Gateway son /productos, /carrito y /login (ver docs/aws-setup.md).
  apiUrl: 'https://13uwepgzy9.execute-api.us-east-1.amazonaws.com/desarrollo',
  productosUrl: '',
  carritoUrl: '',
  loginUrl: '',
  azure: {
    clientId: '446c57cb-aba2-4b7a-ab01-6f2e6af7d35c',
    authority: 'https://login.microsoftonline.com/e5372bf0-c5e3-4286-887c-79069f209c1f',
    knownAuthorities: ['login.microsoftonline.com'],
    redirectUri: 'https://4zg0frz1qg.execute-api.us-east-1.amazonaws.com/desarrollo/', // URL https pública del frontend (vía Gateway, con slash: el path vacío no calza en las rutas del API)
    apiScopes: [
      'api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c/Productos.Read',
      'api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c/Carrito.ReadWrite',
    ],
  },
};