import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ProductoService } from './producto.service';
import type { ProductoBackend } from '../core/models/producto';

describe('ProductoService', () => {
  let service: ProductoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('mapea el JSON del backend a la vista (titulo/artista/precio/arte)', () => {
    const backend: ProductoBackend[] = [
      { id: 'id-1', nombre: 'Nocturno', artistaOMarca: 'Ana Volant', categoria: 'vinilo', precioClp: 19990, stock: 4 },
    ];

    let titulo = '';
    service.getProductos().subscribe((lista) => {
      titulo = lista[0]?.titulo ?? '';
      expect(lista[0]?.artista).toBe('Ana Volant');
      expect(lista[0]?.precio).toBe(19990);
      expect(lista[0]?.etiqueta).toBe('Vinilos');
    });

    const req = http.expectOne('http://localhost:8081/productos');
    expect(req.request.method).toBe('GET');
    req.flush(backend);
    expect(titulo).toBe('Nocturno');
  });

  it('filtra por categoría con query param', () => {
    service.getProductos('tornamesa').subscribe();

    const req = http.expectOne('http://localhost:8081/productos?categoria=tornamesa');
    expect(req.request.params.get('categoria')).toBe('tornamesa');
    req.flush([]);
  });

  it('usa catálogo mockeado si la API falla', () => {
    let n = 0;
    service.getProductos().subscribe((lista) => (n = lista.length));

    const req = http.expectOne('http://localhost:8081/productos');
    req.flush('error', { status: 500, statusText: 'Server Error' });
    expect(n).toBeGreaterThan(0);
  });
});