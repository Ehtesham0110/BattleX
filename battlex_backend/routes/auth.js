// auth.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// ----------------------- AUTH ROUTES -----------------------

// 🔐 SIGNUP (phone already verified by Firebase on frontend)
router.post('/signup', UserController.signup);

// 🔑 LOGIN (phone + password or existing logic)
router.post('/login', UserController.login);

// ----------------------- WALLET ROUTES -----------------------

router.get('/wallet/:phone', UserController.getWalletBalance);
router.post('/wallet/add', UserController.addMoney);
router.post('/wallet/withdraw', UserController.withdrawMoney);
router.get('/wallet/transactions/:phone', UserController.getTransactions);

module.exports = router;
