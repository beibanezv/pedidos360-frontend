import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { Categoria, Producto, ProductoBackend } from '../core/models/producto';
import { PRODUCTOS_FALLBACK } from '../data/productos.mock';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  // SIMPLIFICADO: GET /productos es público en el backend, así que usa un cliente
  // SIN interceptores. Con el MsalInterceptor (Redirect) un visitante anónimo
  // rebotaría al login de Microsoft apenas carga el Home.
  private readonly publicHttp = new HttpClient(inject(HttpBackend));
  // La escritura (POST/PUT/DELETE) exige JWT: usa el cliente interceptado.
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
    return this.publicHttp.get<ProductoBackend[]>(`${this.base}/productos`, { params }).pipe(
      map((lista) => lista.map((raw) => new Producto(raw))),
      catchError((err) => {
        console.warn('[producto] API no alcanzable, usando catálogo mockeado:', err);
        return of(PRODUCTOS_FALLBACK.map((raw) => new Producto(raw)));
      }),
    );
  }

  /** Crea un producto (ms-productos exige JWT; el id lo genera el backend). */
  crear(datos: Omit<ProductoBackend, 'id'>): Observable<ProductoBackend> {
    return this.http.post<ProductoBackend>(`${this.base}/productos`, datos);
  }

  /** Actualiza un producto existente (ms-productos exige JWT). */
  actualizar(id: string, datos: Omit<ProductoBackend, 'id'>): Observable<ProductoBackend> {
    return this.http.put<ProductoBackend>(`${this.base}/productos/${id}`, datos);
  }

  /** Elimina un producto (ms-productos exige JWT). */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/productos/${id}`);
  }
}