import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, switchMap, catchError, of, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RecipeService } from '../../../services/recipe-service';
import { RecipeCreateForm } from '../../../models/recipe.model';
import { RecipeForm } from '../recipe-form/recipe-form';

@Component({
  selector: 'app-recipe-edit',
  standalone: true,
  imports: [RouterLink, RecipeForm],
  templateUrl: './recipe-edit.html',
  styleUrls: ['./recipe-edit.css']
})
export class RecipeEdit implements OnInit, OnDestroy {
  // The loaded recipe, used as the form's starting values
  recipe: RecipeCreateForm | null = null;
  originalRecipeTitle: string | null = null;
  currentRecipeId: string | null = null;
  isLoading = true;
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  private routeSubscription: Subscription | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService
  ) { }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.pipe(
      tap(params => {
        this.currentRecipeId = params.get('recipeId');
        this.isLoading = true;
        this.errorMessage = null;
        this.successMessage = null;
      }),
      switchMap(params => {
        const recipeId = params.get('recipeId')!;

        return this.recipeService.getRecipeById(recipeId).pipe(
          catchError((err: HttpErrorResponse) => {
            console.error('Error fetching recipe data in component:', err);
            this.errorMessage = `Failed to load recipe: ${err.error?.error || err.message}`;
            return of(null);
          })
        );
      })
    ).subscribe(recipe => {
      this.isLoading = false;
      if (recipe) {
        this.originalRecipeTitle = recipe.title;
        this.recipe = {
          title: recipe.title,
          chef: recipe.chef,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          mealType: recipe.mealType,
          cuisineType: recipe.cuisineType,
          prepTime: recipe.prepTime,
          difficulty: recipe.difficulty,
          servings: recipe.servings,
        };
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  onSave(recipe: RecipeCreateForm): void {
    if (!this.currentRecipeId) {
      this.errorMessage = "Cannot update recipe: Recipe ID is missing.";
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.recipeService.updateRecipe(this.currentRecipeId, recipe).subscribe({
      next: (updatedRecipe) => {
        this.successMessage = `Recipe "${updatedRecipe.title}" updated successfully!`;
        this.originalRecipeTitle = updatedRecipe.title; // Update display title
        setTimeout(() => this.router.navigate(['/recipes/view', this.currentRecipeId]), 1500);
      },
      error: (err: HttpErrorResponse) => {
        this.isSaving = false;
        console.error('Error updating recipe:', err);
        this.errorMessage = err.error?.error || 'Failed to update recipe. Please try again.';
      }
    });
  }
}
