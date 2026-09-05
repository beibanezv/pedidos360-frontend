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
  // Invoke URL del API Gateway (stage "prod"). Sin "/api": los resources del
  // Gateway son /productos y /carrito (ver docs/aws-setup.md).
  apiUrl: 'https://TODO-GATEWAY.execute-api.REGION.amazonaws.com/prod',
  productosUrl: '',
  carritoUrl: '',
  azure: {
    clientId: '446c57cb-aba2-4b7a-ab01-6f2e6af7d35c',
    authority: 'https://login.microsoftonline.com/e5372bf0-c5e3-4286-887c-79069f209c1f',
    knownAuthorities: ['login.microsoftonline.com'],
    redirectUri: 'http://localhost:4200', // TODO fase 3: URL https pública del frontend
    apiScopes: [
      'api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c/Productos.Read',
      'api://446c57cb-aba2-4b7a-ab01-6f2e6af7d35c/Carrito.ReadWrite',
    ],
  },
};