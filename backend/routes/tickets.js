const express = require('express');
const Ticket  = require('../models/Ticket');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.projectId) filter.projectId = req.query.projectId;
    if (req.query.status)    filter.status    = req.query.status;
    if (req.query.priority)  filter.priority  = req.query.priority;

    const tickets = await Ticket.find(filter)
      .populate('projectId', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('projectId', 'name')
      .populate('createdBy', 'name email');
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    res.json(ticket);
  } catch {
    res.status(500).json({ error: 'Failed to fetch ticket.' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { title, description, priority, status, projectId, assignee } = req.body;
    if (!title || !projectId) return res.status(400).json({ error: 'Title and project are required.' });

    const ticket = await Ticket.create({
      title, description, priority, status, projectId, assignee,
      createdBy: req.user._id,
    });
    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: 'Failed to create ticket.' });
  }
});

router.patch('/:id', protect, async (req, res) => {
  try {
    const allowed = ['title', 'description', 'priority', 'status', 'assignee', 'projectId'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    res.json(ticket);
  } catch {
    res.status(500).json({ error: 'Failed to update ticket.' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
    res.json({ message: 'Ticket deleted.' });
  } catch {
    res.status(500).json({ error: 'Failed to delete ticket.' });
  }
});

module.exports = router;
