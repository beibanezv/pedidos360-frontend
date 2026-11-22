import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Producto, ProductoBackend } from '../core/models/producto';

export type TarjetaDemo = 'APROBACION' | 'RECHAZO';

export interface Pago {
  pagoId: string;
  ordenId: string;
  resultado: 'APROBADO' | 'RECHAZADO' | 'BLOQUEADO';
  totalClp: number;
  ocurrioEn: string;
}

@Injectable({ providedIn: 'root' })
export class ExperienciaService {
  private readonly http = inject(HttpClient);
  private readonly pagos = environment.useGateway ? environment.apiUrl : environment.pagosUrl;
  private readonly analytics = environment.useGateway ? environment.apiUrl : environment.analyticsUrl;

  pagar(ordenId: string, tarjetaDemo: TarjetaDemo) {
    return this.http.post<Pago>(`${this.pagos}/pagos`, { ordenId, tarjetaDemo });
  }

  ultimoPago(ordenId: string) {
    return this.http.get<Pago>(`${this.pagos}/pagos/${encodeURIComponent(ordenId)}`).pipe(
      catchError(error => error.status === 404 ? of(null) : throwError(() => error)),
    );
  }

  recomendaciones() {
    return this.http.get<ProductoBackend[]>(`${this.analytics}/recomendaciones`).pipe(
      map(productos => productos.map(p => new Producto(p))),
    );
  }

  ticketMetricas() {
    return this.http.post<{ ticket: string }>(`${this.analytics}/metricas/ticket`, null);
  }
}
