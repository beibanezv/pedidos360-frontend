import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { catchError, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { esApi } from './api-bases';

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
  if (req.headers.has('Authorization') || !esApi(req.url)) return next(req);
  const msal = inject(MsalService);
  const cuentas = msal.instance.getAllAccounts();
  if (cuentas.length === 0) return next(req);
  const cuenta = msal.instance.getActiveAccount() ?? cuentas[0];
  return msal.acquireTokenSilent({ scopes: environment.azure.apiScopes, account: cuenta }).pipe(
    catchError(() => of(null)),
    switchMap((res) => next(res ? req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }) : req)),
  );
};
