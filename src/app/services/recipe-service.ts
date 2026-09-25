import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Recipe, RecipeCreateForm } from '../models/recipe.model';
import { API_BASE_URL } from '../constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private baseUrl = `${API_BASE_URL}/recipes`;

  constructor(private http: HttpClient) { }

  getRecipes(filter?: 'mine'): Observable<Recipe[]> {
    let params = new HttpParams();

    if (filter) {
      params = params.set('filter', filter);
    }
    return this.http.get<Recipe[]>(this.baseUrl, { params });
  }

  getRecipeById(recipeId: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.baseUrl}/view/${recipeId}`);
  }

  createRecipe(recipeData: RecipeCreateForm): Observable<Recipe> {
    // Backend expects strings, RecipeCreateForm already defines them as strings
    const payload = { ...recipeData };
    return this.http.post<Recipe>(`${this.baseUrl}/add`, payload);
  }

  // Update expects the full RecipeCreateForm, as all fields are required
  updateRecipe(recipeId: string, recipeData: RecipeCreateForm): Observable<Recipe> {

    const payload = { ...recipeData };

    // Remove chef field if it exists to prevent accidental updates
    delete (payload as Partial<RecipeCreateForm>).chef;

    return this.http.put<Recipe>(`${this.baseUrl}/update/${recipeId}`, payload);
  }

  deleteRecipe(recipeId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/delete/${recipeId}`, {});
  }
}
