const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');
const path = require('path');

// Load env vars from the root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const adminEmail = 'admin@digiworldpromotions.in';
    const adminExists = await Admin.findOne({ email: adminEmail });
    
    if (adminExists) {
      console.log(`Admin user ${adminEmail} already exists. Updating password...`);
      adminExists.password = 'Abhays2004@ibl';
      await adminExists.save();
      console.log('Admin password reset to: Abhays2004@ibl');
      process.exit();
    }

    // Create new admin
    const admin = new Admin({
      email: adminEmail,
      password: 'Abhays2004@ibl' // This will be hashed by the pre-save hook in Admin.js
    });

    await admin.save();
    console.log('-----------------------------------');
    console.log('Admin Account Created Successfully!');
    console.log('Email:    ' + adminEmail);
    console.log('Password: Abhays2004@ibl');
    console.log('-----------------------------------');
    
    process.exit();
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
