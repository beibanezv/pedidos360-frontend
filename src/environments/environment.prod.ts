/**
 * Entorno de producción: el frontend siempre apunta al API Gateway de AWS.
 * Es el archivo que Angular inyecta al buildar con --configuration production
 * (fileReplacements en angular.json).
 *
 * Reemplaza los TODO-* con los valores reales de Azure y del Gateway cuando existan.
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
    clientId: 'TODO-AZURE-CLIENT-ID',
    authority: 'https://login.microsoftonline.com/TODO-AZURE-TENANT-ID',
    knownAuthorities: ['login.microsoftonline.com'],
    redirectUri: 'http://localhost:4200',
    apiScopes: [
      'api://TODO-AZURE-CLIENT-ID/Productos.Read',
      'api://TODO-AZURE-CLIENT-ID/Carrito.ReadWrite',
    ],
  },
};