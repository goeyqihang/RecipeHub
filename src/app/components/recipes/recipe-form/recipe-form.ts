import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormArray, FormControl, NonNullableFormBuilder, ReactiveFormsModule,
  ValidationErrors, ValidatorFn, Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecipeCreateForm } from '../../../models/recipe.model';
import { MEAL_TYPES, CUISINE_TYPES, DIFFICULTY_LEVELS, VALIDATION_RULES } from '../../../constants/recipe.constants';

// Like Validators.minLength, but ignores surrounding spaces (the backend trims each entry)
const minTrimmedLength = (min: number): ValidatorFn => (control: AbstractControl): ValidationErrors | null => {
  const length = String(control.value ?? '').trim().length;
  return length < min ? { minlength: { requiredLength: min, actualLength: length } } : null;
};

// Checks the number of entries in a FormArray
const itemCount = (min: number, max: number): ValidatorFn => (control: AbstractControl): ValidationErrors | null => {
  const count = (control as FormArray).length;
  return count < min || count > max ? { itemCount: { min, max, actual: count } } : null;
};

/**
 * The recipe form shared by the Add and Edit pages. Ingredients and steps are dynamic lists
 * (a FormArray each), so every entry is its own input and may contain commas.
 */
@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './recipe-form.html',
  styleUrls: ['./recipe-form.css']
})
export class RecipeForm implements OnChanges {
  /** Values to start from, when editing an existing recipe */
  @Input() recipe: RecipeCreateForm | null = null;
  /** Shown in the read-only Chef field and sent with the recipe */
  @Input() chefName = '';
  /** Disables the submit button while the parent page saves */
  @Input() saving = false;
  @Input() submitLabel = 'Save Recipe';
  /** Where the Cancel button leads */
  @Input() cancelLink: string | unknown[] = '/recipes';
  /** Emits the trimmed recipe when a valid form is submitted */
  @Output() save = new EventEmitter<RecipeCreateForm>();

  // Expose constants to the template
  readonly rules = VALIDATION_RULES;
  readonly mealTypes = [...MEAL_TYPES];
  readonly cuisineTypes = [...CUISINE_TYPES];
  readonly difficultyLevels = [...DIFFICULTY_LEVELS];

  submitted = false;

  private fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    title: ['', [Validators.required, minTrimmedLength(this.rules.title.min), Validators.maxLength(this.rules.title.max)]],
    ingredients: this.fb.array([this.ingredientControl()], itemCount(this.rules.ingredients.minItems, this.rules.ingredients.maxItems)),
    instructions: this.fb.array([this.instructionControl()], itemCount(this.rules.instructions.minItems, this.rules.instructions.maxItems)),
    mealType: ['', Validators.required],
    cuisineType: ['', Validators.required],
    prepTime: [1, [Validators.required, Validators.min(this.rules.prepTime.min), Validators.max(this.rules.prepTime.max)]],
    difficulty: ['', Validators.required],
    servings: [1, [Validators.required, Validators.min(this.rules.servings.min), Validators.max(this.rules.servings.max)]],
  });

  get ingredients(): FormArray<FormControl<string>> {
    return this.form.controls.ingredients;
  }

  get instructions(): FormArray<FormControl<string>> {
    return this.form.controls.instructions;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recipe'] && this.recipe) {
      this.loadRecipe(this.recipe);
    }
  }

  addIngredient(): void {
    if (this.ingredients.length < this.rules.ingredients.maxItems) {
      this.ingredients.push(this.ingredientControl());
    }
  }

  removeIngredient(index: number): void {
    if (this.ingredients.length > this.rules.ingredients.minItems) {
      this.ingredients.removeAt(index);
    }
  }

  addInstruction(): void {
    if (this.instructions.length < this.rules.instructions.maxItems) {
      this.instructions.push(this.instructionControl());
    }
  }

  removeInstruction(index: number): void {
    if (this.instructions.length > this.rules.instructions.minItems) {
      this.instructions.removeAt(index);
    }
  }

  /** Whether to show a control's errors: after the user has touched it, or tried to submit. */
  showErrors(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted);
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.save.emit({
      ...value,
      title: value.title.trim(),
      chef: this.chefName,
      ingredients: value.ingredients.map(item => item.trim()),
      instructions: value.instructions.map(step => step.trim()),
    });
  }

  private loadRecipe(recipe: RecipeCreateForm): void {
    this.ingredients.clear();
    (recipe.ingredients.length ? recipe.ingredients : ['']).forEach(item => this.ingredients.push(this.ingredientControl(item)));

    this.instructions.clear();
    (recipe.instructions.length ? recipe.instructions : ['']).forEach(step => this.instructions.push(this.instructionControl(step)));

    this.form.patchValue({
      title: recipe.title,
      mealType: recipe.mealType,
      cuisineType: recipe.cuisineType,
      prepTime: recipe.prepTime,
      difficulty: recipe.difficulty,
      servings: recipe.servings,
    });
    this.submitted = false;
  }

  private ingredientControl(value = ''): FormControl<string> {
    return this.fb.control(value, [Validators.required, minTrimmedLength(this.rules.ingredients.minCharPerItem)]);
  }

  private instructionControl(value = ''): FormControl<string> {
    return this.fb.control(value, [Validators.required, minTrimmedLength(this.rules.instructions.minCharPerItem)]);
  }
}
