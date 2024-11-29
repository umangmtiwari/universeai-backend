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
      'SELECT credits FROM ip_addresses WHERE ip_address = ?',
      [ipAddress]
    );

    if (rows.length === 0) {
      // If user doesn't exist, initialize with 15 credits
      await db.promise().query(
        'INSERT INTO ip_addresses (ip_address, credits, timing) VALUES (?, 15, ?)',
        [ipAddress, moment().toISOString()]
      );
      return res.status(200).json({ credits: 15 });
    }

    res.status(200).json({ credits: rows[0].credits });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};
