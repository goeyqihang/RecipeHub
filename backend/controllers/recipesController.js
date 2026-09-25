const Recipe = require('../models/recipe');
const config = require('../config');
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { Translate } = require('@google-cloud/translate').v2;

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// Structured output: Gemini must reply with JSON in exactly this shape instead of free text
const HEALTH_ANALYSIS_SCHEMA = {
    type: SchemaType.OBJECT,
    properties: {
        summary: { type: SchemaType.STRING },
        concerns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        suggestions: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    suggestion: { type: SchemaType.STRING },
                    explanation: { type: SchemaType.STRING }
                },
                required: ['suggestion', 'explanation']
            }
        }
    },
    required: ['summary', 'concerns', 'suggestions']
};

const healthAnalysisModel = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: HEALTH_ANALYSIS_SCHEMA
    }
});

// Authenticates with the service-account key referenced by GOOGLE_APPLICATION_CREDENTIALS
const translate = new Translate();

/**
 * @desc    Display all recipes, with an optional filter for 'mine'
 * @route   GET /api/recipes
 */
exports.getAllRecipes = async (req, res) => {
    try {
        const { filter } = req.query;
        const loggedInUser = res.locals.loggedInUser;

        let query = {};
        if (filter === 'mine' && loggedInUser) {
            query = { userId: loggedInUser.userId };
        }
        const recipes = await Recipe.find(query).sort({ createdDate: -1 });
        res.status(200).json(recipes);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ error: 'Failed to load recipes' });
    }
};

/**
 * @desc    Display a single recipe by its ID and increment its view count.
 * @route   GET /api/recipes/view/:recipeId
 */
exports.getRecipeById = async (req, res) => {
    try {

        const recipe = await Recipe.findOneAndUpdate(
            { recipeId: req.params.recipeId },
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        res.status(200).json(recipe);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ error: 'Failed to load the requested recipe.' });
    }
};

// Fields a client may set when creating a recipe. The server sets userId, recipeId, views and createdDate.
const CREATE_FIELDS = ['title', 'chef', 'ingredients', 'instructions', 'mealType', 'cuisineType', 'prepTime', 'difficulty', 'servings'];
// The chef (author name) is fixed once a recipe exists
const UPDATE_FIELDS = CREATE_FIELDS.filter(field => field !== 'chef');
const LIST_FIELDS = ['ingredients', 'instructions'];

/**
 * Copies only the allowed fields from a request body.
 * Ingredients and instructions must be arrays of strings; entries are trimmed and empty ones dropped.
 * Returns { data } on success, or { error } if a list is malformed.
 */
const pickRecipeFields = (body, fields) => {
    const data = {};
    for (const field of fields) {
        if (body[field] === undefined) continue;

        if (LIST_FIELDS.includes(field)) {
            const list = body[field];
            if (!Array.isArray(list) || !list.every(item => typeof item === 'string')) {
                return { error: `${field} must be an array of strings.` };
            }
            data[field] = list.map(item => item.trim()).filter(item => item.length > 0);
        } else {
            data[field] = body[field];
        }
    }
    return { data };
};

const duplicateTitleMessage = (title) => `A recipe with the title "${title}" already exists.`;

/**
 * @desc    Create a recipe for the logged-in chef
 * @route   POST /api/recipes/add
 */
exports.addRecipe = async (req, res) => {
    try {
        const { data, error } = pickRecipeFields(req.body, CREATE_FIELDS);
        if (error) {
            return res.status(400).json({ error });
        }

        // Titles are unique across all recipes (enforced by a unique index as well)
        if (typeof data.title === 'string' && await Recipe.exists({ title: data.title })) {
            return res.status(409).json({ error: duplicateTitleMessage(data.title) });
        }

        const newRecipe = new Recipe({ ...data, userId: res.locals.loggedInUser.userId });
        await newRecipe.save();
        res.status(201).json(newRecipe);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        if (error.code === 11000) {
            return res.status(409).json({ error: duplicateTitleMessage(req.body.title) });
        }
        console.error('Error adding recipe:', error);
        res.status(500).json({ error: 'Failed to add recipe.' });
    }
};

/**
 * @desc    Update a recipe (only its owner may do this, enforced by middleware)
 * @route   PUT /api/recipes/update/:recipeId
 */
exports.updateRecipe = async (req, res) => {
    try {
        const { recipeId } = req.params;
        const { data, error } = pickRecipeFields(req.body, UPDATE_FIELDS);
        if (error) {
            return res.status(400).json({ error });
        }

        if (typeof data.title === 'string' && await Recipe.exists({ title: data.title, recipeId: { $ne: recipeId } })) {
            return res.status(409).json({ error: duplicateTitleMessage(data.title) });
        }

        const updatedRecipe = await Recipe.findOneAndUpdate(
            { recipeId: recipeId },
            data,
            { new: true, runValidators: true }
        );

        if (!updatedRecipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.status(200).json(updatedRecipe);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        if (error.code === 11000) {
            return res.status(409).json({ error: duplicateTitleMessage(req.body.title) });
        }
        console.error('Error updating recipe:', error);
        res.status(500).json({ error: 'Failed to update recipe.' });
    }
};

/**
 * @desc    Delete a recipe (only its owner may do this, enforced by middleware)
 * @route   DELETE /api/recipes/delete/:recipeId
 */
exports.deleteRecipe = async (req, res) => {
    try {
        const { recipeId } = req.params;
        const result = await Recipe.deleteOne({ recipeId: recipeId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        res.status(200).json({ message: 'Recipe deleted successfully!' });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ error: 'Failed to delete recipe.' });
    }
};

/**
 * @desc    Analyze the healthiness of a recipe using AI
 * @route   POST /api/recipes/analyze-health/:recipeId
 */
exports.analyzeRecipeHealth = async (req, res) => {
    if (!config.geminiApiKey) {
        return res.status(503).json({ error: 'AI health analysis is not configured on the server (GEMINI_API_KEY is missing).' });
    }

    try {
        // Analyze the stored recipe rather than trusting ingredients sent by the client
        const recipe = await Recipe.findOne({ recipeId: req.params.recipeId }).lean();
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        const prompt = `Analyze the healthiness of a recipe with these ingredients: ${recipe.ingredients.join(', ')}.
         Provide a brief summary, list potential health concerns (like high sodium, saturated fat, sugar),
         and suggest 3 specific, actionable improvements with explanations for making it healthier.`;

        const result = await healthAnalysisModel.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // The schema should guarantee plain JSON, but strip Markdown code fences just in case
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

        try {
            const analysisResult = JSON.parse(text);
            // Basic validation
            if (!analysisResult.summary || !Array.isArray(analysisResult.concerns) || !Array.isArray(analysisResult.suggestions)) {
                throw new Error("AI response did not match expected JSON structure.");
            }
            res.status(200).json(analysisResult);
        } catch (parseError) {
            res.status(500).json({ error: 'Failed to parse health analysis from AI response.', rawResponse: text });
        }

    } catch (error) {
        console.error('Error analyzing recipe health:', error);
        res.status(500).json({ error: 'Failed to analyze recipe health.', details: error.message });
    }
};

/**
 * @desc    Translate recipe title, ingredients, and instructions
 * @route   POST /api/recipes/translate/:recipeId
 */
exports.translateRecipe = async (req, res) => {
    try {
        const { recipeId } = req.params;
        const { targetLanguage } = req.body;

        if (!targetLanguage) {
            return res.status(400).json({ error: 'Target language is required.' });
        }

        const recipe = await Recipe.findOne({ recipeId: recipeId }).lean(); // Use lean() for plain JS object

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        const textsToTranslate = [
            recipe.title,
            ...recipe.ingredients, // Translate each ingredient individually
            ...recipe.instructions // Translate each instruction individually
        ];

        // Perform translation
        const [translations] = await translate.translate(textsToTranslate, targetLanguage);

        // Structure the response
        const translatedData = {
            title: translations[0],
            // Map ingredients back, skipping the title
            ingredients: translations.slice(1, 1 + recipe.ingredients.length),
            // Map instructions back, skipping title and ingredients
            instructions: translations.slice(1 + recipe.ingredients.length),
            originalLanguage: 'en', // Assuming original is English
            targetLanguage: targetLanguage
        };

        res.status(200).json(translatedData);

    } catch (error) {
        console.error('Error translating recipe:', error);
        res.status(500).json({ error: 'Failed to translate recipe.', details: error.message });
    }
};