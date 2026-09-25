/**
 * Represents the full Recipe object, usually received from the backend.
 * Ingredients and instructions are arrays here.
 */
export interface Recipe {
  _id: string;
  recipeId: string;
  userId: string;
  title: string;
  chef: string;
  ingredients: string[];
  instructions: string[];
  mealType: string;
  cuisineType: string;
  prepTime: number;
  difficulty: string;
  servings: number;
  views: number;
  createdDate: Date;
}

/**
 * The recipe fields a chef fills in, as sent to the backend when creating or updating a recipe.
 * Ingredients and instructions are lists, with one entry per ingredient or step.
 */
export interface RecipeCreateForm {
  title: string;
  chef: string;
  ingredients: string[];
  instructions: string[];
  mealType: string;
  cuisineType: string;
  prepTime: number;
  difficulty: string;
  servings: number;
}
