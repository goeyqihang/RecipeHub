export const MEAL_TYPES = Object.freeze(["Breakfast", "Lunch", "Dinner", "Snack"]);
export const CUISINE_TYPES = Object.freeze(["Italian", "Asian", "Mexican", "American", "French", "Indian", "Mediterranean", "Other"]);
export const DIFFICULTY_LEVELS = Object.freeze(["Easy", "Medium", "Hard"]);

// Validation rules, matching the Mongoose schema in backend/models/recipe.js
export const VALIDATION_RULES = Object.freeze({
    title: { min: 3, max: 100 },
    ingredients: { minItems: 1, maxItems: 20, minCharPerItem: 3 },
    instructions: { minItems: 1, maxItems: 15, minCharPerItem: 10 },
    prepTime: { min: 1, max: 480 },
    servings: { min: 1, max: 20 },
});
