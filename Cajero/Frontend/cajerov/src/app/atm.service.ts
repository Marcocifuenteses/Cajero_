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
  idleCountdown = signal<number | null>(null);

  private readonly IDLE_MS    = 2 * 60 * 1000;
  private readonly WARN_SECS  = 20;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private boundReset  = () => this.resetIdle();
  private boundUnload = () => this.sessionBeacon();

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
    window.addEventListener('beforeunload', this.boundUnload);
    window.addEventListener('pagehide', this.boundUnload);
    this.resetIdle();
  }

  stopIdleWatcher() {
    ['click', 'keydown', 'touchstart'].forEach(e =>
      document.removeEventListener(e, this.boundReset)
    );
    window.removeEventListener('beforeunload', this.boundUnload);
    window.removeEventListener('pagehide', this.boundUnload);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    this.clearCountdown();
  }

  private sessionBeacon() {
    const sesId = this.sessionId();
    if (!sesId) return;
    const blob = new Blob(
      [JSON.stringify({ sesion_id: sesId })],
      { type: 'application/json' }
    );
    navigator.sendBeacon(`${this.baseUrl}/logout`, blob);
  }

  private resetIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.clearCountdown();

    // Arrancar la cuenta regresiva WARN_SECS antes del logout
    this.idleTimer = setTimeout(() => this.startCountdown(), this.IDLE_MS - this.WARN_SECS * 1000);
  }

  private startCountdown() {
    this.idleCountdown.set(this.WARN_SECS);
    this.countdownInterval = setInterval(() => {
      const current = this.idleCountdown();
      if (current === null) return;
      if (current <= 1) {
        this.clearCountdown();
        this.logout();
      } else {
        this.idleCountdown.set(current - 1);
      }
    }, 1000);
  }

  private clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.idleCountdown.set(null);
  }

  logout() {
    const sesId = this.sessionId();
    this.stopIdleWatcher();
    if (sesId) {
      this.http.post(`${this.baseUrl}/logout`, {}, { headers: this.headers })
        .subscribe({ error: () => {} });
    }
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
