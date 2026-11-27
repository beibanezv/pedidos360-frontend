import { TestBed } from '@angular/core/testing';

import { CognitoAuthService } from './cognito-auth.service';

function jwt(exp: number): string {
  const payload = btoa(JSON.stringify({ sub: 'u-1', email: 'cliente@pedidos360.cl', exp }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${payload}.firma`;
}

describe('CognitoAuthService', () => {
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.clear();
    fetchSpy = spyOn(window, 'fetch');
  });

  function servicio(idToken?: string): CognitoAuthService {
    if (idToken) sessionStorage.setItem('p360-cognito-id', idToken);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(CognitoAuthService);
  }

  async function intentarCanje(service: CognitoAuthService, state?: string): Promise<unknown> {
    try {
      await service.completarLogin('codigo-falso', state);
      return null;
    } catch (e) {
      return e;
    }
  }

  it('no considera activo un id_token vencido y lo borra', () => {
    const service = servicio(jwt(Date.now() / 1000 - 10));

    expect(service.logueadoCognito()).toBeFalse();
    expect(service.token()).toBeNull();
    expect(sessionStorage.getItem('p360-cognito-id')).toBeNull();
  });

  it('descarta un id_token malformado', () => {
    const service = servicio('no-es-un-jwt');

    expect(service.logueadoCognito()).toBeFalse();
    expect(service.sesionValida()).toBeFalse();
    expect(sessionStorage.getItem('p360-cognito-id')).toBeNull();
  });

  it('mantiene la sesión con un id_token vigente', () => {
    const token = jwt(Date.now() / 1000 + 600);
    const service = servicio(token);

    expect(service.logueadoCognito()).toBeTrue();
    expect(service.token()).toBe(token);
    expect(service.claimsCognito()['email']).toBe('cliente@pedidos360.cl');
  });

  it('limpia la sesión si el token vence con la página abierta', () => {
    const service = servicio(jwt(Date.now() / 1000 + 600));
    sessionStorage.setItem('p360-cognito-id', jwt(Date.now() / 1000 - 1));

    expect(service.sesionValida()).toBeFalse();
    expect(service.logueadoCognito()).toBeFalse();
    expect(sessionStorage.getItem('p360-cognito-id')).toBeNull();
  });

  it('descarta el codigo si el state no coincide con el guardado (CSRF)', async () => {
    sessionStorage.setItem('p360-cognito-state', 'estado-esperado');
    const service = servicio();

    const error = await intentarCanje(service, 'estado-atacante');

    expect(error).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('descarta el codigo si el Hosted UI no devuelve state', async () => {
    sessionStorage.setItem('p360-cognito-state', 'estado-esperado');
    const service = servicio();

    const error = await intentarCanje(service, undefined);

    expect(error).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('borra el state guardado aunque el canje falle, para que no se reutilice', async () => {
    sessionStorage.setItem('p360-cognito-state', 'estado-esperado');
    const service = servicio();

    await intentarCanje(service, 'estado-atacante');

    expect(sessionStorage.getItem('p360-cognito-state')).toBeNull();
  });
});
