import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AtmService } from '../atm.service';

@Component({
  standalone: true,
  selector: 'app-cambiar-pin',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cambiar-pin.html',
  styleUrls: ['./cambiar-pin.css'],
})
export class CambiarPin {
  pinActual = '';
  pinNuevo = '';
  pinConfirm = '';
  mensaje = signal('');
  error = signal('');
  cargando = signal(false);

  private atm = inject(AtmService);
  userName = this.atm.userName;

  get firstName() {
    const full = this.userName();
    return full ? full.split(' ')[0] : '';
  }

  async cambiar() {
    this.error.set('');
    this.mensaje.set('');

    if (!this.pinActual || !this.pinNuevo || !this.pinConfirm) {
      this.error.set('Completa todos los campos');
      return;
    }
    if (this.pinNuevo.length < 4) {
      this.error.set('El PIN nuevo debe tener al menos 4 dígitos');
      return;
    }
    if (this.pinNuevo !== this.pinConfirm) {
      this.error.set('El PIN nuevo y la confirmación no coinciden');
      return;
    }
    if (this.pinActual === this.pinNuevo) {
      this.error.set('El PIN nuevo debe ser diferente al actual');
      return;
    }

    if (this.cargando()) return;
    this.cargando.set(true);
    try {
      const res = await this.atm.cambiarPin(this.pinActual, this.pinNuevo);
      this.mensaje.set(res.message);
      this.pinActual = '';
      this.pinNuevo = '';
      this.pinConfirm = '';
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Error al cambiar el PIN');
    } finally {
      this.cargando.set(false);
    }
  }
}