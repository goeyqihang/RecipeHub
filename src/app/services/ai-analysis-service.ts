import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../constants/api.constants';

export interface HealthAnalysisSuggestion {
  suggestion: string;
  explanation: string;
}

export interface HealthAnalysisResult {
  summary: string;
  concerns: string[];
  suggestions: HealthAnalysisSuggestion[];
}

@Injectable({
  providedIn: 'root'
})
export class AiAnalysisService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/recipes`;

  // The server analyzes the recipe's stored ingredients
  analyzeRecipe(recipeId: string): Observable<HealthAnalysisResult> {
    const url = `${this.baseUrl}/analyze-health/${recipeId}`;
    return this.http.post<HealthAnalysisResult>(url, {});
  }
}