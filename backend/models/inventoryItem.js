const mongoose = require('mongoose');
const CONSTANTS = require('../constants');
const Counter = require('./counter');

const inventoryItemSchema = new mongoose.Schema({
  // Unique identifier for the inventory item (format: I-XXXXX)
  inventoryId: {
    type: String,
    required: true,
    unique: true
  },
  // Reference to the user who added this inventory item
  userId: {
    type: String,
    required: true
  },
  // Name of the ingredient
  ingredientName: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50
  },
  // Amount available
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
    max: 9999
  },
  // Unit of measurement
  unit: {
    type: String,
    required: true,
    enum: Object.values(CONSTANTS.INVENTORY_UNITS)
  },
  // Food category
  category: {
    type: String,
    required: true,
    enum: Object.values(CONSTANTS.INVENTORY_CATEGORIES)
  },
  // Date item was acquired
  purchaseDate: {
    type: Date,
    required: true
  },
  // Expiry date
  expirationDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        // 'this' refers to the document being validated
        return value > this.purchaseDate;
      },
      message: 'Expiration date must be after the purchase date'
    }
  },
  // Storage location
  location: {
    type: String,
    required: true,
    enum: Object.values(CONSTANTS.STORAGE_LOCATIONS)
  },
  // Purchase cost per unit in dollars
  cost: {
    type: Number,
    required: true,
    min: 0.01,
    max: 999.99
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(CONSTANTS.INVENTORY_STATUS),
    default: CONSTANTS.INVENTORY_STATUS.IN_STOCK
  },
  consumedDate: {
    type: Date,
    required: false
  },
  // Date inventory was added
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

inventoryItemSchema.pre('validate', async function (next) {
  const doc = this;

  if (doc.isNew) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'inventoryId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      doc.inventoryId = 'I-' + counter.seq.toString().padStart(5, '0');
      next();
    } catch (error) {
      return next(error);
    }
  } else {
    next();
  }
});

// Explicitly set the collection name to 'inventory'
module.exports = mongoose.model('InventoryItem', inventoryItemSchema, 'inventory');