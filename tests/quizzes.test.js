const request = require('supertest');
const express = require('express');
const quizzesRoutes = require('../api/quizzes');

const app = express();
app.use(express.json());
app.use('/api/quizzes', quizzesRoutes);

// Mock Cosmos DB
const mockContainer = {
  items: {
    create: jest.fn().mockResolvedValue({ resource: { id: 'quiz123', question: 'Test' } }),
    readAll: jest.fn().mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({ resources: [{ id: 'quiz123', question: 'Test' }] })
    })
  }
};
app.set('quizzesContainer', mockContainer);

describe('Quizzes API', () => {
  test('POST /api/quizzes creates a quiz', async () => {
    const response = await request(app)
      .post('/api/quizzes')
      .send({
        question: 'What is 2+2?',
        options: ['1', '2', '3', '4'],
        correctAnswer: '4'
      });
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id', 'quiz123');
  });

  test('GET /api/quizzes returns all quizzes', async () => {
    const response = await request(app).get('/api/quizzes');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'quiz123', question: 'Test' }]);
  });
});