require('dotenv').config({ path: '../.env' });
require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mpss',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.DB_PORT || '3306', 10),
  dialect: 'mysql',
  dialectOptions: {
    charset: 'utf8mb4',
  },
  define: {
    underscored: true,
  },
};

module.exports = {
  development: base,
  test: base,
  production: {
    ...base,
    logging: false,
  },
};
