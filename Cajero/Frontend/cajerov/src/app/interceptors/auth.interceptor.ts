import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AtmService } from '../atm.service';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private atm = inject(AtmService);
  private router = inject(Router);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const sesionId = this.atm.sessionId();
    let modified = req;

    if (sesionId) {
      modified = req.clone({ headers: req.headers.set('sesion-id', sesionId) });
    }

    return next.handle(modified).pipe(
      catchError((err) => {
        if (err && err.status === 401) {
          // clear session and redirect to login
          try { this.atm.logout(); } catch (e) { /* ignore */ }
          this.router.navigate(['/']);
        }
        return throwError(() => err);
      })
    );
  }
}

export const authInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true
};
