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
