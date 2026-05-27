import { Component, inject, signal } from '@angular/core';
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
export class Login {
  numeroTarjeta = '';
  pin = '';
  error = signal('');
  loading = signal(false);
  step: 'welcome' | 'card' | 'pin' = 'welcome';

  private atm = inject(AtmService);
  userName = this.atm.userName;
  private router = inject(Router);

  get firstName() {
    const full = this.userName();
    return full ? full.split(' ')[0] : '';
  }

  start() {
    this.error.set('');
    this.step = 'card';
  }

  async validateTarjeta() {
    this.error.set('');
    this.loading.set(true);

    try {
      await this.atm.validateCard(this.numeroTarjeta);
      this.step = 'pin';
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
      this.router.navigate(['/menu']);
    } catch (error: any) {
      this.error.set(error?.error?.error || error?.message || 'Error al iniciar sesión');
    } finally {
      this.loading.set(false);
    }
  }
}
