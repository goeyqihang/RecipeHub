const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

// Role-specific dashboard data for the logged-in user
router.get('/', indexController.getDashboardData);

module.exports = router;