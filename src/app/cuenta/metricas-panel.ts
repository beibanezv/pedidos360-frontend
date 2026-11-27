import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { ExperienciaService } from '../services/experiencia.service';

const MAX_REINTENTOS = 3;

const MEDIDAS = [
  { clave: 'vistasProducto', etiqueta: 'Fichas consultadas' },
  { clave: 'productosAgregados', etiqueta: 'Productos agregados' },
  { clave: 'pagosAprobados', etiqueta: 'Pagos aprobados' },
  { clave: 'alertasAntifraude', etiqueta: 'Bloqueos antifraude' },
] as const;
type Metricas = Record<typeof MEDIDAS[number]['clave'], number>;

@Component({
  selector: 'app-metricas-panel',
  template: `
    <section aria-labelledby="metricas-titulo">
      <h2 id="metricas-titulo">Actividad en vivo</h2>
      <p class="lead">Últimas 24 horas en la tienda · Solo administradores</p>
      @if (metricas(); as datos) {
        <dl>
          @for (medida of medidas; track medida.clave) {
            <div><dt>{{ medida.etiqueta }}</dt><dd>{{ datos[medida.clave] }}</dd></div>
          }
        </dl>
      }
      @if (habilitado) {
        <div class="conexion">
          <p class="lead" role="status">{{ estado() }}</p>
          @if (conectado() || conectando()) {
            <button type="button" class="btn-ghost" (click)="desconectar()">Desconectar</button>
          } @else {
            <button type="button" class="btn-ghost" (click)="conectar()">Conectar panel</button>
          }
        </div>
      } @else {
        <p class="lead">La conexión en vivo aún no está habilitada en este entorno.</p>
      }
    </section>
  `,
  styles: `
    section { margin-block: 28px; padding-block: 20px; border-block: 1px solid var(--hair); }
    section > .lead { margin-top: 6px; }
    dl { display: grid; margin: 18px 0 8px; }
    dl > div {
      display: flex; justify-content: space-between; gap: 16px; padding: 8px 0;
      border-bottom: 1px solid var(--hair); align-items: baseline;
    }
    dd { margin: 0; color: var(--copper); font-family: 'IBM Plex Mono', monospace; }
    .conexion { display: flex; align-items: center; gap: 8px 16px; flex-wrap: wrap; }
    .conexion p { margin: 0; }
  `,
})
export class MetricasPanel {
  private readonly servicio = inject(ExperienciaService);
  private readonly destroy = inject(DestroyRef);
  private socket?: WebSocket;
  private espera?: ReturnType<typeof setTimeout>;
  private intento = 0;
  private reintentos = 0;
  protected readonly medidas = MEDIDAS;
  protected readonly habilitado = !!environment.metricasWsUrl;
  protected readonly metricas = signal<Metricas | null>(null);
  protected readonly estado = signal('Panel desconectado.');
  protected readonly conectando = signal(false);
  protected readonly conectado = signal(false);

  constructor() {
    this.destroy.onDestroy(() => this.desconectar());
  }

  conectar(): void {
    if (!this.habilitado || this.conectado() || this.conectando()) return;
    if (this.reintentos >= MAX_REINTENTOS) {
      this.estado.set('Se agotaron los reintentos. Vuelve a cargar la página para intentar de nuevo.');
      return;
    }
    const intento = ++this.intento;
    this.conectando.set(true);
    this.estado.set('Abriendo conexión segura…');
    this.servicio.ticketMetricas().pipe(timeout(8000), takeUntilDestroyed(this.destroy)).subscribe({
      next: ({ ticket }) => {
        if (intento !== this.intento) return;
        try {
          const socket = new WebSocket(environment.metricasWsUrl);
          this.socket = socket;
          this.esperarDatos();
          socket.onopen = () => {
            if (this.socket === socket) socket.send(ticket);
          };
          socket.onmessage = event => {
            if (this.socket !== socket) return;
            try {
              const datos: Metricas = JSON.parse(event.data);
              if (!datos || !MEDIDAS.every(({ clave }) => Number.isSafeInteger(datos[clave]) && datos[clave] >= 0)) {
                throw new Error();
              }
              this.metricas.set(datos);
              this.reintentos = 0;
              this.conectando.set(false);
              this.conectado.set(true);
              this.estado.set('Recibiendo datos en vivo.');
              this.esperarDatos();
            } catch {
              this.fallo('No se pudieron leer las métricas. Vuelve a conectar.');
            }
          };
          socket.onclose = () => {
            if (this.socket === socket) this.fallo('La conexión se cerró. Vuelve a conectar.');
          };
          socket.onerror = () => {
            if (this.socket === socket) this.fallo('No se pudo conectar con las métricas. Intenta de nuevo.');
          };
        } catch {
          this.fallo('No se pudo abrir el panel. Intenta de nuevo.');
        }
      },
      error: () => {
        if (intento === this.intento) this.fallo('No se pudo autorizar el panel. Revisa tu sesión e intenta de nuevo.');
      },
    });
  }

  desconectar(): void {
    this.reintentos = 0;
    this.cerrar('Panel desconectado.');
  }

  private fallo(mensaje: string): void {
    this.reintentos++;
    this.cerrar(this.reintentos >= MAX_REINTENTOS
      ? 'Se agotaron los reintentos. Vuelve a cargar la página para intentar de nuevo.'
      : mensaje);
  }

  private esperarDatos(): void {
    clearTimeout(this.espera);
    this.espera = setTimeout(() => this.fallo('No llegaron datos. Vuelve a conectar.'), 8000);
  }

  private cerrar(mensaje: string): void {
    this.intento++;
    clearTimeout(this.espera);
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
    this.conectando.set(false);
    this.conectado.set(false);
    this.metricas.set(null);
    this.estado.set(mensaje);
  }
}
