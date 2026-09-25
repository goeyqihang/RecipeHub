const InventoryItem = require('../models/inventoryItem');
const CONSTANTS = require('../constants');

/**
 * @desc    Get inventory items as JSON, optionally filtered by query parameters.
 * Also includes key stats based *only* on 'In Stock' items, regardless of filters applied to the item list itself.
 * @route   GET /api/inventory
 * @query   category (string) - Filter by category
 * @query   location (string) - Filter by location
 * @query   status (string) - Filter by status (e.g., 'In Stock', 'Consumed', 'Wasted', 'all') - defaults to 'In Stock' if not provided
 * @query   sortBy (string) - Field to sort by (e.g., 'ingredientName', 'expirationDate', 'quantity')
 * @query   sortDir (string) - Sort direction ('asc' or 'desc', defaults to 'asc')
 * @query   expiringWithinDays (number) - Filter items expiring within X days (only applies when status is 'In Stock')
 */
exports.getInventoryItems = async (req, res) => {
    try {
        const { category, location, status, sortBy, sortDir, expiringWithinDays } = req.query;

        // --- Build Filter Query ---
        let filterQuery = {};

        // Handle status filter: Default to 'In Stock', allow specific statuses, or omit for 'all'
        if (status && status !== 'all' && Object.values(CONSTANTS.INVENTORY_STATUS).includes(status)) {
            filterQuery.status = status; // Filter by specific valid status ('Consumed', 'Wasted')
        } else if (!status || (status !== 'all' && !Object.values(CONSTANTS.INVENTORY_STATUS).includes(status))) {
            // Default to 'In Stock' if status is missing or invalid
            filterQuery.status = CONSTANTS.INVENTORY_STATUS.IN_STOCK;
        }
        // If status === 'all', filterQuery.status remains undefined, fetching all statuses.


        // Get the allowed category and location values from the constants objects
        const allowedCategories = Object.values(CONSTANTS.INVENTORY_CATEGORIES);
        const allowedLocations = Object.values(CONSTANTS.STORAGE_LOCATIONS);

        // Check if the provided category is one of the allowed values
        if (category && category !== 'all' && allowedCategories.includes(category)) {
            filterQuery.category = category;
        }
        // Check if the provided location is one of the allowed values
        if (location && location !== 'all' && allowedLocations.includes(location)) {
            filterQuery.location = location;
        }

        // Handle expiringWithinDays filter - **only applies effectively when status is 'In Stock'**
        if (expiringWithinDays && !isNaN(parseInt(expiringWithinDays))) {
            const days = parseInt(expiringWithinDays);
            if (days >= 0) { // Ensure days is non-negative
                const today = new Date();
                const futureDate = new Date();
                futureDate.setDate(today.getDate() + days);
                today.setHours(0, 0, 0, 0); // Start of today
                futureDate.setHours(23, 59, 59, 999); // End of the future day

                // Apply expiration filter: expirationDate >= today AND expirationDate <= futureDate
                filterQuery.expirationDate = {
                    $gte: today,
                    $lte: futureDate
                };

                // Force status to 'In Stock' when using expiringWithinDays, as it only makes sense for current stock
                filterQuery.status = CONSTANTS.INVENTORY_STATUS.IN_STOCK;
            }
        }


        // --- Build Sort Query ---
        let sortQuery = {};
        const validSortFields = ['ingredientName', 'expirationDate', 'purchaseDate', 'createdDate', 'quantity', 'cost', 'category', 'location'];
        if (sortBy && validSortFields.includes(sortBy)) {
            // Ensure sortDir is either 'asc' or 'desc', default to 'asc'
            const direction = (sortDir === 'desc' ? -1 : 1);
            sortQuery[sortBy] = direction;
        } else {
            // Default sort if no valid sortBy is provided
            sortQuery['ingredientName'] = 1; // Default sort by ingredient name ascending
        }

        // --- Fetch Filtered Items ---
        const filteredItems = await InventoryItem.find(filterQuery).sort(sortQuery).lean(); // Use lean() for performance


        // --- Calculate Stats (Always based on ALL 'In Stock' items, independent of list filters) ---
        const expiringSoonDaysStat = 3; // For dashboard stats only
        const lowStockThresholdStat = 5; // For dashboard stats only

        const [totalInStockCount, expiringSoonCount, lowStockCount, valueAggregationResult] =
            await Promise.all([
                InventoryItem.countDocuments({ status: CONSTANTS.INVENTORY_STATUS.IN_STOCK }),
                InventoryItem.countDocuments({
                    status: CONSTANTS.INVENTORY_STATUS.IN_STOCK,
                    expirationDate: {
                        $gte: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today
                        $lte: new Date(new Date().setDate(new Date().getDate() + expiringSoonDaysStat))
                    },
                }),
                InventoryItem.countDocuments({
                    status: CONSTANTS.INVENTORY_STATUS.IN_STOCK,
                    quantity: { $lt: lowStockThresholdStat }, // Items with quantity LESS THAN threshold
                }),
                // Use aggregation to calculate total value directly in the database
                InventoryItem.aggregate([
                    { $match: { status: CONSTANTS.INVENTORY_STATUS.IN_STOCK } },
                    { $group: { _id: null, totalValue: { $sum: "$cost" } } }
                ])
            ]);

        // Extract total value from aggregation result, defaulting to 0 if no items are found
        const totalValueInStock = valueAggregationResult.length > 0 ? valueAggregationResult[0].totalValue : 0;


        // --- Return JSON Response ---
        res.status(200).json({
            inventoryItems: filteredItems, // The list reflecting applied filters
            stats: { // Stats always based on all 'In Stock' items
                totalValue: totalValueInStock,
                totalItems: totalInStockCount,
                expiringSoonCount: expiringSoonCount, // Based on expiringSoonDaysStat
                lowStockCount: lowStockCount,       // Based on lowStockThresholdStat
            },
            filtersApplied: req.query // Return the query params for potential UI state syncing
        });

    } catch (error) {
        console.error('Error fetching filtered inventory data:', error);
        res.status(500).json({
            error: 'Failed to load filtered inventory data',
            details: error.message
        });
    }
};

/**
 * @desc    Get a single inventory item by its ID as JSON
 * @route   GET /api/inventory/view/:inventoryId
 */
exports.getInventoryItemById = async (req, res) => {
    try {
        const item = await InventoryItem.findOne({
            inventoryId: req.params.inventoryId,
        });
        if (!item) {
            // Return 404 JSON response
            return res.status(404).json({ error: 'Inventory item not found.' });
        }
        // Return item as JSON
        res.status(200).json(item);
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        // Return 500 JSON response
        res.status(500).json({
            error: 'Failed to load inventory item.',
            details: error.message
        });
    }
};

/**
 * @desc    Handle the submission of the new inventory item form, return JSON
 * @route   POST /api/inventory/add
 */
exports.addInventoryItem = async (req, res) => {
    try {
        const {
            ingredientName, quantity, unit, category,
            purchaseDate, expirationDate, location, cost,
        } = req.body;

        const loggedInUser = res.locals.loggedInUser;
        if (!loggedInUser) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const newItem = new InventoryItem({
            userId: loggedInUser.userId,
            ingredientName, quantity, unit, category,
            purchaseDate, expirationDate, location, cost,
            // Status defaults to 'In Stock' via schema
        });

        await newItem.save();
        // Return the newly created item as JSON
        res.status(201).json(newItem);

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val) => val.message);
            // Return validation errors as JSON
            return res.status(400).json({
                error: 'Validation failed',
                details: messages
            });
        }
        console.error('Error adding inventory item:', error);
        // Return 500 JSON response
        res.status(500).json({
            error: 'Failed to add inventory item.',
            details: error.message
        });
    }
};

/**
 * @desc    Handle the submission of the updated inventory item form, return JSON
 * @route   PUT /api/inventory/update/:inventoryId
 */
exports.updateInventoryItem = async (req, res) => {
    try {
        const { inventoryId } = req.params;
        const updateData = req.body; // Contains fields like ingredientName, quantity, etc.

        // Find the specific item to update, ensuring it is currently 'In Stock'
        const item = await InventoryItem.findOne({
            inventoryId: inventoryId,
            status: CONSTANTS.INVENTORY_STATUS.IN_STOCK,
        });

        if (!item) {
            // Return 404 JSON response
            return res.status(404).json({ error: 'Item not found or not in stock for update.' });
        }

        // Update item properties from request body
        // Ensure only allowed fields are updated
        const allowedUpdates = ['ingredientName', 'quantity', 'unit', 'category', 'purchaseDate', 'expirationDate', 'location', 'cost'];
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                item[key] = updateData[key];
            }
        });

        // Save the updated document
        const updatedItem = await item.save();
        // Return the updated item as JSON
        res.status(200).json(updatedItem);

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((val) => val.message);
            return res.status(400).json({
                error: 'Validation failed during update',
                details: messages
            });
        }
        console.error('Error updating inventory item:', error);
        // Return 500 JSON response
        res.status(500).json({
            error: 'Failed to update inventory item.',
            details: error.message
        });
    }
};

/**
 * @desc    Handle the removal (soft/hard) of an inventory item, return JSON message
 * @route   DELETE /api/inventory/delete/:inventoryId
 */
exports.deleteInventoryItem = async (req, res) => {
    try {
        const { inventoryId } = req.params;
        const { deletionReason } = req.body;

        if (!deletionReason) {
            return res.status(400).json({ error: 'Deletion reason is required.' });
        }

        let resultMessage = '';

        if (deletionReason === 'PermanentDelete') {
            const result = await InventoryItem.deleteOne({ inventoryId: inventoryId });
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Item not found or could not be deleted.' });
            }
            resultMessage = 'Item permanently deleted!';

        } else if ([CONSTANTS.INVENTORY_STATUS.CONSUMED, CONSTANTS.INVENTORY_STATUS.WASTED].includes(deletionReason)) {
            const updatedItem = await InventoryItem.findOneAndUpdate(
                { inventoryId: inventoryId, status: CONSTANTS.INVENTORY_STATUS.IN_STOCK },
                { $set: { status: deletionReason, consumedDate: new Date() } },
                { new: true }
            );
            if (!updatedItem) {
                return res.status(404).json({ error: 'Item not found or has already been processed.' });
            }
            resultMessage = `Item status updated to '${deletionReason}'.`;
        } else {
            return res.status(400).json({ error: 'Invalid deletion reason provided.' });
        }

        // Return success message as JSON
        res.status(200).json({ message: resultMessage });

    } catch (error) {
        console.error('Error processing inventory item removal:', error);
        // Return 500 JSON response
        res.status(500).json({
            error: 'Failed to process item removal.',
            details: error.message
        });
    }
};
