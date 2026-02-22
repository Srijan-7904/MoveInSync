const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/login', adminController.loginAdmin);
router.get('/dashboard', authMiddleware.authAdmin, adminController.getDashboard);
router.get('/users', authMiddleware.authAdmin, adminController.getAllUsers);
router.get('/captains', authMiddleware.authAdmin, adminController.getAllCaptains);

module.exports = router;
