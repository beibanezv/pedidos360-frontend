import { Routes } from '@angular/router';

import { Home } from './home/home';
import { Catalogo } from './catalogo/catalogo';
import { Login } from './login/login';
import { Cuenta } from './cuenta/cuenta';
import { Carrito } from './carrito/carrito';
import { Ordenes } from './ordenes/ordenes';
import { Admin } from './admin/admin';
import { CognitoCallback } from './cognito/callback';
import { adminGuard } from './core/security/admin.guard';
import { sesionGuard } from './core/security/sesion.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'catalogo', component: Catalogo },
  { path: 'login', component: Login },
  { path: 'cognito/callback', component: CognitoCallback },
  { path: 'cuenta', component: Cuenta, canActivate: [sesionGuard] },
  { path: 'carrito', component: Carrito, canActivate: [sesionGuard] },
  { path: 'ordenes', component: Ordenes, canActivate: [sesionGuard] },
  { path: 'admin', component: Admin, canActivate: [sesionGuard, adminGuard] },
];