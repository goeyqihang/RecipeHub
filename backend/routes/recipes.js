const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipesController');
const authMiddleware = require('../middleware/auth');

// All recipe routes require the user to be a 'chef'.
router.use(authMiddleware.hasRole(['chef']));

// Main recipes page
router.get('/', recipeController.getAllRecipes);

// Add recipe routes
router.post('/add', recipeController.addRecipe);

// Update recipe routes
router.put('/update/:recipeId', authMiddleware.isRecipeOwner, recipeController.updateRecipe);

// Delete recipe routes
router.delete('/delete/:recipeId', authMiddleware.isRecipeOwner, recipeController.deleteRecipe);

// View a single recipe
router.get('/view/:recipeId', recipeController.getRecipeById);

router.post('/analyze-health/:recipeId', recipeController.analyzeRecipeHealth);

router.post('/translate/:recipeId', recipeController.translateRecipe);

module.exports = router;