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

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to the database.');
});

module.exports = async (req, res) => {
  // Extract the real client IP address from the 'x-forwarded-for' header
  const ipAddress = (req.headers['x-forwarded-for'] || req.connection.remoteAddress)
  .split(',')[0].trim(); // Get the first IP in the list and trim any spaces
  try {
    const [rows] = await db.promise().query(
      'SELECT credits, timing FROM ip_addresses WHERE ip_address = ?',
      [ipAddress]
    );

    if (rows.length === 0) {
      // New user, initialize with 15 credits
      await db.promise().query(
        'INSERT INTO ip_addresses (ip_address, credits, timing) VALUES (?, 15, ?)',
        [ipAddress, moment().toISOString()]
      );
      return res.status(200).json({ credits: 15 });
    }

    const { credits, timing } = rows[0];

    if (credits < 7) {
      const lastDeductionTime = moment(timing);
      const diff = moment().diff(lastDeductionTime, 'hours');

      if (diff >= 12) {
        // 12 hours passed, reset credits to 8 because 15 - 7 = 8
        await db.promise().query(
          'UPDATE ip_addresses SET credits = 8, timing = ? WHERE ip_address = ?',
          [moment().toISOString(), ipAddress]
        );
        return res.status(200).json({ credits: 8 });
      } else {
        return res.status(400).json({ message: 'Not enough time has passed to recover credits.' });
      }
    } else {
      // Deduct 7 credits for Image
      await db.promise().query(
        'UPDATE ip_addresses SET credits = credits - 7, timing = ? WHERE ip_address = ?',
        [moment().toISOString(), ipAddress]
      );
      return res.status(200).json({ credits: credits - 7 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};
