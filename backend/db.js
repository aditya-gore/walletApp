const mongoose = require('mongoose');
const argon2 = require('argon2');

mongoose.connect(process.env.DB_STRING);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minLength: 3,
    maxLength: 30,
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50,
  },
});

// Method to generate Hash from plain text  using argon2
userSchema.methods.createHash = async function (plainTextPassword) {
  // return password hash
  return await argon2.hash(plainTextPassword);
};

// Method to validate the entered password using argon2
userSchema.methods.validatePassword = async function (candidatePassword) {
  return await argon2.verify(this.password, candidatePassword);
};
const User = mongoose.model('User', userSchema);

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to User model
    ref: 'User',
    required: true,
  },
  balance: {
    type: Number,
    required: true,
  },
});

const Account = mongoose.model('Account', accountSchema);

module.exports = {
  User,
  Account,
};
