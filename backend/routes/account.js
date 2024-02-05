const express = require('express');
const router = express.Router();
const { Account } = require('../db');
const { authMiddleware } = require('./middleware');
const { default: mongoose } = require('mongoose');

/**
 * @swagger
 * tags:
 *  name: Accounts
 *  description: All the accounts related routes
 */

/**
 * @swagger
 * /api/v1/account/balance:
 *   get:
 *     summary: Returns the current account balance for the user
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: Returns a success message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Balance'
 *       411:
 *         description: Returns an error message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get('/balance', authMiddleware, async (req, res) => {
  const account = await Account.findOne({
    userId: req.userId,
  });

  res.json({
    balance: account?.balance,
  });
});

/**
 * @swagger
 * /api/v1/account/transfer:
 *   post:
 *     summary: Transfers the amount to the desired user
 *     tags: [Accounts]
 *     requestBody:
 *       description: Details of the fund transfer
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/Transfer"
 *     responses:
 *       200:
 *         description: Returns a success message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                message:
 *                  type: string
 *       411:
 *         description: Returns an error message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.post('/transfer', authMiddleware, async (req, res) => {
  try {
    const session = await mongoose.startSession();

    session.startTransaction();
    const { amount, to } = req.body;

    // Fetch the accounts within the transaction
    const account = await Account.findOne({ userId: req.userId }).session(
      session,
    );

    if (!account || account.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Insufficient balance',
      });
    }

    const toAccount = await Account.findOne({ userId: to }).session(session);

    if (!toAccount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Invalid account',
      });
    }

    // Perform the transfer
    await Account.updateOne(
      { userId: req.userId },
      { $inc: { balance: -amount } },
    ).session(session);

    await Account.updateOne(
      { userId: to },
      { $inc: { balance: amount } },
    ).session(session);

    // Commit the transaction
    await session.commitTransaction();

    res.json({
      message: 'Transfer successful',
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

module.exports = router;
