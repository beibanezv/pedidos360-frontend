import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ExperienciaService } from './experiencia.service';
import { OrdenService } from './orden.service';

describe('API autenticada de experiencia y órdenes', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  }));

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('paga con un alias sin enviar montos ni datos de tarjeta', () => {
    TestBed.inject(ExperienciaService).pagar('demo', 'RECHAZO').subscribe();
    const req = TestBed.inject(HttpTestingController).expectOne('http://localhost:8089/pagos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ordenId: 'demo', tarjetaDemo: 'RECHAZO' });
    req.flush({});
  });

  it('pide las órdenes del JWT sin especificar otro usuario', () => {
    TestBed.inject(OrdenService).misOrdenes().subscribe();
    const req = TestBed.inject(HttpTestingController).expectOne('http://localhost:8084/ordenes');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('distingue un pago aún no registrado de una falla de red', () => {
    let resultado: unknown = undefined;
    TestBed.inject(ExperienciaService).ultimoPago('demo').subscribe(pago => resultado = pago);
    TestBed.inject(HttpTestingController).expectOne('http://localhost:8089/pagos/demo')
      .flush(null, { status: 404, statusText: 'Not Found' });
    expect(resultado).toBeNull();
  });
});
