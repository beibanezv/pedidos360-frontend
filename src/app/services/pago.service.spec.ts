import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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
