require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  emailConfig: {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'tienda.br165@gmail.com',
      pass: process.env.EMAIL_PASS || 'mior vlmj ehae wlxy'
    }
  }
};
