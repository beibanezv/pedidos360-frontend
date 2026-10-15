import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { catchError, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * Adjunta el access token de Azure solo cuando hay cuenta MSAL.
 *
 * Reemplaza al MsalInterceptor de clase (interactionType Redirect): ese, ante
 * un 401/403 del backend, disparaba el login interactivo de Azure aunque el
 * request llevara token de Cognito (o ninguno), secuestrando las sesiones
 * solo-Cognito hacia Microsoft. Este solo adjunta y nunca redirige: sin
 * cuenta, sin URL conocida o si falla el silent, el request pasa tal cual y
 * el error se muestra en la UI para re-loguearse a mano.
 */
export const azureInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has('Authorization')) return next(req);
  const msal = inject(MsalService);
  const cuentas = msal.instance.getAllAccounts();
  if (cuentas.length === 0) return next(req);
  const scopes = scopesPara(req.url);
  if (!scopes) return next(req);
  const cuenta = msal.instance.getActiveAccount() ?? cuentas[0];
  return msal.acquireTokenSilent({ scopes, account: cuenta }).pipe(
    switchMap((res) => next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }))),
    catchError(() => next(req)),
  );
};

function scopesPara(url: string): string[] | null {
  const bases = [
    environment.apiUrl,
    environment.productosUrl,
    environment.carritoUrl,
    environment.loginUrl,
    environment.ordenesUrl,
  ].filter((b) => !!b);
  return bases.some((b) => url.startsWith(b)) ? environment.azure.apiScopes : null;
}
