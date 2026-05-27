import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AtmService } from '../atm.service';

export const authGuard: CanActivateFn = () => {
  const atm = inject(AtmService);
  const router = inject(Router);

  if (atm.sessionId()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
