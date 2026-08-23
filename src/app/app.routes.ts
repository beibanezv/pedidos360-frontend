import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { Home } from './home/home';
import { Cuenta } from './cuenta/cuenta';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'cuenta', component: Cuenta, canActivate: [MsalGuard] },
];
