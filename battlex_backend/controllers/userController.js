// userController.js

const bcrypt = require('bcrypt');
const User = require('../models/user');
const Transaction = require('../models/transaction');

// ----------------------- LOGIN -----------------------
const login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and password are required',
      });
    }

    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, foundUser.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!foundUser.phoneVerified) {
      return res.status(403).json({
        success: false,
        message: 'Phone number not verified',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        _id: foundUser._id,
        username: foundUser.username,
        phoneNumber: foundUser.phoneNumber,
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
    const { phoneNumber, username, password, phoneVerified } = req.body;

    if (!phoneNumber || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, username and password are required',
      });
    }

    if (phoneVerified !== true) {
      return res.status(400).json({
        success: false,
        message: 'Phone verification required',
      });
    }

    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this phone number',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      phoneNumber,
      username,
      password: hashedPassword,
      phoneVerified: true,
      walletBalance: 0,
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Signup successful',
      user: {
        _id: newUser._id,
        username: newUser.username,
        phoneNumber: newUser.phoneNumber,
      },
    });
  } catch (error) {
    console.error('❌ Signup Error:', error);
    return res.status(500).json({ success: false, message: 'Signup failed' });
  }
};

// ----------------------- WALLET -----------------------
const getWalletBalance = async (req, res) => {
  try {
    const phoneNumber = req.params.phone;
    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      walletBalance: foundUser.walletBalance,
    });
  } catch (error) {
    console.error('❌ Wallet Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const addMoney = async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    foundUser.walletBalance += amount;
    await foundUser.save();

    await Transaction.create({
      user: foundUser._id,
      type: 'credit',
      amount,
      reason: 'Money added',
    });

    return res.status(200).json({
      success: true,
      walletBalance: foundUser.walletBalance,
    });
  } catch (error) {
    console.error('❌ Add Money Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const withdrawMoney = async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;

    if (!amount || isNaN(amount) || amount < 50) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal is ₹50',
      });
    }

    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (foundUser.walletBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
      });
    }

    foundUser.walletBalance -= amount;
    await foundUser.save();

    await Transaction.create({
      user: foundUser._id,
      type: 'debit',
      amount,
      reason: 'Money withdrawn',
    });

    return res.status(200).json({
      success: true,
      walletBalance: foundUser.walletBalance,
    });
  } catch (error) {
    console.error('❌ Withdraw Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const getTransactions = async (req, res) => {
  try {
    const phoneNumber = req.params.phone;
    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const transactions = await Transaction.find({ user: foundUser._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('❌ Transactions Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  login,
  signup,
  getWalletBalance,
  addMoney,
  withdrawMoney,
  getTransactions,
};
