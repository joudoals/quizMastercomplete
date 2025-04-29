const express = require('express');
const cors = require('cors');
const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const quizzesRoutes = require('./api/quizzes');
const submissionsRoutes = require('./api/submissions');
const resultsRoutes = require('./api/results');
const authRoutes = require('./api/auth');

const app = express();

// Middleware
app.use(cors({
  origin: 'https://blue-meadow-0e61aaf1e.6.azurestaticapps.net',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Validate environment variables
if (!process.env.COSMOS_ENDPOINT || !process.env.COSMOS_KEY || !process.env.DATABASE_NAME) {
  console.error('Missing required environment variables:', {
    COSMOS_ENDPOINT: process.env.COSMOS_ENDPOINT,
    COSMOS_KEY: process.env.COSMOS_KEY ? '[REDACTED]' : undefined,
    DATABASE_NAME: process.env.DATABASE_NAME
  });
  process.exit(1);
}
if (typeof process.env.DATABASE_NAME !== 'string' || process.env.DATABASE_NAME.trim() === '') {
  console.error('DATABASE_NAME must be a non-empty string:', process.env.DATABASE_NAME);
  process.exit(1);
}

// Cosmos DB setup
const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY
});
const database = client.database(process.env.DATABASE_NAME);
const quizzesContainer = database.container('quizzes');
const usersContainer = database.container('users');
const submissionsContainer = database.container('submissions');

// Test Cosmos DB connection and containers
async function testCosmos() {
  try {
    console.log('Testing Cosmos DB connection...');
    await database.read();
    console.log('Database connection successful: QuizMasterDB');
    await quizzesContainer.read();
    console.log('Container connection successful: quizzes');
    await usersContainer.read();
    console.log('Container connection successful: users');
    await submissionsContainer.read();
    console.log('Container connection successful: submissions');
  } catch (error) {
    console.error('Cosmos DB connection failed:', error.message, error.stack);
    process.exit(1);
  }
}
testCosmos();

// Make containers available to routes
app.set('quizzesContainer', quizzesContainer);
app.set('usersContainer', usersContainer);
app.set('submissionsContainer', submissionsContainer);

// Routes
app.use('/api/quizzes', quizzesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/auth', authRoutes);

// Serve static files
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));