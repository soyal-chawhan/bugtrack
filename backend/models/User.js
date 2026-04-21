const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type:     String,
    required: true,
    trim:     true,
  },
  email: {
    type:      String,
    required:  true,
    unique:    true,
    lowercase: true,
    trim:      true,
  },
  password: {
    type:    String,
    default: null,
  },
  googleId: {
    type:    String,
    default: null,
  },
  isVerified: {
    type:    Boolean,
    default: false,
  },
  role: {
    type:    String,
    enum:    ['admin', 'developer', 'viewer'],
    default: 'developer',
  },
  otp: {
    code:      { type: String, default: null },
    expiresAt: { type: Date,   default: null },
  },
  resetToken:   { type: String, default: null },
  resetExpires: { type: Date,   default: null },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.resetToken;
  delete obj.resetExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
