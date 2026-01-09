const axios = require('axios');

const testLogin = async () => {
  try {
    console.log('Testing Login with Admin Credentials...');
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@digiworld.com',
      password: 'password123'
    });

    console.log('-----------------------------------');
    console.log('✅ Login Successful!');
    console.log('Token Received:', !!response.data.token);
    console.log('Email:', response.data.email);
    console.log('-----------------------------------');
  } catch (error) {
    console.error('❌ Login Failed:', error.response ? error.response.data : error.message);
  }
};

testLogin();
