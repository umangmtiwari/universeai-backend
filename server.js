const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Middleware setup (optional)
app.use(express.json());
app.use(require('cors')());

const credits = require('./api/credits.js');
const deductCreditsContentCode = require('./api/deductCreditsContentCode.js');
const deductCreditsImage = require('./api/deductCreditsImage.js');

// Use your API routes
app.use('/api/credits', credits);
app.use('/api/deductCreditsContentCode', deductCreditsContentCode);
app.use('/api/deductCreditsImage', deductCreditsImage);

// Home route (optional)
app.get('/', (req, res) => {
  res.send('Welcome to the backend API!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
