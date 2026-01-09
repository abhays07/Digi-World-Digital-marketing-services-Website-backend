
const mongoose = require('mongoose');

const VendorCycleSchema = new mongoose.Schema({
  cycleName: { type: String, required: true }, // e.g. "05 Jan - 04 Feb"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  billAmount: { type: Number, required: true }, // Monthly Bill
  payments: [{
      amount: Number,
      date: { type: Date, default: Date.now },
      note: String,
      transactionId: String,
      screenshotUrl: String
  }],
  status: { type: String, enum: ['Unpaid', 'Partial', 'Settled', 'Overdue'], default: 'Unpaid' },
  balancePending: { type: Number, default: 0 }
});

const VendorSchema = new mongoose.Schema({
  agencyName: { type: String, required: true },
  services: [{
    name: { 
      type: String, 
      enum: ['Ads Management', 'Video Editing', 'Service Charge', 'Cameraman', 'Graphics Designer', 'Broker', 'Others', 'Marketing'],
      required: true 
    },
    rate: { type: Number, required: true }
  }], // New Multi-Service Support

  // Legacy/Primary fields (kept for backward compat or primary display)
  serviceType: { 
    type: String, 
    enum: ['Ads Management', 'Video Editing', 'Service Charge', 'Cameraman', 'Graphics Designer', 'Broker', 'Others', 'Marketing'],
    required: true 
  },
  
  workStartDate: { type: Date },
  billingCycleDay: { type: Number }, // Auto-extracted
  monthlyRate: { type: Number, default: 0 }, // For recurring calculation
  
  cycles: [VendorCycleSchema],

  paymentHistory: [{
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: { type: String }
  }],
  totalPaid: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false }
});

// Pre-save to extract billingCycleDay and update globals
VendorSchema.pre('save', function(next) {
    if (this.workStartDate && !this.billingCycleDay) {
      this.billingCycleDay = this.workStartDate.getDate();
    }

    // Auto-calculate monthlyRate from services if services array exists
    if (this.services && this.services.length > 0) {
       this.monthlyRate = this.services.reduce((sum, s) => sum + (s.rate || 0), 0);
       // Optional: Update top-level serviceType to Primary (first) one if implied
       // this.serviceType = this.services[0].name; 
    }
    
    // Aggregate Total Payment from ALL Cycles + Legacy History
    let usageTotal = 0;
    if (this.cycles) {
        this.cycles.forEach(c => {
             // Update cycle balance
            const paidInCycle = c.payments.reduce((s, p) => s + p.amount, 0);
            c.balancePending = c.billAmount - paidInCycle;
            if(c.balancePending <= 0 && c.status !== 'Settled') c.status = 'Settled';
            if(c.balancePending > 0 && paidInCycle > 0) c.status = 'Partial';
            
            usageTotal += paidInCycle;
        });
    }
    const legacyTotal = this.paymentHistory ? this.paymentHistory.reduce((s, p) => s + p.amount, 0) : 0;
    this.totalPaid = usageTotal + legacyTotal;

    next();
});

module.exports = mongoose.model('Vendor', VendorSchema);
