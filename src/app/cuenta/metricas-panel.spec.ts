import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';

import { MetricasPanel } from './metricas-panel';
import { ExperienciaService } from '../services/experiencia.service';
import { environment } from '../../environments/environment';

describe('MetricasPanel (M08)', () => {
  const urlOriginal = environment.metricasWsUrl;

  beforeEach(() => {
    environment.metricasWsUrl = 'wss://panel.test/ws/metricas';
  });

  afterEach(() => {
    environment.metricasWsUrl = urlOriginal;
  });

  it('detiene los reintentos después de tres fallos de autorización', () => {
    const ticket = jasmine.createSpy('ticketMetricas').and.returnValue(throwError(() => new Error('403')));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MetricasPanel],
      providers: [{ provide: ExperienciaService, useValue: { ticketMetricas: ticket } }],
    });
    const fixture = TestBed.createComponent(MetricasPanel);
    fixture.detectChanges();

    const panel = fixture.componentInstance as any;
    panel.conectar();
    panel.conectar();
    panel.conectar();
    panel.conectar();

    expect(ticket).toHaveBeenCalledTimes(3);
    expect(panel.estado()).toContain('Se agotaron los reintentos');
  });
});
