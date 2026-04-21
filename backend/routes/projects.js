const express = require('express');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('members', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch {
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required.' });

    const project = await Project.create({
      name, description,
      createdBy: req.user._id,
      members:   [req.user._id],
    });
    res.status(201).json(project);
  } catch {
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

router.patch('/:id', protect, async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id, { name, description }, { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json(project);
  } catch {
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json({ message: 'Project deleted.' });
  } catch {
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

module.exports = router;
