const express = require('express');
const router = express.Router();
const zod = require('zod');
const { User, Account } = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { ObjectId } = require('mongoose').Types;
const { authMiddleware } = require('./middleware');

const signupBody = zod.object({
  username: zod.string().email(),
  firstName: zod.string(),
  lastName: zod.string(),
  password: zod.string(),
});

const signinBody = zod.object({
  username: zod.string().email(),
  password: zod.string(),
});
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Signup:
 *       type: object
 *       required:
 *         - username
 *         - firstName
 *         - lastName
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Email of the user
 *         firstName:
 *           type: string
 *           description: The first name of the user
 *         lastName:
 *           type: string
 *           description: The last name of the user
 *         password:
 *           type: string
 *           description: The password of the user (stored after hashing)
 *     Signin:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Email of the user
 *         password:
 *           type: string
 *           description: The password of the user (stored after hashing)
 *     Transfer:
 *       type: object
 *       required:
 *         - to
 *         - amount
 *       properties:
 *         to:
 *           type: string
 *           description: Id of the receiver
 *         amount:
 *           type: string
 *           description: The amount that needs to be transferred
 *     Balance:
 *       type: object
 *       required:
 *         - balance
 *       properties:
 *         balance:
 *           type: number
 *           description: Current balance in the users account
 *
 * paths:
 *   /api/v1/user/:
 *     put:
 *       security:
 *         - bearerAuth: []
 *   /api/v1/user/bulk:
 *     get:
 *       security:
 *         - bearerAuth: []
 *   /api/v1/account/balance:
 *     get:
 *       security:
 *         - bearerAuth: []
 *   /api/v1/account/transfer:
 *     post:
 *       security:
 *         - bearerAuth: []
 */
/**
 * @swagger
 * tags:
 *  name: Users
 *  description: All the User related routes
 */
/**
 * @swagger
 * /api/v1/user/signup:
 *   post:
 *     summary: Allows a user to signup return token
 *     tags: [Users]
 *     requestBody:
 *       description: Details of the user
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/Signup"
 *     responses:
 *       200:
 *         description: Returns a jwt token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: JWT
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
router.post('/signup', async (req, res) => {
  try {
    const { success } = signupBody.safeParse(req.body);
    if (!success) {
      throw Error('Incorrect inputs');
    }
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      throw Error('Email already exists');
    }

    const newUser = new User({
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
    });

    newUser.password = await newUser.createHash(req.body.password);

    const user = await newUser.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);

    res.json({
      message: 'User created successfully',
      token: token,
    });
  } catch (error) {
    res.status(411).json({
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/user/signin:
 *   post:
 *     summary: Allows a user to signup return token
 *     tags: [Users]
 *     requestBody:
 *       description: Credentials of the user
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/Signin"
 *     responses:
 *       200:
 *         description: Returns a jwt token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT
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
router.post('/signin', async (req, res) => {
  try {
    const { success } = signinBody.safeParse(req.body);
    if (!success) {
      throw Error('Error while logging in');
    }
    const user = await User.findOne({
      username: req.body.username,
    });
    if (!user) {
      throw Error('user not found');
    } else {
      if (await user.validatePassword(req.body.password)) {
        const token = jwt.sign({ userId: user._id }, JWT_SECRET);

        /// ----- Create new account ------
        await Account.create({
          userId: user._id,
          balance: 1 + Math.random() * 10000,
        });
        /// -----  ------

        return res.json({
          token: token,
        });
      } else {
        throw Error('Incorrect password');
      }
    }
  } catch (error) {
    return res.status(411).json({
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/user/:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     requestBody:
 *       description: Credentials of the user
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/Signup"
 *     responses:
 *       200:
 *         description: Returns a success message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: status
 */
router.put('/', authMiddleware, async (req, res) => {
  let data = req.body;
  try {
    const result = await User.updateOne(
      { _id: new ObjectId(req.userId) },
      { $set: data },
    );
    return res.json({
      message: 'updated',
      data: result,
    });
  } catch (error) {
    return res.status(411).json({
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/v1/user/bulk:
 *   get:
 *     summary: get users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           required: true
 *           description: string to match user's first name or last name
 *     responses:
 *       200:
 *         description: Returns a success message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Signup'
 *       404:
 *         description: The User was not found
 *
 */
router.get('/bulk', authMiddleware, async (req, res) => {
  const filter = req.query.filter || '';
  const users = await User.find(
    {
      $or: [
        {
          firstName: { $regex: filter },
        },
        {
          lastName: { $regex: filter },
        },
      ],
    },
    { password: 0, __v: 0 },
  );
  res.json({ user: users });
});

module.exports = router;
