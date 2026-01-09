
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Normalize inputs: clean trailing spaces (common on mobile)
    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const normalizedPassword = password ? password.trim() : '';

    const admin = await Admin.findOne({ email: normalizedEmail });
    
    if (!admin || !(await admin.comparePassword(normalizedPassword))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
