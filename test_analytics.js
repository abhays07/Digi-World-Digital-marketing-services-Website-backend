const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Client = require('./models/Client');
const Vendor = require('./models/Vendor');
const { startOfMonth, subMonths } = require('date-fns');

dotenv.config();

async function testAnalytics() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const now = new Date();
    const startDate = subMonths(now, 12);
    console.log("Start Date (12 months ago):", startDate);

    // 1. Test Client Aggregation
    const clientPayments = await Client.aggregate([
      { $unwind: { path: "$cycles", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$cycles.payments", preserveNullAndEmptyArrays: true } },
      { 
        $project: {
          serviceType: 1,
          amount: "$cycles.payments.amount",
          date: "$cycles.payments.date"
        }
      },
      { $match: { date: { $exists: true, $ne: null, $gte: startDate } } }
    ]);

    console.log(`Found ${clientPayments.length} client payments`);
    clientPayments.forEach(p => console.log(`  - ${p.serviceType}: ${p.amount} on ${p.date}`));

    // 2. Test Vendor Aggregations
    const vendorCyclePayments = await Vendor.aggregate([
        { $unwind: { path: "$cycles", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$cycles.payments", preserveNullAndEmptyArrays: true } },
        { 
            $project: {
                amount: "$cycles.payments.amount",
                date: "$cycles.payments.date"
            }
        },
        { $match: { date: { $exists: true, $ne: null, $gte: startDate } } }
    ]);
    console.log(`Found ${vendorCyclePayments.length} vendor cycle payments`);

    const vendorHistoryPayments = await Vendor.aggregate([
        { $unwind: { path: "$paymentHistory", preserveNullAndEmptyArrays: true } },
        { 
            $project: {
                amount: "$paymentHistory.amount",
                date: "$paymentHistory.date"
            }
        },
        { $match: { date: { $exists: true, $ne: null, $gte: startDate } } }
    ]);
    console.log(`Found ${vendorHistoryPayments.length} vendor legacy payments`);

    process.exit(0);
}

testAnalytics().catch(console.error);
