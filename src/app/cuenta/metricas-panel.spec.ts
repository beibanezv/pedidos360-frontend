import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { MetricasPanel } from './metricas-panel';
import { ExperienciaService } from '../services/experiencia.service';
import { environment } from '../../environments/environment';

describe('MetricasPanel (M08)', () => {
  const urlOriginal = environment.metricasWsUrl;
  const WebSocketOriginal = (globalThis as any).WebSocket;

  beforeEach(() => {
    environment.metricasWsUrl = 'wss://panel.test/ws/metricas';
  });

  afterEach(() => {
    environment.metricasWsUrl = urlOriginal;
    (globalThis as any).WebSocket = WebSocketOriginal;
    jasmine.clock().uninstall();
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

  it('mantiene el panel conectado mientras espera el broadcast de cada minuto', () => {
    jasmine.clock().install();
    (globalThis as any).WebSocket = class {
      onopen?: () => void;
      send = jasmine.createSpy('send');
      close = jasmine.createSpy('close');
      constructor(_url: string) {}
    };
    const ticket = jasmine.createSpy('ticketMetricas').and.returnValue(of({ ticket: 'abc123' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MetricasPanel],
      providers: [{ provide: ExperienciaService, useValue: { ticketMetricas: ticket } }],
    });
    const fixture = TestBed.createComponent(MetricasPanel);
    fixture.detectChanges();
    const panel = fixture.componentInstance as any;

    panel.conectar();
    jasmine.clock().tick(8_000);
    expect(panel.estado()).not.toContain('No llegaron datos');
    jasmine.clock().tick(85_000);
    expect(panel.estado()).toContain('No llegaron datos');
  });

  it('abre el socket con el ticket codificado y envía la suscripción al abrir', () => {
    const sockets: any[] = [];
    (globalThis as any).WebSocket = class {
      onopen?: () => void;
      send = jasmine.createSpy('send');
      close = jasmine.createSpy('close');
      constructor(readonly url: string) { sockets.push(this); }
    };
    const ticket = jasmine.createSpy('ticketMetricas').and.returnValue(of({ ticket: 'abc 123' }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [MetricasPanel],
      providers: [{ provide: ExperienciaService, useValue: { ticketMetricas: ticket } }],
    });
    const fixture = TestBed.createComponent(MetricasPanel);
    fixture.detectChanges();

    const panel = fixture.componentInstance as any;
    panel.conectar();
    const socket = sockets[0];
    expect(socket.url).toBe('wss://panel.test/ws/metricas?ticket=abc%20123');
    socket.onopen();
    expect(socket.send).toHaveBeenCalledOnceWith('{"action":"suscribir"}');
    panel.desconectar();
    expect(socket.close).toHaveBeenCalledTimes(1);
  });
});
