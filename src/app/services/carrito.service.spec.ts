import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CarritoService } from './carrito.service';
import { Producto } from '../core/models/producto';
import type { CarritoDTO } from '../core/models/carrito';

const producto = new Producto({
  id: 'prod-1',
  nombre: 'Nocturno',
  artistaOMarca: 'Ana Volant',
  categoria: 'vinilo',
  precioClp: 19990,
  stock: 4,
});

describe('CarritoService', () => {
  let service: CarritoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CarritoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('agregarItem envía productoId + cantidad + precioUnitarioClp', () => {
    service.agregarItem(producto, 2).subscribe();

    const req = http.expectOne('http://localhost:8082/carrito/items');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      productoId: 'prod-1',
      cantidad: 2,
      precioUnitarioClp: 19990,
    });
    req.flush({ id: 'item-1' });
  });

  it('obtenerCarrito actualiza el badge con la suma de cantidades', () => {
    const carrito: CarritoDTO = {
      id: 'c-1',
      usuarioId: 'u-1',
      createdAt: '2026-09-04T00:00:00Z',
      items: [
        { id: 'i-1', carritoId: 'c-1', productoId: 'p-1', cantidad: 2, precioUnitarioClp: 100 },
        { id: 'i-2', carritoId: 'c-1', productoId: 'p-2', cantidad: 3, precioUnitarioClp: 200 },
      ],
    };

    service.obtenerCarrito().subscribe();
    http.expectOne('http://localhost:8082/carrito').flush(carrito);

    expect(service.count()).toBe(5);
  });
});