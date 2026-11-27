import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Cuenta } from './cuenta';
import { AuthService } from '../core/security/auth.service';
import { CognitoAuthService } from '../core/security/cognito-auth.service';
import { environment } from '../../environments/environment';

describe('Cuenta (configuración visible)', () => {
  it('toma el pool de Cognito de la configuración, no de un texto fijo', async () => {
    await TestBed.configureTestingModule({
      imports: [Cuenta],
      providers: [
        {
          provide: AuthService,
          useValue: { logueado: () => false, claims: () => ({}), perfilLogin: () => of(null) },
        },
        {
          provide: CognitoAuthService,
          useValue: {
            logueadoCognito: () => true,
            claimsCognito: () => ({ sub: 'u-1' }),
            nombreCognito: () => 'Cliente',
          },
        },
      ],
    })
      .overrideComponent(Cuenta, { set: { template: '<span>{{ poolId }}</span>', imports: [] } })
      .compileComponents();

    const fixture = TestBed.createComponent(Cuenta);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(environment.cognito.userPoolId);
  });
});
