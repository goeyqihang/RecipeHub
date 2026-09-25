const MEAL_TYPES = Object.freeze({
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
});

const CUISINE_TYPES = Object.freeze({
  ITALIAN: "Italian",
  ASIAN: "Asian",
  MEXICAN: "Mexican",
  AMERICAN: "American",
  FRENCH: "French",
  INDIAN: "Indian",
  MEDITERRANEAN: "Mediterranean",
  OTHER: "Other",
});

const DIFFICULTY_LEVELS = Object.freeze({
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
});

const INVENTORY_CATEGORIES = Object.freeze({
  VEGETABLES: "Vegetables",
  FRUITS: "Fruits",
  MEAT: "Meat",
  DAIRY: "Dairy",
  GRAINS: "Grains",
  SPICES: "Spices",
  BEVERAGES: "Beverages",
  FROZEN: "Frozen",
  CANNED: "Canned",
  OTHER: "Other",
});

const STORAGE_LOCATIONS = Object.freeze({
  FRIDGE: "Fridge",
  FREEZER: "Freezer",
  PANTRY: "Pantry",
  COUNTER: "Counter",
  CUPBOARD: "Cupboard",
});

const INVENTORY_UNITS = Object.freeze({
  PIECES: "pieces",
  KG: "kg",
  G: "g",
  LITERS: "liters",
  ML: "ml",
  CUPS: "cups",
  TBSP: "tbsp",
  TSP: "tsp",
  DOZEN: "dozen",
});

const INVENTORY_STATUS = Object.freeze({
  IN_STOCK: "In Stock",
  CONSUMED: "Consumed",
  WASTED: "Wasted",
});

const USER_ROLE = Object.freeze({
  ADMIN: "admin",
  CHEF: "chef",
  MANAGER: "manager",
});


module.exports = {
  MEAL_TYPES,
  CUISINE_TYPES,
  DIFFICULTY_LEVELS,
  INVENTORY_CATEGORIES,
  STORAGE_LOCATIONS,
  INVENTORY_UNITS,
  USER_ROLE,
  INVENTORY_STATUS
};