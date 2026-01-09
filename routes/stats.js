
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Client = require('../models/Client');
const Vendor = require('../models/Vendor');

const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.adminId = decoded.id;
    next();
  });
};

// GET /api/stats/dashboard
// Aggregation Pipeline for Monthly Revenue vs Expenses
router.get('/dashboard', auth, async (req, res) => {
  try {
    // 1. Client Revenue by Month (Last 6 Months)
    const clientStats = await Client.aggregate([
      { $unwind: "$payments" },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$payments.date" } },
          revenue: { $sum: "$payments.amount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 2. Vendor Expenses by Month (Last 6 Months)
    const vendorStats = await Vendor.aggregate([
      { $unwind: "$paymentHistory" },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$paymentHistory.date" } },
          expense: { $sum: "$paymentHistory.amount" }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // 3. Service Distribution (Pie Chart)
    const serviceStats = await Client.aggregate([
      {
        $group: {
          _id: "$serviceType",
          value: { $sum: "$totalAgreedAmount" } // Or count: { $sum: 1 } for count-based
        }
      }
    ]);

    // Merge Revenue & Expense Data
    // We want a list of months: [ { name: 'Jan 2025', revenue: 5000, expense: 2000 }, ... ]
    
    // Helper to map YYYY-MM to legible Month Year
    const getMonthName = (ym) => {
      const [y, m] = ym.split('-');
      const date = new Date(y, m - 1);
      return date.toLocaleString('default', { month: 'short', year: 'numeric' });
    };

    const monthlyDataMap = {};

    clientStats.forEach(item => {
      monthlyDataMap[item._id] = { name: getMonthName(item._id), revenue: item.revenue, expense: 0 };
    });

    vendorStats.forEach(item => {
      if (!monthlyDataMap[item._id]) {
        monthlyDataMap[item._id] = { name: getMonthName(item._id), revenue: 0, expense: 0 };
      }
      monthlyDataMap[item._id].expense = item.expense;
    });

    // Convert map to array and sort by date key (key is YYYY-MM which sorts correctly)
    const monthlyData = Object.keys(monthlyDataMap)
      .sort()
      .slice(-6) // Last 6 months only
      .map(key => monthlyDataMap[key]);

    const serviceData = serviceStats.map(s => ({
      name: s._id,
      value: s.value
    }));

    res.json({
      monthlyData,
      serviceData
    });

  } catch (err) {
    console.error('Dashboard Stats Error:', err);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

module.exports = router;
