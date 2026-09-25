const mongoose = require('mongoose');
const CONSTANTS = require('../constants');
const Counter = require('./counter');

const recipeSchema = new mongoose.Schema({
  // Unique identifier for the recipe (format: R-XXXXX)
  recipeId: {
    type: String,
    required: true,
    unique: true
  },
  // Reference to the user who created this recipe
  userId: {
    type: String,
    required: true
  },
  // Name of the recipe
  title: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 100
  },
  // Person who created/submitted the recipe
  chef: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50
  },
  // List of required ingredients
  ingredients: {
    type: [String],
    required: true,
    validate: [
      { validator: v => v.length >= 1 && v.length <= 20, message: 'Requires 1 to 20 ingredients' },
      { validator: v => v.every(item => item.trim().length >= 3), message: 'Each ingredient must be at least 3 characters long' }
    ]
  },
  // Step-by-step cooking instructions
  instructions: {
    type: [String],
    required: true,
    validate: [
      { validator: v => v.length >= 1 && v.length <= 15, message: 'Requires 1 to 15 instruction steps' },
      { validator: v => v.every(item => item.trim().length >= 10), message: 'Each instruction step must be at least 10 characters long' }
    ]
  },
  // Category of meal
  mealType: {
    type: String,
    required: true,
    enum: Object.values(CONSTANTS.MEAL_TYPES)
  },
  // Origin/style of cuisine
  cuisineType: {
    type: String,
    required: true,
    enum: Object.values(CONSTANTS.CUISINE_TYPES)
  },
  // Preparation time in minutes
  prepTime: {
    type: Number,
    required: true,
    min: 1,
    max: 480
  },
  // Cooking difficulty level
  difficulty: {
    type: String,
    required: true,
    enum: Object.values(CONSTANTS.DIFFICULTY_LEVELS)
  },
  // Number of people served
  servings: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  views: {
    type: Number,
    default: 0
  },
  // Date recipe was added
  createdDate: {
    type: Date,
    required: true,
    default: () => {
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      return now;
    }
  }
});

recipeSchema.pre('validate', async function (next) {
  const doc = this;

  if (doc.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'recipeId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      doc.recipeId = 'R-' + counter.seq.toString().padStart(5, '0');
      next();
    } catch (error) {
      return next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Recipe', recipeSchema);