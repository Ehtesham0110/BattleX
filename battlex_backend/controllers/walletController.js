const Transaction = require('../models/transaction');
const User = require('../models/user');

// ✅ HELPER: Get current IST time
const getISTTime = () => {
  const now = new Date();
  // Convert UTC to IST (UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  return new Date(now.getTime() + istOffset);
};

// ----------------------- ADD MONEY -----------------------
exports.addMoney = async (req, res) => {
  console.log('💰 [Add Money] Request body:', req.body);
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount || isNaN(amount) || amount <= 0) {
      console.warn('⚠ Invalid request body for addMoney:', req.body);
      return res.status(400).json({ success: false, message: 'phoneNumber and positive amount required' });
    }

    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) {
      console.warn('⚠ User not found for addMoney:', phoneNumber);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    foundUser.walletBalance += amount;
    await foundUser.save();

    // ✅ FIXED: Create transaction with IST time
    await Transaction.create({
      user: foundUser._id,
      type: 'add',
      amount,
      description: 'Money added to wallet',
      date: getISTTime() // ✅ Use IST time instead of UTC
    });

    console.log(`✅ Money added: ${amount} to ${phoneNumber}, new balance: ${foundUser.walletBalance}`);
    res.status(200).json({ success: true, message: 'Money added successfully', walletBalance: foundUser.walletBalance });

  } catch (err) {
    console.error("❌ Error in addMoney:", err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};

// ----------------------- WITHDRAW MONEY -----------------------
exports.withdrawMoney = async (req, res) => {
  console.log('💸 [Withdraw Money] Request body:', req.body);
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount || isNaN(amount) || amount < 50) {
      console.warn('⚠ Invalid request body for withdrawMoney:', req.body);
      return res.status(400).json({ success: false, message: 'phoneNumber and minimum 50 required' });
    }

    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) {
      console.warn('⚠ User not found for withdrawMoney:', phoneNumber);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (foundUser.walletBalance < amount) {
      console.warn(`⚠ Insufficient balance for ${phoneNumber}: balance ${foundUser.walletBalance}, requested ${amount}`);
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    foundUser.walletBalance -= amount;
    await foundUser.save();

    // ✅ FIXED: Create transaction with IST time
    await Transaction.create({
      user: foundUser._id,
      type: 'withdraw',
      amount,
      description: 'Money withdrawn from wallet',
      date: getISTTime() // ✅ Use IST time instead of UTC
    });

    console.log(`✅ Money withdrawn: ${amount} from ${phoneNumber}, new balance: ${foundUser.walletBalance}`);
    res.status(200).json({ success: true, message: 'Money withdrawn successfully', walletBalance: foundUser.walletBalance });

  } catch (err) {
    console.error("❌ Error in withdrawMoney:", err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};

// ----------------------- GET WALLET BY PHONE -----------------------
exports.getWalletByPhone = async (req, res) => {
  console.log('👛 [Get Wallet] Params:', req.params);
  try {
    const { phoneNumber } = req.params;
    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) {
      console.warn('⚠ User not found for getWalletByPhone:', phoneNumber);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`✅ Wallet fetched for ${phoneNumber}: ${foundUser.walletBalance}`);
    res.json({ success: true, walletBalance: foundUser.walletBalance || 0 });
  } catch (err) {
    console.error("❌ Error in getWalletByPhone:", err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};

// ----------------------- GET TRANSACTION HISTORY -----------------------
exports.getHistory = async (req, res) => {
  console.log('📜 [Transaction History] Params:', req.params);
  try {
    const { phoneNumber } = req.params;
    const foundUser = await User.findOne({ phoneNumber });
    if (!foundUser) {
      console.warn('⚠ User not found for getHistory:', phoneNumber);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const history = await Transaction.find({ user: foundUser._id }).sort({ createdAt: -1 });
    console.log(`✅ Transaction history fetched for ${phoneNumber}, count: ${history.length}`);
    res.json({ success: true, walletBalance: foundUser.walletBalance, transactions: history });
  } catch (err) {
    console.error("❌ Error fetching transaction history:", err);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
  }
};