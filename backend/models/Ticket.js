const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: {
    type:     String,
    required: true,
    trim:     true,
  },
  description: {
    type:    String,
    default: '',
    trim:    true,
  },
  priority: {
    type:    String,
    enum:    ['low', 'medium', 'high'],
    default: 'medium',
  },
  status: {
    type:    String,
    enum:    ['todo', 'inprogress', 'done'],
    default: 'todo',
  },
  projectId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Project',
    required: true,
  },
  assignee: {
    type:    String,
    default: '',
    trim:    true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
  },
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
