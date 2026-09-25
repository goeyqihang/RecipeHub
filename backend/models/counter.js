const mongoose = require('mongoose');

// Schema to track sequence numbers for different entities
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // userId, inventoryId, recipeId, 
  seq: { type: Number, default: 0 }      // Current sequence number
});

module.exports = mongoose.model('Counter', counterSchema);