import { TestBed } from '@angular/core/testing';

import { CognitoAuthService } from './cognito-auth.service';

describe('CognitoAuthService', () => {
  let service: CognitoAuthService;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CognitoAuthService);
    fetchSpy = spyOn(window, 'fetch');
  });

  async function intentarCanje(state?: string): Promise<unknown> {
    try {
      await service.completarLogin('codigo-falso', state);
      return null;
    } catch (e) {
      return e;
    }
  }

  it('descarta el codigo si el state no coincide con el guardado (CSRF)', async () => {
    sessionStorage.setItem('p360-cognito-state', 'estado-esperado');

    const error = await intentarCanje('estado-atacante');

    expect(error).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('descarta el codigo si el Hosted UI no devuelve state', async () => {
    sessionStorage.setItem('p360-cognito-state', 'estado-esperado');

    const error = await intentarCanje(undefined);

    expect(error).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('borra el state guardado aunque el canje falle, para que no se reutilice', async () => {
    sessionStorage.setItem('p360-cognito-state', 'estado-esperado');

    await intentarCanje('estado-atacante');

    expect(sessionStorage.getItem('p360-cognito-state')).toBeNull();
  });
});
