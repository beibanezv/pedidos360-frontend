import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface InicioWebpay {
  url: string;
  token: string;
}

export interface PagoDTO {
  pagoId: string;
  ordenId: string;
  resultado: 'APROBADO' | 'RECHAZADO' | 'BLOQUEADO' | 'PENDIENTE';
  totalClp: number;
  ocurrioEn: string;
}

@Injectable({ providedIn: 'root' })
export class PagoService {
  private readonly http = inject(HttpClient);

  private get base(): string {
    return environment.useGateway ? environment.apiUrl : environment.pagosUrl;
  }

  /**
   * El total se obtiene en el backend desde la orden, no se fía del cliente.
   * Ruta canónica: /pagos/webpay/iniciar (NO el alias /webpay/iniciar).
   * Los errores 409 (orden no pagable) y 429 (antifraude) se propagan tal cual:
   * el servicio no reintenta el POST; la UI decide qué mensaje mostrar.
   */
  iniciar(ordenId: string): Observable<InicioWebpay> {
    return this.http.post<InicioWebpay>(`${this.base}/pagos/webpay/iniciar`, { ordenId });
  }

  /**
   * Estado auténtico del pago, consultado con el JWT de la sesión.
   * Es la única fuente de verdad: ni el query string del retorno ni el POST
   * de inicio permiten afirmar que el pago fue aprobado.
   */
  consultar(ordenId: string): Observable<PagoDTO> {
    return this.http.get<PagoDTO>(`${this.base}/pagos/${ordenId}`);
  }
}
