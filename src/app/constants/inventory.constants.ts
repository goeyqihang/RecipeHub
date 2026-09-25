export const INVENTORY_CATEGORIES = Object.freeze([
  "Vegetables", "Fruits", "Meat", "Dairy", "Grains",
  "Spices", "Beverages", "Frozen", "Canned", "Other",
]);

export const STORAGE_LOCATIONS = Object.freeze([
  "Fridge", "Freezer", "Pantry", "Counter", "Cupboard",
]);

export const INVENTORY_UNITS = Object.freeze([
  "pieces", "kg", "g", "liters", "ml",
  "cups", "tbsp", "tsp", "dozen",
]);

export const INVENTORY_VALIDATION_RULES = Object.freeze({
  ingredientName: {
    minlength: 2,
    maxlength: 50,
    pattern: "^[a-zA-Z\\s\\-]+$", // Allows letters, spaces, hyphens
    title: "Ingredient name can only contain letters, spaces, and hyphens."
  },
  quantity: {
    min: 0.01,
    max: 9999,
    step: 0.01 // For number input
  },
  cost: {
    min: 0.01,
    max: 999.99,
    step: 0.01 // For number input
  },
});

// Helper function: Get today's date string (YYYY-MM-DD) for min/max attributes on date inputs
export function getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}