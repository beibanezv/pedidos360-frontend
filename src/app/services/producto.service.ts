import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { Categoria, Producto, ProductoBackend } from '../core/models/producto';
import { PRODUCTOS_FALLBACK } from '../data/productos.mock';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly http = inject(HttpClient);

  /**
   * Si useGateway=true el catálogo se consume vía el API Gateway (un solo endpoint).
   * En desarrollo local apunta directo a ms-productos (:8081).
   */
  private get base(): string {
    return environment.useGateway ? environment.apiUrl : environment.productosUrl;
  }

  getProductos(categoria?: Categoria): Observable<Producto[]> {
    const params = categoria !== undefined ? new HttpParams().set('categoria', categoria) : undefined;
    return this.http.get<ProductoBackend[]>(`${this.base}/productos`, { params }).pipe(
      map((lista) => lista.map((raw) => new Producto(raw))),
      catchError((err) => {
        console.warn('[producto] API no alcanzable, usando catálogo mockeado:', err);
        return of(PRODUCTOS_FALLBACK.map((raw) => new Producto(raw)));
      }),
    );
  }
}