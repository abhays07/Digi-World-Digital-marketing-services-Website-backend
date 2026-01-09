const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Client = require('./models/Client');
const Vendor = require('./models/Vendor');

dotenv.config();

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const clients = await Client.find();
    console.log(`Found ${clients.length} clients`);
    clients.forEach(c => {
        console.log(`Client: ${c.name}, serviceType: ${c.serviceType}, Cycles: ${c.cycles.length}`);
        c.cycles.forEach(cy => {
            console.log(`  Cycle: ${cy.cycleName}, Payments: ${cy.payments.length}`);
            cy.payments.forEach(p => {
                console.log(`    Payment: ${p.amount}, Date: ${p.date} (${typeof p.date})`);
            });
        });
    });

    const vendors = await Vendor.find();
    console.log(`Found ${vendors.length} vendors`);
    vendors.forEach(v => {
        console.log(`Vendor: ${v.agencyName}, Cycles: ${v.cycles.length}`);
        v.cycles.forEach(cy => {
            console.log(`  Cycle: ${cy.cycleName}, Payments: ${cy.payments.length}`);
        });
    });

    process.exit(0);
}

debug().catch(console.error);
