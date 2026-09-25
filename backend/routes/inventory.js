const express = require('express');
const router = express.Router();

const inventoryController = require('../controllers/inventoryController');

router.get('/', inventoryController.getInventoryItems);

router.get('/view/:inventoryId', inventoryController.getInventoryItemById);

router.post('/add', inventoryController.addInventoryItem);

router.put('/update/:inventoryId', inventoryController.updateInventoryItem);

router.delete('/delete/:inventoryId', inventoryController.deleteInventoryItem);

module.exports = router;