import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import { Resultado } from './resultado';
import { PagoDTO, PagoService } from '../services/pago.service';

describe('Resultado (M10)', () => {
  const aprobado: PagoDTO = {
    pagoId: 'p1',
    ordenId: 'orden-1',
    resultado: 'APROBADO',
    totalClp: 18990,
    ocurrioEn: '2026-11-24T12:00:00Z',
  };

  function crear(params: Record<string, string>, respuesta: () => Observable<PagoDTO>): {
    fixture: ComponentFixture<Resultado>;
    consultar: jasmine.Spy;
  } {
    const consultar = jasmine.createSpy('consultar').and.callFake(respuesta);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Resultado],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(params) } },
        },
        { provide: PagoService, useValue: { consultar } },
      ],
    });
    const fixture = TestBed.createComponent(Resultado);
    fixture.detectChanges();
    return { fixture, consultar };
  }

  function texto(fixture: ComponentFixture<Resultado>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function botonReintentar(fixture: ComponentFixture<Resultado>): HTMLButtonElement {
    const botones = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const boton = botones.find((b) => b.textContent?.includes('Reintentar consulta'));
    expect(boton).toBeDefined();
    return boton as HTMLButtonElement;
  }

  it('muestra el resultado aprobado devuelto por el backend', () => {
    const { fixture } = crear({ ordenId: 'orden-1' }, () => of(aprobado));

    expect(texto(fixture)).toContain('¡Pago aprobado!');
    expect(texto(fixture)).toContain('APROBADO');
  });

  it('muestra «pago en verificación» sin afirmar aprobación cuando el backend devuelve PENDIENTE', () => {
    const { fixture } = crear({ ordenId: 'orden-1' }, () => of({ ...aprobado, resultado: 'PENDIENTE' }));

    expect(texto(fixture)).toContain('Pago en verificación');
    expect(texto(fixture)).toContain('Todavía no hay confirmación de aprobación');
    expect(texto(fixture)).toContain('PENDIENTE');
    expect(texto(fixture)).not.toContain('¡Pago aprobado!');
    expect(botonReintentar(fixture)).toBeDefined();
  });

  it('ignora ?resultado=APROBADO y consulta siempre el estado persistido', () => {
    const { fixture, consultar } = crear(
      { ordenId: 'orden-1', resultado: 'APROBADO' },
      () => of({ ...aprobado, resultado: 'PENDIENTE' }),
    );

    expect(consultar).toHaveBeenCalledWith('orden-1');
    expect(texto(fixture)).toContain('Pago en verificación');
    expect(texto(fixture)).not.toContain('¡Pago aprobado!');
  });

  it('ofrece mensaje recuperable y reconsulta ante un rechazo', () => {
    const { fixture, consultar } = crear({ ordenId: 'orden-1' }, () => of({ ...aprobado, resultado: 'RECHAZADO' }));

    expect(texto(fixture)).toContain('Pago no aprobado');
    expect(texto(fixture)).toContain('Verifica el estado');
    botonReintentar(fixture).click();
    fixture.detectChanges();

    expect(consultar).toHaveBeenCalledTimes(2);
  });

  it('permite reintentar la consulta tras un error del servidor', () => {
    let llamadas = 0;
    const { fixture, consultar } = crear({ ordenId: 'orden-1' }, () => {
      llamadas++;
      return llamadas === 1
        ? throwError(() => new HttpErrorResponse({ status: 500 }))
        : of(aprobado);
    });

    expect(texto(fixture)).toContain('No pudimos verificar el pago');
    expect(texto(fixture)).toContain('podría estar aún en curso');
    botonReintentar(fixture).click();
    fixture.detectChanges();

    expect(consultar).toHaveBeenCalledTimes(2);
    expect(texto(fixture)).toContain('¡Pago aprobado!');
  });

  it('no afirma aprobación si el retorno repetido llega sin ordenId', () => {
    const { fixture, consultar } = crear({ resultado: 'APROBADO' }, () => of(aprobado));

    expect(consultar).not.toHaveBeenCalled();
    expect(texto(fixture)).toContain('Revisa tus órdenes para ver el estado real');
    expect(texto(fixture)).not.toContain('¡Pago aprobado!');
  });

  it('repite la consulta GET en un retorno repetido sin cambiar el resultado', () => {
    const { fixture, consultar } = crear(
      { ordenId: 'orden-1', resultado: 'APROBADO' },
      () => of({ ...aprobado, resultado: 'PENDIENTE' }),
    );
    (fixture.componentInstance as Resultado).consultar();
    fixture.detectChanges();

    expect(consultar).toHaveBeenCalledTimes(2);
    expect(consultar).toHaveBeenCalledWith('orden-1');
    expect(texto(fixture)).toContain('Pago en verificación');
  });
});
