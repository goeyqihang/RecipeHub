import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { RecipeService } from '../services/recipe-service';
import { map, catchError, of, switchMap, take } from 'rxjs';

export const recipeOwnerGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const recipeService = inject(RecipeService);
  const router = inject(Router);

  const recipeId = route.paramMap.get('recipeId');

  if (!recipeId) {
    return router.createUrlTree(['/recipes']);
  }

  return authService.currentUser$.pipe(
    take(1),
    switchMap(user => {
      return recipeService.getRecipeById(recipeId).pipe(
        map(recipe => {
          if (recipe.userId === user?.userId) {
            return true;
          } else {
            return router.createUrlTree(['/access-denied']);
          }
        }),
        catchError(err => {
          console.error('Error in recipeOwnerGuard:', err);
          return of(router.createUrlTree(['/404-not-found']));
        })
      );
    })
  );
};