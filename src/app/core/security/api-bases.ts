import { environment } from '../../../environments/environment';

export const apiBases = [
  environment.apiUrl, environment.productosUrl, environment.carritoUrl, environment.loginUrl,
  environment.ordenesUrl, environment.pagosUrl, environment.analyticsUrl,
].filter(Boolean);

export function esApi(url: string): boolean {
  return apiBases.some(base => url === base || url.startsWith(base + '/') || url.startsWith(base + '?'));
}
