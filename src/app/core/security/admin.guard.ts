import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Guard por rol: deja pasar solo al claim `roles` = "Admin" y espera a que los
 * claims del access token estén cargados (evita redirecciones prematuras).
 */
export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.asegurarClaims();
  return auth.esAdmin() ? true : router.createUrlTree(['/']);
};