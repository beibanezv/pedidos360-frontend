import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { MsalService } from '@azure/msal-angular';

import { CognitoAuthService } from './cognito-auth.service';
import { sesionGuard } from './sesion.guard';

describe('sesionGuard', () => {
  it('redirige a /login cuando la sesión Cognito ya no es válida', () => {
    const router = {
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
    } as unknown as Router;

    TestBed.configureTestingModule({
      providers: [
        { provide: MsalService, useValue: { instance: { getAllAccounts: () => [] } } },
        { provide: CognitoAuthService, useValue: { sesionValida: () => false } },
        { provide: Router, useValue: router },
      ],
    });

    const resultado = TestBed.runInInjectionContext(() =>
      sesionGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(resultado).toBeDefined();
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
