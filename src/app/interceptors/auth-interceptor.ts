import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { API_BASE_URL } from '../constants/api.constants';

// Endpoints whose 401 responses the caller handles itself (wrong password, expired token at startup)
const AUTH_ENDPOINTS = ['/login', '/register', '/session'].map(path => `${API_BASE_URL}${path}`);

/**
 * Adds the login token to every API request as "Authorization: Bearer <token>",
 * and logs the user out if the API rejects the token (for example because it has expired).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const isApiRequest = req.url.startsWith(`${API_BASE_URL}/`);
  const request = token && isApiRequest
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      const tokenRejected = error instanceof HttpErrorResponse && error.status === 401
        && token && isApiRequest && !AUTH_ENDPOINTS.includes(req.url);

      if (tokenRejected) {
        authService.clearSession();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
