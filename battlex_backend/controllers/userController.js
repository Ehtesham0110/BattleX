//userController.js

const bcrypt = require('bcrypt');
const User = require('../models/user');         
const Transaction = require('../models/transaction');
const sendMail = require('../services/brevoMail');
const otpTemplate = require('../templates/otpEmail');


// ----------------------- LOGIN -----------------------
const login = async (req, res) => {
  try {
    const phoneNumber = req.body.phoneNumber?.trim();
    const username = req.body.username?.trim();

    if (!phoneNumber || !username) {
      return res.status(400).json({ success: false, message: 'Phone number and username are required' });
    }

    const foundUser = await User.findOne({ phoneNumber, username });

    if (!foundUser) return res.status(404).json({ success: false, message: 'User not found' });
    if (!foundUser.isVerified) return res.status(403).json({ success: false, message: 'Please verify your account via OTP' });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        _id: foundUser._id,
        phoneNumber: foundUser.phoneNumber,
        username: foundUser.username,
        walletBalance: foundUser.walletBalance || 0,
      },
    });
  } catch (error) {
    console.error('❌ Login Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ----------------------- SIGNUP -----------------------
const signup = async (req, res) => {
  try {
    const { phoneNumber, username, email, password } = req.body;

    if (!phoneNumber || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ phoneNumber }, { email }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const newUser = new User({
      phoneNumber,
      username,
      email,
      password,
      otp: otpCode,
      otpExpiry,
      isVerified: false,
    });

    await newUser.save();

    // ✅ RESPOND FIRST (NON-BLOCKING)
    res.status(201).json({
      success: true,
      message: 'Signup successful. OTP generated.',
    });

    // 🔁 SEND OTP EMAIL (HTML + TEXT FALLBACK)
    sendMail({
      to: email,
      subject: 'BattleX Verification Code',
      text: `Your BattleX OTP is ${otpCode}. It will expire in 10 minutes.`,
      html: otpTemplate({
        otp: otpCode,
        minutes: 10,
      }),
    }).catch(err => {
      console.error('⚠️ OTP email failed (signup still OK):', err.message);
    });

  } catch (error) {
    console.error('❌ Signup Error:', error);
    return res.status(500).json({ success: false, message: 'Signup failed' });
  }
};


// ----------------------- VERIFY OTP -----------------------
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    // ✅ Find user by email only
    const foundUser = await User.findOne({ email });
    if (!foundUser) return res.status(404).json({ success: false, message: 'User not found' });
    if (foundUser.isVerified) return res.status(400).json({ success: false, message: 'User already verified' });

    if (String(foundUser.otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (Date.now() > new Date(foundUser.otpExpiry).getTime()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // ✅ Mark user as verified
    foundUser.isVerified = true;
    foundUser.otp = null;
    foundUser.otpExpiry = null;

    // ✅ Save the user
    await foundUser.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified and user account is active',
      user: {
        _id: foundUser._id,
        phoneNumber: foundUser.phoneNumber,
        username: foundUser.username,
        email: foundUser.email,
      },
    });
  } catch (error) {
    console.error('❌ OTP Verification Error:', error);
    return res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
};

// ----------------------- WALLET / TRANSACTIONS -----------------------
const getWalletBalance = async (req, res) => {
  try {
    const phoneNumber = req.params.phone;
    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) return res.status(404).json({ success: false, message: 'User not found' });

    return res.status(200).json({ success: true, walletBalance: foundUser.walletBalance });
  } catch (error) {
    console.error('❌ Wallet Balance Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const addMoney = async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be a positive number' });

    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) return res.status(404).json({ success: false, message: 'User not found' });

    foundUser.walletBalance += amount;
    await foundUser.save();

    await Transaction.create({
      user: foundUser._id,
      type: 'credit',
      amount,
      reason: 'Money added to wallet',
    });

    return res.status(200).json({ success: true, walletBalance: foundUser.walletBalance });
  } catch (error) {
    console.error('❌ Add Money Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const withdrawMoney = async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!amount || isNaN(amount) || amount < 50) return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₹50' });

    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) return res.status(404).json({ success: false, message: 'User not found' });
    if (foundUser.walletBalance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    foundUser.walletBalance -= amount;
    await foundUser.save();

    await Transaction.create({
      user: foundUser._id,
      type: 'debit',
      amount,
      reason: 'Money withdrawn from wallet',
    });

    return res.status(200).json({ success: true, walletBalance: foundUser.walletBalance });
  } catch (error) {
    console.error('❌ Withdraw Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const phoneNumber = req.params.phone;
    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) return res.status(404).json({ success: false, message: 'User not found' });

    const transactions = await Transaction.find({ user: foundUser._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('❌ Transaction Fetch Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ----------------------- RESEND OTP -----------------------
const resendOtp = async (req, res) => {
  try {
    const { phoneNumber, email } = req.body;

    if (!phoneNumber || !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and email are required'
      });
    }

    const foundUser = await User.findOne({ phoneNumber, email });

    if (!foundUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (foundUser.isVerified) {
      return res.status(400).json({ success: false, message: 'User already verified' });
    }

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    foundUser.otp = otpCode;
    foundUser.otpExpiry = otpExpiry;
    await foundUser.save();

    // ✅ RESPOND FIRST
    res.status(200).json({
      success: true,
      message: 'OTP regenerated'
    });

    // 🔁 SEND EMAIL IN BACKGROUND (NON-BLOCKING)
    sendMail({
      to: email,
      subject: 'BattleX OTP Resend',
      text: `Your new OTP is: ${otpCode}\n\nIt will expire in 10 minutes.`,
    }).catch(err => {
      console.error('⚠️ Resend OTP email failed:', err.message);
    });

  } catch (error) {
    console.error('❌ Resend OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
};

module.exports = {
  login,
  signup,
  verifyOtp,
  resendOtp,          // ✅ Add here
  getWalletBalance,
  addMoney,
  withdrawMoney,
  getTransactions
};
