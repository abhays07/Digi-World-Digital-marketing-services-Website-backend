const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Client = require('./models/Client');
const Vendor = require('./models/Vendor');
const { startOfMonth, subMonths } = require('date-fns');

dotenv.config();

async function debugAnalytics() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected");

    const now = new Date();
    const startDate = subMonths(now, 12);
    console.log("Current Time:", now);
    console.log("Start Date Filter:", startDate);

    // Test Client Data
    const cCount = await Client.countDocuments();
    console.log("Total Clients:", cCount);

    const clientPayments = await Client.aggregate([
      { $unwind: "$cycles" },
      { $unwind: "$cycles.payments" },
      { $project: { name: 1, amount: "$cycles.payments.amount", date: "$cycles.payments.date" } }
    ]);
    console.log(`Found ${clientPayments.length} raw client payments (no filter)`);
    clientPayments.forEach(p => {
        console.log(`  - ${p.name}: ₹${p.amount} on ${p.date} (Match: ${p.date >= startDate})`);
    });

    // Test Vendor Data
    const vCount = await Vendor.countDocuments();
    console.log("Total Vendors:", vCount);

    const vendorPayments = await Vendor.aggregate([
        { $unwind: "$cycles" },
        { $unwind: "$cycles.payments" },
        { $project: { name: "$agencyName", amount: "$cycles.payments.amount", date: "$cycles.payments.date" } }
    ]);
    console.log(`Found ${vendorPayments.length} raw vendor payments (no filter)`);
    vendorPayments.forEach(p => {
        console.log(`  - ${p.name}: ₹${p.amount} on ${p.date} (Match: ${p.date >= startDate})`);
    });

    process.exit(0);
}

debugAnalytics().catch(console.error);
