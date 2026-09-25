import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RecipeService } from '../../../services/recipe-service';
import { AuthService } from '../../../services/auth-service';
import { Recipe } from '../../../models/recipe.model';
import { LoginUser } from '../../../models/auth.models';
import { Observable, BehaviorSubject, switchMap, combineLatest, map, filter as rxFilter } from 'rxjs';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [CommonModule, AsyncPipe, RouterLink],
  templateUrl: './recipe-list.html',
  styleUrls: ['./recipe-list.css']
})
export class RecipeList implements OnInit {
  recipes$: Observable<Recipe[]>;
  currentUser$: Observable<LoginUser | null>;
  currentUserId: string | null = null;
  pageTitle$: Observable<string>;
  currentFilter$: BehaviorSubject<'all' | 'mine'> = new BehaviorSubject<'all' | 'mine'>('all');

  recipeTitleToDelete: string | null = null;

  private modalService = inject(NgbModal);

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.currentUser$ = this.authService.currentUser$;

    this.route.queryParamMap.subscribe(params => {
      const filter = params.get('filter');
      if (filter === 'mine') {
        this.currentFilter$.next('mine');
      } else {
        this.currentFilter$.next('all');
      }
    });

    this.recipes$ = combineLatest([
      this.currentFilter$,
      this.currentUser$.pipe(rxFilter((user): user is LoginUser => user !== null))
    ]).pipe(
      switchMap(([filter, user]) => {
        this.currentUserId = user.userId;
        return this.recipeService.getRecipes(filter === 'mine' ? 'mine' : undefined);
      })
    );

    this.pageTitle$ = this.currentFilter$.pipe(
      map(filter => (filter === 'mine' ? 'My Recipes' : 'All Recipes'))
    );
  }

  ngOnInit(): void {
    this.currentUser$.subscribe(user => {
      this.currentUserId = user?.userId ?? null;
    });
  }

  isOwner(recipeUserId: string): boolean {
    return this.currentUserId === recipeUserId;
  }


  openDeleteConfirmation(content: any, recipe: Recipe): void {
    this.recipeTitleToDelete = recipe.title;
    const modalRef = this.modalService.open(content, { ariaLabelledBy: 'modal-confirm-title' });

    modalRef.result.then(
      (result) => {
        if (result === 'delete') {
          this.performDelete(recipe);
        }
        this.recipeTitleToDelete = null;
      },
      () => {
        // Modal dismissed (canceled or closed)
        this.recipeTitleToDelete = null;
      }
    );
  }

  private performDelete(recipe: Recipe): void {
    this.recipeService.deleteRecipe(recipe.recipeId).subscribe({
      next: (response) => {
        alert(response.message || 'Recipe deleted successfully!');
        this.currentFilter$.next(this.currentFilter$.value);
      },
      error: (err) => {
        console.error('Error deleting recipe:', err);
        alert(`Failed to delete recipe: ${err.error?.error || 'Unknown error'}`);
      }
    });
  }

  switchFilter(filter: 'all' | 'mine'): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: filter === 'mine' ? 'mine' : null },
      queryParamsHandling: 'merge',
    });
  }
}