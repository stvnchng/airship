const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/eligibility', require('./routes/eligibility'));
app.use('/api/ingest',      require('./routes/ingest'));
app.use('/api/imports',     require('./routes/imports'));
app.use('/api/export',      require('./routes/export'));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
