import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, switchMap, catchError, of, tap, finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RecipeService } from '../../../services/recipe-service';
import { Recipe } from '../../../models/recipe.model';
import { AiAnalysisService, HealthAnalysisResult } from '../../../services/ai-analysis-service';

@Component({
  selector: 'app-recipe-analysis',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recipe-analysis.html',
  styleUrls: ['./recipe-analysis.css']
})
export class RecipeAnalysis implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);
  private aiAnalysisService = inject(AiAnalysisService);

  // --- Direct Properties ---
  currentRecipe: Recipe | null = null;
  analysisResult: HealthAnalysisResult | null = null;
  errorMessage: string | null = null;
  isLoading: boolean = true; // Single loading state

  private routeSub: Subscription | undefined;
  private dataSub: Subscription | undefined;

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const recipeIdFromRoute = params.get('recipeId');

      if (recipeIdFromRoute) {
        this.loadAndAnalyze(recipeIdFromRoute);
      } else {
        // Handle case where no recipeId is in the URL
        this.errorMessage = "No Recipe ID provided in the URL.";
        this.isLoading = false;
        console.error("No recipeId found in route parameters.");
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.dataSub?.unsubscribe();
  }

  private loadAndAnalyze(recipeId: string): void {
    this.isLoading = true; // Start loading
    this.errorMessage = null;
    this.currentRecipe = null;
    this.analysisResult = null;
    this.dataSub?.unsubscribe(); // Cancel any previous request

    this.dataSub = this.recipeService.getRecipeById(recipeId).pipe(
      tap(recipe => {
        this.currentRecipe = recipe;
        if (!recipe) {
          // If the service call succeeds but returns null/undefined
          throw new Error('Recipe data received is empty.'); // Throw error to be caught by catchError
        }
      }),
      // Use switchMap to chain the AI analysis call after getting the recipe
      switchMap(recipe => {
        if (!recipe) return of(null);
        return this.aiAnalysisService.analyzeRecipe(recipe.recipeId).pipe(
          catchError((err: HttpErrorResponse) => {
            // Handle errors specifically from the AI analysis call
            console.error('Error during AI analysis call:', err);
            this.errorMessage = err.error?.error || 'Failed to get health analysis. Please try again.';
            // Allow the stream to continue, but with a null analysis result
            return of(null);
          })
        );
      }),
      // Use finalize to ensure isLoading is set to false whether it succeeds or fails
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (analysisResult) => {
        // Successful path: both recipe fetch and AI analysis (if no error)
        this.analysisResult = analysisResult;
        if (!analysisResult && !this.errorMessage && this.currentRecipe) {
          this.errorMessage = "Received an empty or invalid analysis result from the AI."
        }
      },
      error: (err) => {
        // Handle errors primarily from the getRecipeById call (before switchMap)
        console.error('Error fetching recipe:', err);
        this.errorMessage = (err instanceof HttpErrorResponse && err.status === 404)
                             ? 'Recipe not found.' // Specific 404 message
                             : (err.message || 'Failed to load recipe data.'); // Generic message otherwise
        this.currentRecipe = null;
        this.analysisResult = null;
      }
    });
  }
}
