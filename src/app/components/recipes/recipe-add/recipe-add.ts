import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { RecipeService } from '../../../services/recipe-service';
import { AuthService } from '../../../services/auth-service';
import { RecipeCreateForm } from '../../../models/recipe.model';
import { RecipeForm } from '../recipe-form/recipe-form';

@Component({
  selector: 'app-recipe-add',
  standalone: true,
  imports: [RecipeForm],
  templateUrl: './recipe-add.html',
  styleUrls: ['./recipe-add.css']
})
export class RecipeAdd implements OnInit {
  chefName = '';
  isSaving = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // The logged-in user's name fills the read-only Chef field
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      this.chefName = user?.fullname ?? '';
    });
  }

  onSave(recipe: RecipeCreateForm): void {
    this.isSaving = true;
    this.errorMessage = null;
    this.successMessage = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.recipeService.createRecipe(recipe).subscribe({
      next: (savedRecipe) => {
        // Stay in the saving state until we navigate away, so the recipe can't be submitted twice
        this.successMessage = `Recipe "${savedRecipe.title}" added successfully!`;
        setTimeout(() => this.router.navigate(['/recipes'], { queryParams: { filter: 'mine' } }), 1500);
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error adding recipe:', err);
        // Display specific backend error (e.g., duplicate title) or a generic one
        this.errorMessage = err.error?.error || 'Failed to add recipe. Please try again.';
      }
    });
  }
}
