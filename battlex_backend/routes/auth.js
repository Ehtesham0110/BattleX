// auth.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// ----------------------- AUTH ROUTES -----------------------
router.post('/signup', UserController.signup);
router.post('/verify-otp', UserController.verifyOtp);
router.post('/resend-otp', UserController.resendOtp);  // ✅ fully implemented in userController
router.post('/login', UserController.login);

// ----------------------- WALLET ROUTES -----------------------
router.get('/wallet/:phone', UserController.getWalletBalance);
router.post('/wallet/add', UserController.addMoney);
router.post('/wallet/withdraw', UserController.withdrawMoney);
router.get('/wallet/transactions/:phone', UserController.getTransactions);

module.exports = router;
