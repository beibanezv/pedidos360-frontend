import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PagoService } from './pago.service';

describe('PagoService', () => {
  let service: PagoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PagoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('inicia WebPay enviando solo el ordenId', () => {
    service.iniciar('orden-1').subscribe();

    const req = http.expectOne('http://localhost:8089/pagos/webpay/iniciar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ordenId: 'orden-1' });
    req.flush({ url: 'https://webpay.test/pagar', token: 'token-1' });
    http.expectNone('http://localhost:8089/webpay/iniciar');
  });

  it('propaga el 409 de orden no pagable sin reintentar el POST', () => {
    let estado = 0;
    service.iniciar('orden-1').subscribe({ error: (fallo: HttpErrorResponse) => (estado = fallo.status) });

    const req = http.expectOne('http://localhost:8089/pagos/webpay/iniciar');
    req.flush({ mensaje: 'orden no pagable' }, { status: 409, statusText: 'Conflict' });

    expect(estado).toBe(409);
  });

  it('propaga el 429 de antifraude sin reintentar el POST', () => {
    let estado = 0;
    service.iniciar('orden-1').subscribe({ error: (fallo: HttpErrorResponse) => (estado = fallo.status) });

    const req = http.expectOne('http://localhost:8089/pagos/webpay/iniciar');
    req.flush({ mensaje: 'antifraude' }, { status: 429, statusText: 'Too Many Requests' });

    expect(estado).toBe(429);
  });

  it('consulta el resultado con la ruta del pago', () => {
    let resultado = '';
    service.consultar('orden-1').subscribe((pago) => (resultado = pago.resultado));

    const req = http.expectOne('http://localhost:8089/pagos/orden-1');
    expect(req.request.method).toBe('GET');
    req.flush({ pagoId: 'p1', ordenId: 'orden-1', resultado: 'APROBADO', totalClp: 18990, ocurrioEn: '2026-11-24T12:00:00Z' });
    expect(resultado).toBe('APROBADO');
  });
});
