
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Vendor = require('../models/Vendor');
const { startOfMonth, subMonths, subYears, startOfDay, format } = require('date-fns');

const auth = require('../middleware/authMiddleware');

router.get('/stats', auth, async (req, res) => {
  try {
    const { range } = req.query; 
    let startDate;
    const now = new Date();

    if (range === 'this-month') {
      startDate = startOfMonth(now);
    } else if (range === 'last-1-year') {
      startDate = subYears(now, 1);
    } else {
      startDate = subMonths(now, 12); 
    }

    console.log(`[Analytics] Range: ${range}, StartDate: ${startDate.toISOString()}`);

    // 1. CLIENT REVENUE
    const clientCyclePayments = await Client.aggregate([
      { $unwind: "$cycles" },
      { $unwind: "$cycles.payments" },
      { 
        $project: {
          serviceType: 1,
          amount: "$cycles.payments.amount",
          date: "$cycles.payments.date"
        }
      },
      { $match: { date: { $gte: startDate } } }
    ]);

    const clientLegacyPayments = await Client.aggregate([
      { $unwind: "$payments" },
      { 
        $project: {
          serviceType: 1,
          amount: "$payments.amount",
          date: "$payments.date"
        }
      },
      { $match: { date: { $gte: startDate } } }
    ]);

    // 2. VENDOR EXPENSES
    const vendorCyclePayments = await Vendor.aggregate([
        { $unwind: "$cycles" },
        { $unwind: "$cycles.payments" },
        { 
            $project: {
                serviceType: 1,
                services: 1,
                amount: "$cycles.payments.amount",
                date: "$cycles.payments.date"
            }
        },
        { $match: { date: { $gte: startDate } } }
    ]);

    const vendorHistoryPayments = await Vendor.aggregate([
        { $unwind: "$paymentHistory" },
        { 
            $project: {
                serviceType: 1,
                services: 1,
                amount: "$paymentHistory.amount",
                date: "$paymentHistory.date"
            }
        },
        { $match: { date: { $gte: startDate } } }
    ]);

    console.log(`[Analytics] Found raw data sizes: C-Cycle: ${clientCyclePayments.length}, C-Legacy: ${clientLegacyPayments.length}, V-Cycle: ${vendorCyclePayments.length}, V-Legacy: ${vendorHistoryPayments.length}`);

    // 3. PROCESS EVERYTHING
    const timeline = {};
    const serviceRevenue = {};
    const vendorExpenses = {};
    let totalRevenue = 0;
    let totalExpense = 0;

    // Process Clients
    [...clientCyclePayments, ...clientLegacyPayments].forEach(p => {
        const amount = Number(p.amount) || 0;
        totalRevenue += amount;
        
        const type = p.serviceType || 'Others';
        serviceRevenue[type] = (serviceRevenue[type] || 0) + amount;

        const d = new Date(p.date);
        const dateKey = d.toISOString().substring(0, range === 'this-month' ? 10 : 7);
        if (!timeline[dateKey]) timeline[dateKey] = { revenue: 0, expense: 0 };
        timeline[dateKey].revenue += amount;
    });

    // Process Vendors
    [...vendorCyclePayments, ...vendorHistoryPayments].forEach(p => {
        const amount = Number(p.amount) || 0;
        totalExpense += amount;

        // EXPENSE DISTRIBUTION LOGIC
        // If vendor has detailed services, split the expense proportionally
        if (p.services && p.services.length > 0) {
             const totalRate = p.services.reduce((sum, s) => sum + (s.rate || 0), 0);
             if (totalRate > 0) {
                 p.services.forEach(s => {
                     const ratio = (s.rate || 0) / totalRate;
                     const share = amount * ratio;
                     vendorExpenses[s.name] = (vendorExpenses[s.name] || 0) + share;
                 });
             } else {
                 // Fallback if rates are 0 but services exist
                 const fallbackShare = amount / p.services.length;
                 p.services.forEach(s => {
                     vendorExpenses[s.name] = (vendorExpenses[s.name] || 0) + fallbackShare;
                 });
             }
        } else {
             // Legacy / Single Service Fallback
             const type = p.serviceType || 'Others';
             vendorExpenses[type] = (vendorExpenses[type] || 0) + amount;
        }

        const d = new Date(p.date);
        const dateKey = d.toISOString().substring(0, range === 'this-month' ? 10 : 7);
        if (!timeline[dateKey]) timeline[dateKey] = { revenue: 0, expense: 0 };
        timeline[dateKey].expense += amount;
    });

    console.log(`[Analytics] Processed - Revenue: ${totalRevenue}, Expense: ${totalExpense}`);

    // 4. FORMAT FOR FRONTEND
    const chartData = Object.keys(timeline)
        .sort()
        .map(key => {
            const item = timeline[key];
            let label = key;
            if (range !== 'this-month') {
                const [y, m] = key.split('-');
                const d = new Date(parseInt(y), parseInt(m) - 1);
                label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
            } else {
                label = key.split('-')[2];
            }
            return {
                name: label,
                revenue: item.revenue,
                expense: item.expense
            };
        });

    const serviceData = Object.keys(serviceRevenue).map(key => ({
        name: key,
        value: serviceRevenue[key]
    }));

    const expenseDistribution = Object.keys(vendorExpenses).map(key => ({
        name: key,
        value: vendorExpenses[key]
    }));

    res.json({
      chartData,
      serviceData,
      expenseDistribution,
      scorecards: {
        revenue: totalRevenue,
        expense: totalExpense,
        netProfit: totalRevenue - totalExpense
      }
    });

  } catch (err) {
    console.error('[Analytics Error]', err);
    res.status(500).json({ message: 'Error loading performance stats' });
  }
});

module.exports = router;
