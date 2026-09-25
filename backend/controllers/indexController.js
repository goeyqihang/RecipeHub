const User = require('../models/user');
const Recipe = require('../models/recipe');
const InventoryItem = require('../models/inventoryItem');
const CONSTANTS = require('../constants');

exports.getDashboardData = async (req, res) => {
    try {
        const loggedInUser = res.locals.loggedInUser;

        const [userCount, recipeCount, inventoryCount] = await Promise.all([
            User.countDocuments(),
            Recipe.countDocuments(),
            InventoryItem.countDocuments({ status: CONSTANTS.INVENTORY_STATUS.IN_STOCK })
        ]);

        const commonData = {
            stats: {
                users: userCount,
                recipes: recipeCount,
                inventory: inventoryCount
            }
        };

        switch (loggedInUser.role) {
            case 'chef':
                const expiringSoonDaysChef = 3;
                const [chefRecipes, expiringItems, allRecipes] = await Promise.all([
                    Recipe.find({ userId: loggedInUser.userId }).sort({ createdDate: -1 }).limit(5).lean(),
                    InventoryItem.find({
                        status: CONSTANTS.INVENTORY_STATUS.IN_STOCK,
                        expirationDate: {
                            $gte: new Date(),
                            $lte: new Date(new Date().setDate(new Date().getDate() + expiringSoonDaysChef))
                        }
                    }).sort({ expirationDate: 1 }).limit(5).lean(),
                    Recipe.find().lean()
                ]);

                const inventory = await InventoryItem.find({ status: CONSTANTS.INVENTORY_STATUS.IN_STOCK }).lean();
                const availableIngredients = new Set(inventory.map(item => item.ingredientName.toLowerCase()));

                const recipeSuggestions = allRecipes.map(recipe => {
                    const matchedCount = recipe.ingredients.filter(ing => {
                        const ingLower = ing.toLowerCase();
                        return Array.from(availableIngredients).some(availIng => ingLower.includes(availIng));
                    }).length;

                    const cookabilityScore = (recipe.ingredients.length > 0) ? (matchedCount / recipe.ingredients.length) * 100 : 0;
                    return { ...recipe, cookabilityScore };
                }).sort((a, b) => b.cookabilityScore - a.cookabilityScore).slice(0, 3);

                return res.json({
                    ...commonData,
                    chefRecipes,
                    expiringItems,
                    recipeSuggestions,
                });

            case 'manager':
                const expiringSoonDaysManager = 7;
                const lowStockThreshold = 5;

                const [inventoryOverview, lowStockItems] = await Promise.all([
                    InventoryItem.aggregate([
                        { $match: { status: CONSTANTS.INVENTORY_STATUS.IN_STOCK } },
                        {
                            $group: {
                                _id: null,
                                totalValue: { $sum: "$cost" },
                                expiringSoon: {
                                    $push: {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $gte: ["$expirationDate", new Date()] },
                                                    { $lte: ["$expirationDate", new Date(new Date().setDate(new Date().getDate() + expiringSoonDaysManager))] }
                                                ]
                                            },
                                            { name: "$ingredientName", expirationDate: "$expirationDate" },
                                            "$$REMOVE"
                                        ]
                                    }
                                }
                            }
                        }
                    ]),
                    InventoryItem.find({ status: CONSTANTS.INVENTORY_STATUS.IN_STOCK, quantity: { $lt: lowStockThreshold } })
                        .sort({ quantity: 1 })
                        .limit(5)
                        .lean()
                ]);

                const managerData = inventoryOverview[0] || { totalValue: 0, expiringSoon: [] };
                managerData.expiringSoon.sort((a, b) => a.expirationDate - b.expirationDate);

                return res.json({
                    ...commonData,
                    totalValue: managerData.totalValue,
                    expiringItems: managerData.expiringSoon.slice(0, 5),
                    lowStockItems: lowStockItems
                });

            case 'admin':
                const [userRoleDistribution, recentUsers, recentRecipes, recentInventory] = await Promise.all([
                    User.aggregate([
                        { $group: { _id: "$role", count: { $sum: 1 } } },
                        { $sort: { _id: 1 } }
                    ]),
                    User.find().sort({ createdAt: -1 }).limit(5).lean(),
                    Recipe.find().sort({ createdDate: -1 }).limit(5).lean(),
                    InventoryItem.find().sort({ createdDate: -1 }).limit(5).lean()
                ]);

                return res.json({
                    ...commonData,
                    userRoleDistribution,
                    recentUsers,
                    recentRecipes,
                    recentInventory
                });

            default:
                return res.status(403).json({ error: 'Unauthorized' });
        }
    } catch (error) {
        console.error('Error fetching homepage data:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard data',
            stats: { users: 0, recipes: 0, inventory: 0 },
            totalValue: 0,
            expiringItems: [],
            lowStockItems: []
        });
    }
};