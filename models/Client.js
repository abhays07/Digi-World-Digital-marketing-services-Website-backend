
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  screenshotUrl: { type: String }
});

const CycleSchema = new mongoose.Schema({
  cycleName: { type: String, required: true }, // e.g. "15/01/2026 - 14/02/2026"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Completed', 'Pending', 'Overdue'], default: 'Active' },
  totalAgreed: { type: Number, required: true }, // Amount for THIS specific cycle
  payments: [PaymentSchema], // Payments linked to THIS cycle
  balanceDue: { type: Number, default: 0 }
});

const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  serviceType: { 
    type: String, 
    enum: ['Video Editing', 'Ads Services', 'Management Service'], 
    required: true 
  },
  workStartDate: { type: Date, required: true },
  serviceDay: { type: Number, required: true }, // e.g. 15
  totalAgreedAmount: { type: Number, required: true }, // Base Monthly Deal
  
  cycles: [CycleSchema],
  
  // Aggregated Globals
  totalPaid: { type: Number, default: 0 },
  balanceRemaining: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

// Pre-save to extract serviceDay if missing and calculate globals
ClientSchema.pre('save', function(next) {
  if (this.workStartDate && !this.serviceDay) {
    this.serviceDay = this.workStartDate.getDate();
  }
  
  // Aggregate global stats from all cycles
  if (this.cycles && this.cycles.length > 0) {
    // Total Paid = Sum of all payments in all cycles
    this.totalPaid = this.cycles.reduce((allSum, cycle) => {
      const cyclePaid = cycle.payments ? cycle.payments.reduce((pSum, p) => pSum + p.amount, 0) : 0;
      return allSum + cyclePaid;
    }, 0);

    // Balance Remaining = Sum of balanceDue of all active/overdue cycles
    // We calculate balanceDue for each cycle first just in case
    this.cycles.forEach(c => {
        const paid = c.payments ? c.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
        c.balanceDue = c.totalAgreed - paid;
    });

    this.balanceRemaining = this.cycles.reduce((sum, cycle) => sum + (cycle.balanceDue || 0), 0);
  }

  next();
});

module.exports = mongoose.model('Client', ClientSchema);
