import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Menu } from './menu/menu';
import { Cuenta } from './cuenta/cuenta';
import { Retiro } from './retiro/retiro';
import { Historial } from './historial/historial';
import { Transferencia } from './transferencia/transferencia';
import { Saldo } from './saldo/saldo';
import { CambiarPin } from './cambiar-pin/cambiar-pin';
import { AdminDesbloquear } from './admin-desbloquear/admin-desbloquear';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'menu',          component: Menu,          canActivate: [authGuard] },
  { path: 'cuentas',       component: Cuenta,        canActivate: [authGuard] },
  { path: 'saldo',         component: Saldo,         canActivate: [authGuard] },
  { path: 'retiro',        component: Retiro,        canActivate: [authGuard] },
  { path: 'historial',     component: Historial,     canActivate: [authGuard] },
  { path: 'transferencia', component: Transferencia, canActivate: [authGuard] },
  { path: 'cambiar-pin',   component: CambiarPin,    canActivate: [authGuard] },
  { path: '8a3f1d92',      component: AdminDesbloquear },
  { path: '**', redirectTo: '' }
];