const mustacheExpress = require('mustache-express');
const express = require('express');
const app = express();

app.engine('html', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

require('dotenv').config();

const axios = require('axios');
const config = {
    headers: {
        'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoibm9uX2Fub24ifQ.-1LNTzFFIB2YHBdIVjC45H61mbs318hgPh7-JRpXWu0'
    }
};

const getNotes = async (tags) => {
    console.log(tags);
    const response = await axios.get('http://localhost:8000/notes?tags=cs.{'+tags+'}', config);

    return response.data;
};

app.get('/', (req, res) => {
    getNotes().then((notes) => {
        res.send(notes);
    });
});

app.get('/mustache', (req, res) => {
    // get tags from query string
    const tags = req.query.tags;
    getNotes(tags).then((notes) => {
        res.render('index.html', { "notes": notes, "tags": tags });
    });
});

const port = 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});