const mysql = require('mysql2');

// ✅ Create a pool
const db = mysql.createPool({
  host: process.env.DB_HOST || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
   port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
db.query('SELECT 1', (err, results) => {
  if (err) {
    console.error('❌ MySQL connection error:', err.message);
  } else {
    console.log('✅ Connected to MySQL (pool works)');
  }
});

// ✅ Promise-based query helper
db.queryPromise = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.execute(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

module.exports = db;
