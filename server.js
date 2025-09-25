const express = require('express');
const path = require('path');
const app = express();
// Vite builds to a 'dist' folder
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Vite app server listening on port ${port}`);
});
