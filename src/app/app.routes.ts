import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { Home } from './home/home';
import { Catalogo } from './catalogo/catalogo';
import { Login } from './login/login';
import { Cuenta } from './cuenta/cuenta';
import { Carrito } from './carrito/carrito';
import { Admin } from './admin/admin';
import { adminGuard } from './core/security/admin.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'catalogo', component: Catalogo },
  { path: 'login', component: Login },
  { path: 'cuenta', component: Cuenta, canActivate: [MsalGuard] },
  { path: 'carrito', component: Carrito, canActivate: [MsalGuard] },
  { path: 'admin', component: Admin, canActivate: [MsalGuard, adminGuard] },
];