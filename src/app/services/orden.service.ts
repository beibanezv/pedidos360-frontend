import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { OrdenDTO } from '../core/models/orden';

@Injectable({ providedIn: 'root' })
export class OrdenService {
  private readonly http = inject(HttpClient);

  private get base(): string {
    return environment.useGateway ? environment.apiUrl : environment.ordenesUrl;
  }

  /** Órdenes del usuario logueado (se filtra por su oid/sub de Azure). */
  misOrdenes(usuarioId: string): Observable<OrdenDTO[]> {
    const id = encodeURIComponent(usuarioId);
    return this.http.get<OrdenDTO[]>(`${this.base}/ordenes?usuarioId=${id}`);
  }
}
