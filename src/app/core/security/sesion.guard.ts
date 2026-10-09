import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';

import { CognitoAuthService } from './cognito-auth.service';

/**
 * Acepta cualquiera de las dos vías: cuenta MSAL/Azure o sesión Cognito.
 * Sin ninguna, redirige a /login (en vez de disparar el redirect de Azure).
 */
export const sesionGuard: CanActivateFn = () => {
  const msal = inject(MsalService);
  const cognito = inject(CognitoAuthService);
  const router = inject(Router);
  if (msal.instance.getAllAccounts().length > 0) return true;
  if (cognito.logueadoCognito()) return true;
  return router.createUrlTree(['/login']);
};
