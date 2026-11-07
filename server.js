require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/fight', require('./api/fight'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log());
