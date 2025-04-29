function showFeedback(elementId, message, type) {
    const feedback = document.getElementById(elementId);
    feedback.textContent = message;
    feedback.classList.remove('d-none', 'alert-success', 'alert-danger');
    feedback.classList.add(`alert-${type}`);
  }
  
  // Authentication Check
  function checkAuth() {
    const token = localStorage.getItem('token');
    const protectedPaths = ['/index.html', '/quiz.html', '/take_quiz.html', '/results.html', '/'];
    const currentPath = window.location.pathname || '/index.html';
    
    if (!token && protectedPaths.includes(currentPath)) {
      showFeedback('feedback', 'Please log in to access this page', 'danger');
      setTimeout(() => window.location.href = '/login.html', 1000);
    }
  }
  document.addEventListener('DOMContentLoaded', checkAuth);
  
  // Logout
  document.getElementById('logout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    window.location.href = '/login.html';
  });
  
  // Quiz Creation
  document.getElementById('quizForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const quizTitle = document.getElementById('quizTitle').value.trim();
    const questions = Array.from(document.querySelectorAll('.quiz-question')).map((q, index) => {
      return {
        question: q.querySelector(`#question${index}`).value.trim(),
        options: [
          q.querySelector(`#option${index}_1`).value.trim(),
          q.querySelector(`#option${index}_2`).value.trim(),
          q.querySelector(`#option${index}_3`).value.trim(),
          q.querySelector(`#option${index}_4`).value.trim()
        ],
        correctAnswer: q.querySelector(`#correctAnswer${index}`).value
      };
    });
  
    if (!quizTitle || questions.length === 0 || questions.some(q => !q.question || q.options.some(opt => !opt) || !/^[1-4]$/.test(q.correctAnswer))) {
      showFeedback('feedback', 'All fields are required, and correct answers must be 1-4', 'danger');
      return;
    }
  
    try {
      const response = await fetch('https://quizmaster-backend-joudoals.azurewebsites.net/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ title: quizTitle, questions })
      });
      const responseData = await response.json();
      if (response.ok) {
        showFeedback('feedback', 'Quiz created successfully!', 'success');
        document.getElementById('quizForm').reset();
        document.getElementById('questionsContainer').innerHTML = '';
      } else {
        showFeedback('feedback', `Failed to create quiz: ${responseData.error || 'Unknown error'}`, 'danger');
      }
    } catch (error) {
      showFeedback('feedback', 'Error: ' + error.message, 'danger');
    }
  });
  
  // Dynamic Question Addition
  document.getElementById('addQuestion')?.addEventListener('click', () => {
    const index = document.querySelectorAll('.quiz-question').length;
    const questionHtml = `
      <div class="quiz-question">
        <h5>Question ${index + 1}</h5>
        <div class="mb-3">
          <label for="question${index}" class="form-label">Question</label>
          <input type="text" class="form-control" id="question${index}" required>
        </div>
        <div class="mb-3">
          <label for="option${index}_1" class="form-label">Option 1</label>
          <input type="text" class="form-control" id="option${index}_1" required>
        </div>
        <div class="mb-3">
          <label for="option${index}_2" class="form-label">Option 2</label>
          <input type="text" class="form-control" id="option${index}_2" required>
        </div>
        <div class="mb-3">
          <label for="option${index}_3" class="form-label">Option 3</label>
          <input type="text" class="form-control" id="option${index}_3" required>
        </div>
        <div class="mb-3">
          <label for="option${index}_4" class="form-label">Option 4</label>
          <input type="text" class="form-control" id="option${index}_4" required>
        </div>
        <div class="mb-3">
          <label for="correctAnswer${index}" class="form-label">Correct Answer (1-4)</label>
          <input type="number" class="form-control" id="correctAnswer${index}" min="1" max="4" required>
        </div>
        <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">Remove Question</button>
      </div>
    `;
    document.getElementById('questionsContainer').insertAdjacentHTML('beforeend', questionHtml);
  });
  
  // Quiz Taking
  let currentQuiz = null;
  let userAnswers = {};
  
  document.addEventListener('DOMContentLoaded', async () => {
    const quizList = document.getElementById('quizList');
    if (quizList) {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Please log in to view quizzes');
        const response = await fetch('https://quizmaster-backend-joudoals.azurewebsites.net/api/quizzes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch quizzes');
        }
        const quizzes = await response.json();
        quizList.innerHTML = quizzes.map(quiz => `
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">${quiz.title}</h5>
              <button class="btn btn-primary" onclick="startQuiz('${quiz.id}')">Take Quiz</button>
            </div>
          </div>
        `).join('');
      } catch (error) {
        console.error('Quiz fetch error:', error.message);
        showFeedback('feedback', `Error loading quizzes: ${error.message}`, 'danger');
      }
    }
  });
  
  async function startQuiz(quizId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Please log in to take a quiz');
      const response = await fetch('https://quizmaster-backend-joudoals.azurewebsites.net/api/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch quizzes');
      const quizzes = await response.json();
      currentQuiz = quizzes.find(q => q.id === quizId);
      if (!currentQuiz) throw new Error('Quiz not found');
      
      userAnswers = {};
      document.getElementById('quizTitle').textContent = currentQuiz.title;
      document.getElementById('submissionForm').classList.remove('d-none');
      document.getElementById('submissionForm').dataset.quizId = quizId;
      
      renderQuestion(0);
    } catch (error) {
      console.error('Quiz start error:', error.message);
      showFeedback('feedback', `Error loading quiz: ${error.message}`, 'danger');
    }
  }
  
  function renderQuestion(index) {
    const question = currentQuiz.questions[index];
    const questionsDiv = document.getElementById('questions');
    questionsDiv.innerHTML = `
      <div class="mb-4">
        <h5>Question ${index + 1}: ${question.question}</h5>
        ${question.options.map((option, i) => `
          <div class="form-check">
            <input class="form-check-input" type="radio" name="answer${index}" value="${i + 1}" 
              ${userAnswers[index] == (i + 1) ? 'checked' : ''} required>
            <label class="form-check-label">${option}</label>
          </div>
        `).join('')}
      </div>
    `;
    
    document.getElementById('prevQuestion').disabled = index === 0;
    document.getElementById('nextQuestion').classList.toggle('d-none', index === currentQuiz.questions.length - 1);
    document.getElementById('submitQuiz').classList.toggle('d-none', index !== currentQuiz.questions.length - 1);
    currentQuestion = index;
  
    // Save answer on change
    questionsDiv.querySelectorAll(`input[name="answer${index}"]`).forEach(input => {
      input.addEventListener('change', () => {
        userAnswers[index] = input.value;
      });
    });
  }
  
  document.getElementById('prevQuestion')?.addEventListener('click', () => {
    renderQuestion(currentQuestion - 1);
  });
  
  document.getElementById('nextQuestion')?.addEventListener('click', () => {
    renderQuestion(currentQuestion + 1);
  });
  
  document.getElementById('submissionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const quizId = e.target.dataset.quizId;
    const userId = localStorage.getItem('userId');
    if (!userId) {
      showFeedback('feedback', 'Please log in to submit answers', 'danger');
      return;
    }
  
    const answers = currentQuiz.questions.map((_, i) => userAnswers[i] || null);
    if (answers.some(a => !a)) {
      showFeedback('feedback', 'Please answer all questions', 'danger');
      return;
    }
  
    try {
      const response = await fetch('https://quizmaster-backend-joudoals.azurewebsites.net/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ userId, quizId, answers })
      });
      const responseData = await response.json();
      if (response.ok) {
        showFeedback('feedback', 'Answers submitted!', 'success');
        userAnswers = {};
        currentQuiz = null;
        setTimeout(() => window.location.href = `/results.html?quizId=${quizId}`, 1000);
      } else {
        showFeedback('feedback', `Failed to submit answers: ${responseData.error || 'Unknown error'}`, 'danger');
      }
    } catch (error) {
      showFeedback('feedback', 'Error: ' + error.message, 'danger');
    }
  });
  
  // Results
  document.addEventListener('DOMContentLoaded', async () => {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
      const urlParams = new URLSearchParams(window.location.search);
      const quizId = urlParams.get('quizId');
      const userId = localStorage.getItem('userId');
      if (!userId || !quizId) {
        showFeedback('feedback', 'Please log in and select a quiz to view results', 'danger');
        setTimeout(() => window.location.href = '/login.html', 1000);
        return;
      }
  
      try {
        const response = await fetch('https://quizmaster-backend-joudoals.azurewebsites.net/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ userId, quizId })
        });
        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.error || 'Failed to fetch results');
        }
        const { score, total, details } = responseData;
        resultsDiv.innerHTML = `
          <h3>Your Score: ${score} / ${total}</h3>
          <p>${score === total ? 'Perfect!' : 'Review your answers below:'}</p>
          ${details.map((d, i) => `
            <div class="mb-3">
              <p><strong>Question ${i + 1}:</strong> ${d.question}</p>
              <p><strong>Your Answer:</strong> ${d.userAnswer ? d.options[d.userAnswer - 1] : 'Not answered'} 
                 (${d.correct ? '<span class="text-success">Correct</span>' : '<span class="text-danger">Incorrect</span>'})</p>
              ${!d.correct ? `<p><strong>Correct Answer:</strong> ${d.options[d.correctAnswer - 1]}</p>` : ''}
            </div>
          `).join('')}
        `;
      } catch (error) {
        console.error('Results fetch error:', error.message);
        showFeedback('feedback', `Error loading results: ${error.message}`, 'danger');
      }
    }
  });
  
  // Authentication
  document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const response = await fetch('https://quizmaster-backend-joudoals.azurewebsites.net/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const responseData = await response.json();
      if (response.ok) {
        localStorage.setItem('token', responseData.token);
        localStorage.setItem('userId', responseData.userId);
        showFeedback('feedback', 'Login successful!', 'success');
        setTimeout(() => window.location.href = '/', 1000);
      } else {
        showFeedback('feedback', `Invalid credentials: ${responseData.error || 'Unknown error'}`, 'danger');
      }
    } catch (error) {
      showFeedback('feedback', 'Error: ' + error.message, 'danger');
    }
  });
  
  document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const response = await fetch('https://quizmaster-backend-joudoals.azurewebsites.net/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const responseData = await response.json();
      if (response.ok) {
        localStorage.setItem('token', responseData.token);
        localStorage.setItem('userId', responseData.userId);
        showFeedback('feedback', 'Registration successful!', 'success');
        setTimeout(() => window.location.href = '/', 1000);
      } else {
        showFeedback('feedback', `Registration failed: ${responseData.error || 'Unknown error'}`, 'danger');
      }
    } catch (error) {
      showFeedback('feedback', 'Error: ' + error.message, 'danger');
    }
  });