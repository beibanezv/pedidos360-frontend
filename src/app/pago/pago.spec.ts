import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NEVER, throwError } from 'rxjs';

import { Pago } from './pago';
import { PagoService } from '../services/pago.service';

describe('Pago (M10)', () => {
  function crear(fallo: () => ReturnType<typeof throwError>): {
    fixture: ComponentFixture<Pago>;
    iniciar: jasmine.Spy;
  } {
    const iniciar = jasmine.createSpy('iniciar').and.callFake(fallo);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Pago],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ ordenId: 'orden-1' }),
              queryParamMap: convertToParamMap({ total: '18990' }),
            },
          },
        },
        { provide: PagoService, useValue: { iniciar } },
      ],
    });
    const fixture = TestBed.createComponent(Pago);
    fixture.detectChanges();
    return { fixture, iniciar };
  }

  function texto(fixture: ComponentFixture<Pago>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('explica el 409 (orden no pagable) y no repite el POST', () => {
    const { fixture, iniciar } = crear(() => throwError(() => new HttpErrorResponse({ status: 409 })));
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    fixture.detectChanges();

    expect(iniciar).toHaveBeenCalledTimes(1);
    expect(iniciar).toHaveBeenCalledWith('orden-1');
    expect(texto(fixture)).toContain('no se puede pagar en su estado actual');
    expect(texto(fixture)).toContain('Ver mis órdenes');
  });

  it('explica el antifraude del 429 y no reintenta automáticamente', () => {
    const { fixture, iniciar } = crear(() => throwError(() => new HttpErrorResponse({ status: 429 })));
    (fixture.nativeElement as HTMLElement).querySelector('button')?.click();
    fixture.detectChanges();

    expect(iniciar).toHaveBeenCalledTimes(1);
    expect(texto(fixture)).toContain('control antifraude');
    expect(texto(fixture)).toContain('Espera unos segundos');
  });

  it('un doble clic mientras conecta no genera un segundo POST', () => {
    const { fixture, iniciar } = crear(() => NEVER);
    const componente = fixture.componentInstance as Pago;
    componente.iniciar();
    componente.iniciar();

    expect(iniciar).toHaveBeenCalledTimes(1);
  });
});
