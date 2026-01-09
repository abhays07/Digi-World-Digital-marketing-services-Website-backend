const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Client = require('./models/Client');
const Vendor = require('./models/Vendor');

dotenv.config();

async function checkVendors() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB Connected");

    const vendorCount = await Vendor.countDocuments();
    console.log("Total Vendors in DB:", vendorCount);

    const allVendors = await Vendor.find();
    allVendors.forEach(v => {
        console.log(`Vendor: ${v.agencyName}, Type: ${v.serviceType}, Cycles: ${v.cycles.length}`);
        v.cycles.forEach(c => {
            console.log(`  Cycle: ${c.cycleName}, Payments: ${c.payments.length}`);
            c.payments.forEach(p => console.log(`    Payment: ${p.amount}`));
        });
        if (v.paymentHistory) {
            console.log(`  Legacy Payments: ${v.paymentHistory.length}`);
        }
    });

    process.exit(0);
}

checkVendors().catch(console.error);
