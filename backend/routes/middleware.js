const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
module.exports.authMiddleware = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    throw Error('unauthorized');
  }
  const token = authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.userId) {
      req.userId = decoded.userId;
      next();
    } else {
      throw Error('unauthorized');
    }
  } catch (error) {
    return res.status(403).json({
      message: error.message,
    });
  }
};
