import { Component, inject, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AtmService } from '../atm.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnDestroy {
  numeroTarjeta = '';
  pin = '';
  error = signal('');
  loading = signal(false);
  step = signal<'welcome' | 'card' | 'pin'>('welcome');

  private atm = inject(AtmService);
  userName = this.atm.userName;
  private router = inject(Router);

  private readonly IDLE_MS = 2 * 60 * 1000;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  get firstName() {
    const full = this.userName();
    return full ? full.split(' ')[0] : '';
  }

  resetIdleLogin() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.step.set('welcome');
      this.numeroTarjeta = '';
      this.pin = '';
      this.error.set('');
      this.idleTimer = null;
    }, this.IDLE_MS);
  }

  private clearIdleLogin() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  start() {
    this.error.set('');
    this.step.set('card');
    this.resetIdleLogin();
  }

  async validateTarjeta() {
    this.error.set('');
    this.loading.set(true);

    try {
      await this.atm.validateCard(this.numeroTarjeta);
      this.step.set('pin');
      this.resetIdleLogin();
    } catch (error: any) {
      this.error.set(error?.error?.error || error?.message || 'Tarjeta no válida');
    } finally {
      this.loading.set(false);
    }
  }

  async submit() {
    this.error.set('');
    this.loading.set(true);

    try {
      await this.atm.login(this.numeroTarjeta, this.pin);
      this.clearIdleLogin();
      this.router.navigate(['/menu']);
    } catch (error: any) {
      this.error.set(error?.error?.error || error?.message || 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.clearIdleLogin();
  }
}
