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

  /** El servidor obtiene al dueño desde el JWT. */
  misOrdenes(): Observable<OrdenDTO[]> {
    return this.http.get<OrdenDTO[]>(`${this.base}/ordenes`);
  }
}
