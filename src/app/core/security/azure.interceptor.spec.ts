import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MsalService } from '@azure/msal-angular';
import { of, throwError } from 'rxjs';

import { azureInterceptor } from './azure.interceptor';

function mockMsal(cuentas: unknown[], token = 'tok-azure') {
  return {
    instance: {
      getAllAccounts: () => cuentas,
      getActiveAccount: () => cuentas[0] ?? null,
    },
    acquireTokenSilent: () => of({ accessToken: token }),
  };
}

describe('azureInterceptor', () => {
  let http: HttpClient;
  let testing: HttpTestingController;

  function configurar(msal: unknown): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([azureInterceptor])),
        provideHttpClientTesting(),
        { provide: MsalService, useValue: msal },
      ],
    });
    http = TestBed.inject(HttpClient);
    testing = TestBed.inject(HttpTestingController);
  }

  afterEach(() => testing.verify());

  it('sin cuenta MSAL deja pasar el request sin Authorization', () => {
    configurar(mockMsal([]));

    http.get('http://localhost:8082/carrito').subscribe();

    const req = testing.expectOne('http://localhost:8082/carrito');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('con cuenta adjunta el Bearer del silent', () => {
    configurar(mockMsal([{ username: 'a' }]));

    http.get('http://localhost:8082/carrito').subscribe();

    const req = testing.expectOne('http://localhost:8082/carrito');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-azure');
    req.flush({});
  });

  it('si falla el silent deja pasar sin Authorization (nunca redirige)', () => {
    const msal = {
      ...mockMsal([{ username: 'a' }]),
      acquireTokenSilent: () => throwError(() => new Error('sin red')),
    };
    configurar(msal);

    http.get('http://localhost:8082/carrito').subscribe();

    const req = testing.expectOne('http://localhost:8082/carrito');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('no toca URLs fuera de las bases conocidas', () => {
    configurar(mockMsal([{ username: 'a' }]));

    http.get('https://otro.example/cosa').subscribe();

    const req = testing.expectOne('https://otro.example/cosa');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('no pisa un Authorization ya puesto', () => {
    configurar(mockMsal([{ username: 'a' }]));

    http.get('http://localhost:8082/carrito', { headers: { Authorization: 'Bearer id-cognito' } }).subscribe();

    const req = testing.expectOne('http://localhost:8082/carrito');
    expect(req.request.headers.get('Authorization')).toBe('Bearer id-cognito');
    req.flush({});
  });
});
