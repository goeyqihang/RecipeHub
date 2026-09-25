import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { map, take } from 'rxjs';

export const hasRoleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Get the required roles from the route's data property
  const requiredRoles = route.data['roles'] as string[];

  // 2. Get the current user's role
  return authService.currentUser$.pipe(
    take(1), // We only need the current value
    map(user => {
      if (user && requiredRoles.includes(user.role)) {
        // 3. User has the role, allow access
        return true;
      } else {
        // 4. User does not have the role, redirect to access-denied
        return router.createUrlTree(['/access-denied']);
      }
    })
  );
};