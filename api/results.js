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

  const { userId, quizId } = req.body;
  if (!userId || !quizId) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const submissionsContainer = req.app.get('submissionsContainer');
    const quizzesContainer = req.app.get('quizzesContainer');
    const { resource: quiz } = await quizzesContainer.item(quizId, quizId).read();
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const { resources: submissions } = await submissionsContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId AND c.quizId = @quizId',
        parameters: [{ name: '@userId', value: userId }, { name: '@quizId', value: quizId }]
      })
      .fetchAll();

    const submission = submissions[0];
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const details = quiz.questions.map((q, i) => ({
      question: q.question,
      options: q.options,
      userAnswer: submission.answers[i],
      correctAnswer: q.correctAnswer,
      correct: submission.answers[i] === q.correctAnswer
    }));

    res.json({
      score: submission.score,
      total: quiz.questions.length,
      details
    });
  } catch (error) {
    console.error('Results error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;