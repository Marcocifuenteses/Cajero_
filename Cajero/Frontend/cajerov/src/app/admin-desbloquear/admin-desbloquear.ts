import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-admin-desbloquear',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-desbloquear.html',
  styleUrls: ['./admin-desbloquear.css'],
})
export class AdminDesbloquear {
  numeroTarjeta = '';
  adminSecret = '';
  loading = signal(false);
  error = signal('');
  success = signal('');

  private http = inject(HttpClient);

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
          admin_secret: this.adminSecret.trim(),
        })
      );
      this.success.set(res.message || 'Tarjeta desbloqueada correctamente');
      this.numeroTarjeta = '';
      this.adminSecret = '';
    } catch (e: any) {
      this.error.set(e?.error?.error || e?.message || 'Error al desbloquear');
    } finally {
      this.loading.set(false);
    }
  }
}
