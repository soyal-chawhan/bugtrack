const express = require('express');
const Comment = require('../models/Comment');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/:ticketId', protect, async (req, res) => {
  try {
    const comments = await Comment.find({ ticketId: req.params.ticketId })
      .populate('author', 'name email')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch {
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { ticketId, text } = req.body;
    if (!ticketId || !text) return res.status(400).json({ error: 'ticketId and text are required.' });

    const comment = await Comment.create({ ticketId, text, author: req.user._id });
    await comment.populate('author', 'name email');
    res.status(201).json(comment);
  } catch {
    res.status(500).json({ error: 'Failed to post comment.' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorised.' });
    }
    await comment.deleteOne();
    res.json({ message: 'Comment deleted.' });
  } catch {
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

module.exports = router;
