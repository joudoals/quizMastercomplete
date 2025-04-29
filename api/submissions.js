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

  const { userId, quizId, answers } = req.body;
  if (!userId || !quizId || !answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Invalid submission data' });
  }

  try {
    const submissionsContainer = req.app.get('submissionsContainer');
    const quizzesContainer = req.app.get('quizzesContainer');
    const { resource: quiz } = await quizzesContainer.item(quizId, quizId).read();
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const score = answers.reduce((acc, answer, index) => {
      return acc + (answer === quiz.questions[index]?.correctAnswer ? 1 : 0);
    }, 0);
    const submission = { userId, quizId, answers, score, total: quiz.questions.length };
    const { resource } = await submissionsContainer.items.create(submission);
    res.status(201).json(resource);
  } catch (error) {
    console.error('Submission error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;