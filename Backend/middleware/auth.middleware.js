const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT VERIFY ERROR:', err.message);
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = decoded; // { id, role }
    next();
  });
};
