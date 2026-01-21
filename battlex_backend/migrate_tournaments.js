// ✅ FIXED MIGRATION SCRIPT: Copy timestamp to dateTime
// Save this as: migrate_tournaments_fixed.js

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateTournaments() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('✅ Connected to MongoDB');
    
    // Use direct MongoDB operations to bypass model validation
    const db = mongoose.connection.db;
    const tournamentsCollection = db.collection('tournaments');
    
    // Find tournaments that have timestamp but no dateTime
    const tournamentsToUpdate = await tournamentsCollection.find({
      timestamp: { $exists: true },
      dateTime: { $exists: false }
    }).toArray();
    
    console.log(`📊 Found ${tournamentsToUpdate.length} tournaments to migrate`);
    
    if (tournamentsToUpdate.length === 0) {
      console.log('✅ No tournaments need migration');
      process.exit(0);
    }
    
    let updated = 0;
    
    for (const tournament of tournamentsToUpdate) {
      try {
        // Use updateOne to bypass model validation
        const result = await tournamentsCollection.updateOne(
          { _id: tournament._id },
          { 
            $set: { 
              dateTime: tournament.timestamp 
            } 
          }
        );
        
        if (result.modifiedCount > 0) {
          updated++;
          console.log(`✅ Updated tournament: ${tournament.title} (${tournament._id})`);
          console.log(`   timestamp: ${tournament.timestamp} -> dateTime: ${tournament.timestamp}`);
        } else {
          console.log(`⚠️ No changes for tournament: ${tournament.title}`);
        }
      } catch (err) {
        console.error(`❌ Failed to update tournament ${tournament._id}:`, err.message);
      }
    }
    
    console.log(`🎉 Migration completed! Updated ${updated} tournaments`);
    
    // Verify the migration worked
    const verificationCount = await tournamentsCollection.countDocuments({
      dateTime: { $exists: true },
      timestamp: { $exists: true }
    });
    
    console.log(`✅ Verification: ${verificationCount} tournaments now have both dateTime and timestamp fields`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateTournaments();
