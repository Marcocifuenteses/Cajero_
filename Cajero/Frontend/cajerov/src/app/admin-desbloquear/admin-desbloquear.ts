import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AtmService } from '../atm.service';

@Component({
  standalone: true,
  selector: 'app-admin-desbloquear',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-desbloquear.html',
  styleUrls: ['./admin-desbloquear.css'],
})
export class AdminDesbloquear implements OnInit, OnDestroy {
  private atmService = inject(AtmService);
  // Paso 1
  email     = '';
  nombre    = '';
  telefono  = '';

  // Paso 2
  codigo = '';

  // Paso 3
  numeroTarjeta = '';
  adminSecret   = '';

  step    = signal<'datos' | 'codigo' | 'desbloquear'>('datos');
  loading = signal(false);
  error   = signal('');
  success = signal('');

  // Descarga de log
  logPassword  = '';
  loadingLog   = signal(false);
  logError     = signal('');

  private sessionToken = '';
  private http = inject(HttpClient);

  ngOnInit() {
    this.atmService.stopIdleWatcher();
  }

  ngOnDestroy() {
    if (this.atmService.sessionId()) {
      this.atmService.startIdleWatcher();
    }
  }

  async solicitarCodigo() {
    this.error.set('');
    if (!this.email.trim() || !this.nombre.trim() || !this.telefono.trim()) {
      this.error.set('Completa todos los campos');
      return;
    }
    this.loading.set(true);
    try {
      await firstValueFrom<any>(
        this.http.post(`${environment.apiUrl}/admin/solicitar-codigo`, {
          email:    this.email.trim(),
          nombre:   this.nombre.trim(),
          telefono: this.telefono.trim(),
        })
      );
      this.step.set('codigo');
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Error al enviar el código');
    } finally {
      this.loading.set(false);
    }
  }

  async verificarCodigo() {
    this.error.set('');
    if (!this.codigo.trim()) {
      this.error.set('Ingresa el código de verificación');
      return;
    }
    this.loading.set(true);
    try {
      const res = await firstValueFrom<any>(
        this.http.post(`${environment.apiUrl}/admin/verificar-codigo`, {
          email:  this.email.trim(),
          codigo: this.codigo.trim(),
        })
      );
      this.sessionToken  = res.session_token;
      this.numeroTarjeta = res.numero_tarjeta || '';
      this.step.set('desbloquear');
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Código incorrecto o expirado');
    } finally {
      this.loading.set(false);
    }
  }

  async descargarLog() {
    this.logError.set('');
    if (!this.logPassword.trim()) { this.logError.set('Ingresa la contraseña'); return; }
    this.loadingLog.set(true);
    try {
      const blob = await firstValueFrom(
        this.http.post(`${environment.apiUrl}/admin/descargar-log`, { admin_secret: this.logPassword.trim() }, { responseType: 'blob' })
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `actividad_${new Date().toISOString().slice(0, 10)}.log`;
      a.click();
      URL.revokeObjectURL(url);
      this.logPassword = '';
    } catch (e: any) {
      if (e?.error instanceof Blob) {
        const text = await e.error.text();
        try { this.logError.set(JSON.parse(text).error || 'Error al descargar'); }
        catch { this.logError.set('Error al descargar el registro'); }
      } else {
        this.logError.set(e?.error?.error || 'Contraseña incorrecta');
      }
    } finally {
      this.loadingLog.set(false);
    }
  }

  async desbloquear() {
    this.error.set('');
    this.success.set('');
    if (!this.numeroTarjeta.trim() || !this.adminSecret.trim()) {
      this.error.set('Completa todos los campos');
      return;
    }
    this.loading.set(true);
    try {
      const res = await firstValueFrom<any>(
        this.http.post(`${environment.apiUrl}/admin/desbloquear-tarjeta`, {
          numero_tarjeta: this.numeroTarjeta.trim(),
          admin_secret:   this.adminSecret.trim(),
          session_token:  this.sessionToken,
        })
      );
      this.success.set(res.message || 'Tarjeta desbloqueada correctamente');
      this.numeroTarjeta = '';
      this.adminSecret   = '';
      this.sessionToken  = '';
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Error al desbloquear');
    } finally {
      this.loading.set(false);
    }
  }
}
