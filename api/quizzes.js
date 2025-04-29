const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { title, questions } = req.body;
  console.log('POST /api/quizzes received:', { title, questions });

  if (typeof title !== 'string' || title.trim() === '') {
    console.log('Invalid title:', title);
    return res.status(400).json({ error: 'Invalid input: title must be a non-empty string' });
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    console.log('Invalid questions:', questions);
    return res.status(400).json({ error: 'Invalid input: questions must be a non-empty array' });
  }
  for (const q of questions) {
    if (typeof q.question !== 'string' || q.question.trim() === '') {
      console.log('Invalid question:', q.question);
      return res.status(400).json({ error: 'Invalid input: each question must be a non-empty string' });
    }
    if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(opt => typeof opt !== 'string' || opt.trim() === '')) {
      console.log('Invalid options:', q.options);
      return res.status(400).json({ error: 'Invalid input: each question must have four non-empty string options' });
    }
    if (typeof q.correctAnswer !== 'string' || !/^[1-4]$/.test(q.correctAnswer)) {
      console.log('Invalid correctAnswer:', q.correctAnswer);
      return res.status(400).json({ error: 'Invalid input: correctAnswer must be a string between 1 and 4' });
    }
  }

  try {
    const quizzesContainer = req.app.get('quizzesContainer');
    const quiz = { title, questions };
    console.log('Creating quiz in Cosmos DB:', quiz);
    const { resource } = await quizzesContainer.items.create(quiz);
    console.log('Quiz created successfully:', resource);
    res.status(201).json(resource);
  } catch (error) {
    console.error('Cosmos DB error:', error.message, error.stack);
    res.status(500).json({ error: `Failed to create quiz: ${error.message}` });
  }
});

router.get('/', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const quizzesContainer = req.app.get('quizzesContainer');
    const { resources } = await quizzesContainer.items.readAll().fetchAll();
    console.log('Fetched quizzes:', resources);
    res.json(resources);
  } catch (error) {
    console.error('Cosmos DB error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;