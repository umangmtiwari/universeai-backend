const cors = require('cors');
const express = require('express');
const app = express();
const mysql = require('mysql2');
const moment = require('moment');

// Enable CORS for all origins
app.use(cors());
// Or restrict CORS to specific origin:
// app.use(cors({ origin: 'http://localhost:3000' }));

require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Adjust as per your needs
  queueLimit: 0
});

const promisePool = pool.promise(); // Create a promise-based pool

module.exports = async (req, res) => {
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    const [rows] = await promisePool.query(
      'SELECT credits, timing FROM ip_addresses WHERE ip_address = ?',
      [ipAddress]
    );

    if (rows.length === 0) {
      // If user doesn't exist, initialize with 15 credits
      await promisePool.query(
        'INSERT INTO ip_addresses (ip_address, credits, timing) VALUES (?, 15, ?)',
        [ipAddress, moment().toISOString()]
      );
      return res.status(200).json({ credits: 15 });
    }

    const { credits, timing } = rows[0];
    const lastUpdateTime = moment(timing);
    const hoursPassed = moment().diff(lastUpdateTime, 'hours');

    if (hoursPassed >= 12) {
      // If 12 hours have passed, reset credits to 15
      await promisePool.query(
        'UPDATE ip_addresses SET credits = 15, timing = ? WHERE ip_address = ?',
        [moment().toISOString(), ipAddress]
      );
      return res.status(200).json({ credits: 15 });
    }

    // If less than 12 hours have passed, return current credits
    return res.status(200).json({ credits });

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};
