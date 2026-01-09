const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Client = require('./models/Client');
const Vendor = require('./models/Vendor');

dotenv.config();

async function testProj() {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("Testing Vendor Aggregation Projection");
    const result = await Vendor.aggregate([
        { $unwind: "$cycles" },
        { $unwind: "$cycles.payments" },
        { 
            $project: {
                serviceType: 1,
                amount: "$cycles.payments.amount"
            }
        },
        { $limit: 1 }
    ]);
    
    console.log("Result sample:", JSON.stringify(result, null, 2));

    process.exit(0);
}

testProj().catch(console.error);
