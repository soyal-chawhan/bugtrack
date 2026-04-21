const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type:     String,
    required: true,
    trim:     true,
  },
  description: {
    type:    String,
    default: '',
    trim:    true,
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
  },
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
