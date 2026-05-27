import { Injectable, signal } from '@angular/core';
import { environment } from '../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface LoginResponse {
  message: string;
  tarjeta_id: number;
  usuario_id: number;
  owner_name?: string;
  sesion: { id: number };
}

@Injectable({ providedIn: 'root' })
export class AtmService {
  private baseUrl = environment.apiUrl;
  sessionId = signal<string | null>(null);
  usuarioId = signal<number>(0);
  userName = signal<string>('');

  private readonly IDLE_MS = 2 * 60 * 1000;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private boundReset = () => this.resetIdle();

  constructor(private http: HttpClient, private router: Router) {
    if (typeof window !== 'undefined' && window?.localStorage) {
      const savedSesion = localStorage.getItem('sesionId');
      const savedUsuario = Number(localStorage.getItem('usuarioId') || '0');
      const savedName = localStorage.getItem('userName') || '';
      this.sessionId.set(savedSesion && savedSesion !== 'null' ? savedSesion : null);
      this.usuarioId.set(savedUsuario);
      this.userName.set(savedName);
      if (this.sessionId()) this.startIdleWatcher();
    }
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'sesion-id': this.sessionId() || ''
    });
  }

  private saveName(userName: string) {
    localStorage.setItem('userName', userName);
    this.userName.set(userName);
  }

  private saveSession(sesionId: string, usuarioId: number, userName: string = '') {
    if (sesionId) {
      localStorage.setItem('sesionId', sesionId);
      this.sessionId.set(sesionId);
    }
    localStorage.setItem('usuarioId', String(usuarioId));
    this.usuarioId.set(usuarioId);
    this.saveName(userName);
  }

  startIdleWatcher() {
    ['click', 'keydown', 'touchstart'].forEach(e =>
      document.addEventListener(e, this.boundReset, { passive: true })
    );
    this.resetIdle();
  }

  stopIdleWatcher() {
    ['click', 'keydown', 'touchstart'].forEach(e =>
      document.removeEventListener(e, this.boundReset)
    );
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private resetIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.logout(), this.IDLE_MS);
  }

  logout() {
    this.stopIdleWatcher();
    localStorage.removeItem('sesionId');
    localStorage.removeItem('usuarioId');
    localStorage.removeItem('userName');
    this.sessionId.set(null);
    this.usuarioId.set(0);
    this.userName.set('');
    this.router.navigate(['/']);
  }

  async login(numero_tarjeta: string, pin: string) {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.baseUrl}/login`, {
        numero_tarjeta,
        pin
      })
    );

    this.saveSession(String(response.sesion.id), response.usuario_id, response.owner_name || '');
    this.startIdleWatcher();
    return response;
  }

  async validateCard(numero_tarjeta: string) {
    const response = await firstValueFrom<any>(
      this.http.post<any>(`${this.baseUrl}/validate-card`, {
        numero_tarjeta
      })
    );

    if (response.owner_name) {
      this.saveName(response.owner_name);
    }

    return response;
  }

  async getCuentas() {
    if (!this.usuarioId()) throw new Error('Usuario no autenticado');
    return firstValueFrom<any[]>(
      this.http.get<any[]>(`${this.baseUrl}/cuentas/${this.usuarioId()}`, {
        headers: this.headers
      })
    );
  }

  async retiro(cuenta_id: number, monto: number) {
    return firstValueFrom(
      this.http.post<any>(
        `${this.baseUrl}/retiro`,
        { cuenta_id, monto },
        { headers: this.headers }
      )
    );
  }

  async historial(cuenta_id: number, page: number = 1) {
    return firstValueFrom<any>(
      this.http.get<any>(`${this.baseUrl}/historial/${cuenta_id}`, {
        headers: this.headers,
        params: { page: String(page) }
      })
    );
  }

  async buscarCuentaPorTelefono(telefono: string) {
    return firstValueFrom<any>(
      this.http.get<any>(`${this.baseUrl}/buscar-cuenta`, {
        headers: this.headers,
        params: { telefono }
      })
    );
  }

  async cambiarPin(pin_actual: string, pin_nuevo: string) {
    return firstValueFrom(
      this.http.post<any>(
        `${this.baseUrl}/cambiar-pin`,
        { pin_actual, pin_nuevo },
        { headers: this.headers }
      )
    );
  }

  async transferencia(cuenta_origen: number, cuenta_destino: number, monto: number) {
    return firstValueFrom(
      this.http.post<any>(
        `${this.baseUrl}/transferencia`,
        { cuenta_origen, cuenta_destino, monto },
        { headers: this.headers }
      )
    );
  }
}
