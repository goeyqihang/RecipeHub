import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subscription, switchMap, catchError, of, tap, BehaviorSubject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { RecipeService } from '../../../services/recipe-service';
import { AuthService } from '../../../services/auth-service';
import { Recipe } from '../../../models/recipe.model';
import { LoginUser } from '../../../models/auth.models';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { RecipeTranslator } from '../recipe-translator/recipe-translator';
import { RecipeAudioPlayer } from '../recipe-audio-player/recipe-audio-player';

@Component({
  selector: 'app-recipe-view',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink, DatePipe, RecipeTranslator,RecipeAudioPlayer],
  templateUrl: './recipe-view.html',
  styleUrls: ['./recipe-view.css']
})
export class RecipeView implements OnInit, OnDestroy {
  private recipeSubject = new BehaviorSubject<Recipe | null>(null);
  recipe$: Observable<Recipe | null> = this.recipeSubject.asObservable();

  currentUser$: Observable<LoginUser | null>;
  currentUserId: string | null = null;
  errorMessage: string | null = null;
  isLoading = true;

  recipeTitleToDelete: string | null = null;


  private userSubscription: Subscription | undefined;
  private routeSubscription: Subscription | undefined;


  private modalService = inject(NgbModal);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private recipeService: RecipeService,
    private authService: AuthService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.pipe(
      tap(() => {
        this.isLoading = true;
        this.errorMessage = null;
        this.recipeSubject.next(null);
      }),
      switchMap(params => {
        const recipeId = params.get('recipeId');
        if (!recipeId) {
          this.errorMessage = 'Recipe ID not found in URL.';
          this.isLoading = false;
          return of(null);
        }
        return this.recipeService.getRecipeById(recipeId).pipe(
          catchError((err: HttpErrorResponse) => {
            console.error('Error fetching recipe:', err);
            this.errorMessage = err.status === 404
              ? 'Recipe not found.'
              : (err.error?.error || err.message || 'An unknown error occurred while fetching the recipe.');
            this.isLoading = false;
            return of(null);
          })
        );
      }),
      tap(recipe => {
        this.recipeSubject.next(recipe);
        this.isLoading = false;
        if (!recipe && !this.errorMessage) {
          this.errorMessage = 'Recipe data could not be loaded or not found.';
        }
      })
    ).subscribe();

    this.userSubscription = this.currentUser$.subscribe(user => {
      this.currentUserId = user?.userId ?? null;
    });
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  isOwner(recipeUserId: string | undefined): boolean {
    return !!recipeUserId && this.currentUserId === recipeUserId;
  }


  /**
   * Opens the delete confirmation modal.
   * @param content - TemplateRef for the modal content.
   */
  openDeleteConfirmation(content: any): void {
    // Get the current recipe value from the BehaviorSubject
    const currentRecipe = this.recipeSubject.getValue();
    if (!currentRecipe) return;

    this.recipeTitleToDelete = currentRecipe.title;
    const modalRef = this.modalService.open(content, { ariaLabelledBy: 'modal-confirm-title-view' });

    modalRef.result.then(
      (result) => {
        // When the user clicks the "Delete" button in the modal
        if (result === 'delete') {
          this.performDelete(currentRecipe);
        }
        this.recipeTitleToDelete = null;
      },
      () => {
        // When the modal is dismissed (canceled or closed)
        this.recipeTitleToDelete = null;
      }
    );
  }

  /**
  * Executes the actual delete operation.
  * @param recipe - The recipe object to delete.
  */
  private performDelete(recipe: Recipe): void {
    this.errorMessage = null; // Clear previous error messages
    this.recipeService.deleteRecipe(recipe.recipeId).subscribe({
      next: (response) => {
        alert(response.message || 'Recipe deleted successfully!');
        // Navigate back to the recipe list page upon successful deletion
        this.router.navigate(['/recipes']);
      },
      error: (err: HttpErrorResponse) => {
        // Display the error message on the details page
        this.errorMessage = `Failed to delete recipe: ${err.error?.error || err.message || 'Unknown error'}`;
        console.error('Error deleting recipe:', err);
      }
    });
  }
}