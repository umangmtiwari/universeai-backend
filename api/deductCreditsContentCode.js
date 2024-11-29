const mysql = require('mysql2');
const moment = require('moment');

// Instead of `mysql.createConnection()`
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10, // Adjust this as needed
  });
  

db.connect(err => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to the database.');
});

module.exports = async (req, res) => {
  const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress; // Get user's IP address
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

    if (credits < 4) {
      const lastDeductionTime = moment(timing);
      const diff = moment().diff(lastDeductionTime, 'hours');

      if (diff >= 12) {
        // 12 hours passed, reset credits to 15
        await db.promise().query(
          'UPDATE ip_addresses SET credits = 15, timing = ? WHERE ip_address = ?',
          [moment().toISOString(), ipAddress]
        );
        return res.status(200).json({ credits: 15 });
      } else {
        return res.status(400).json({ message: 'Not enough time has passed to recover credits.' });
      }
    } else {
      // Deduct 4 credits for Content Code
      await db.promise().query(
        'UPDATE ip_addresses SET credits = credits - 4, timing = ? WHERE ip_address = ?',
        [moment().toISOString(), ipAddress]
      );
      return res.status(200).json({ credits: credits - 4 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};
