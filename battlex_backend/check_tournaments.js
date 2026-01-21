// ✅ VERIFICATION SCRIPT: Check what fields your tournaments have
// Save this as: check_tournaments.js

const mongoose = require('mongoose');
require('dotenv').config();

async function checkTournaments() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentsCollection = db.collection('tournaments');
    
    // Get a sample of tournaments to check their structure
    const sampleTournaments = await tournamentsCollection.find({}).limit(3).toArray();
    
    console.log(`\n📊 Found ${sampleTournaments.length} sample tournaments:\n`);
    
    sampleTournaments.forEach((tournament, index) => {
      console.log(`🎮 Tournament ${index + 1}: ${tournament.title}`);
      console.log(`   _id: ${tournament._id}`);
      console.log(`   dateTime: ${tournament.dateTime || 'NOT SET'}`);
      console.log(`   timestamp: ${tournament.timestamp || 'NOT SET'}`);
      console.log(`   gameType: ${tournament.gameType || 'NOT SET'}`);
      console.log(`   date (display): ${tournament.date || 'NOT SET'}`);
      console.log(`   All fields: ${Object.keys(tournament).join(', ')}`);
      console.log('');
    });
    
    // Count tournaments by field availability
    const hasDateTime = await tournamentsCollection.countDocuments({ dateTime: { $exists: true } });
    const hasTimestamp = await tournamentsCollection.countDocuments({ timestamp: { $exists: true } });
    const hasNeither = await tournamentsCollection.countDocuments({ 
      dateTime: { $exists: false }, 
      timestamp: { $exists: false } 
    });
    const total = await tournamentsCollection.countDocuments({});
    
    console.log(`📈 Field Statistics:`);
    console.log(`   Total tournaments: ${total}`);
    console.log(`   Have dateTime field: ${hasDateTime}`);
    console.log(`   Have timestamp field: ${hasTimestamp}`);
    console.log(`   Have neither field: ${hasNeither}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

checkTournaments();
