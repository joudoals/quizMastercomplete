const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const usersContainer = req.app.get('usersContainer');
    const { resources } = await usersContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }]
      })
      .fetchAll();

    if (resources.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { id: uuidv4(), email, password: hashedPassword };
    const { resource } = await usersContainer.items.create(user);
    const token = jwt.sign({ userId: resource.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, userId: resource.id });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const usersContainer = req.app.get('usersContainer');
    const { resources } = await usersContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: email }]
      })
      .fetchAll();

    if (resources.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = resources[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, userId: user.id });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;