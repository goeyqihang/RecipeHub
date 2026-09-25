import { Component, Input, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslationService, TranslationResult } from '../../../services/translation-service';

@Component({
  selector: 'app-recipe-translator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recipe-translator.html',
  styleUrls: ['./recipe-translator.css']
})
export class RecipeTranslator implements OnDestroy {

  @Input({ required: true }) recipeId!: string;

  isTranslating = false; // For translation loading state
  translationError: string | null = null; // Specific error for translation

  // Translation Properties
  availableLanguages = [
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'fr', name: 'French' },
    { code: 'zh', name: 'Chinese' },
  ];
  selectedLanguage: string = ''; // Bound to the dropdown
  translatedContent: TranslationResult | null = null; // To store translation results

  private translationSubscription: Subscription | undefined;
  private translationService = inject(TranslationService);

  ngOnDestroy(): void {
    this.translationSubscription?.unsubscribe();
  }

  // Translation Method
  translateRecipe(): void {
    if (!this.recipeId || !this.selectedLanguage) {
      this.translatedContent = null;
      this.translationError = null;
      return;
    }

    this.isTranslating = true;
    this.translationError = null;
    this.translatedContent = null;
    this.translationSubscription?.unsubscribe();

    this.translationSubscription = this.translationService.translateRecipe(this.recipeId, this.selectedLanguage)
      .pipe(
        finalize(() => {
          this.isTranslating = false;
        })
      )
      .subscribe({
        next: (result) => {
          if (!result || !result.title) {
            console.warn("Received potentially empty translation result:", result);
            this.translationError = "Translation result was empty or invalid.";
            this.translatedContent = null;
          } else {
            this.translatedContent = result;
          }
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error translating recipe in component:', err);
          this.translationError = err.error?.error || err.message || 'Failed to translate. Please try again.';
          this.translatedContent = null;
        }
      });
  }
}