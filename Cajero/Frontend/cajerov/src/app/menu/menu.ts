import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AtmService } from '../atm.service';

@Component({
  standalone: true,
  selector: 'app-menu',
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css'],
})
export class Menu {
  private atm = inject(AtmService);
  userName = this.atm.userName;
  usuarioId = this.atm.usuarioId;
  sesionId = this.atm.sessionId;

  get firstName() {
    const full = this.userName();
    return full ? full.split(' ')[0] : '';
  }

  logout() {
    this.atm.logout();
  }
}
