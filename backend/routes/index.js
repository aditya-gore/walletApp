const express = require('express');
const router = express.Router();
const userRouter = require('./user');
const accountsRouter = require('./account');

router.use('/user', userRouter);
router.use('/account', accountsRouter);

module.exports = router;
