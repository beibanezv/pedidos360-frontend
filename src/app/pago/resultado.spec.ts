import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { Resultado } from './resultado';
import { PagoService } from '../services/pago.service';

describe('Resultado', () => {
  it('muestra el resultado aprobado devuelto por el backend', async () => {
    await TestBed.configureTestingModule({
      imports: [Resultado],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ ordenId: 'orden-1' }) } },
        },
        {
          provide: PagoService,
          useValue: {
            consultar: () => of({
              pagoId: 'p1',
              ordenId: 'orden-1',
              resultado: 'APROBADO',
              totalClp: 18990,
              ocurrioEn: '2026-11-24T12:00:00Z',
            }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Resultado);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('¡Pago aprobado!');
    expect(fixture.nativeElement.textContent).toContain('APROBADO');
  });
});
