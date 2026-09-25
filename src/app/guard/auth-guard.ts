import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn$.pipe(
    take(1), // Take the latest value and complete
    map(isLoggedIn => {
      if (isLoggedIn) {
        return true; // If logged in, allow access
      } else {
        // If not logged in, redirect to the login page
        router.navigate(['/login']);
        return false;
      }
    })
  );
};