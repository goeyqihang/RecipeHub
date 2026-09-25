import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';

export interface TranslationResult {
  title: string;
  ingredients: string[];
  instructions: string[];
  originalLanguage: string;
  targetLanguage: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/recipes`;

  /**
   * Sends text to the backend for translation.
   * @param recipeId The ID of the recipe to translate.
   * @param targetLanguage The language code (e.g., 'es', 'it', 'fr').
   * @returns An Observable emitting the translated text parts.
   */
  translateRecipe(recipeId: string, targetLanguage: string): Observable<TranslationResult> {
    const url = `${this.baseUrl}/translate/${recipeId}`;
    return this.http.post<TranslationResult>(url, { targetLanguage });
  }
}