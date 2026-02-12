const express = require('express');
const compression = require('compression');
const path = require('path');
const handlebars = require('express-handlebars');
require('dotenv').config();

const app = express();
app.use(compression());

const port = 3000;

// Setup Handlebars
app.engine('handlebars', handlebars.engine({
    layoutsDir: `${__dirname}/views/layouts`,
    partialsDir: `${__dirname}/views/partials`,
    helpers: require('./helpers/handlebars.js')
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public'), { maxAge: '1d' }));

// Import route modules
const homeRouter = require('./routes/home');
const searchRouter = require('./routes/search');
const aboutRouter = require('./routes/about');
const sitemapRouter = require('./routes/sitemap');
const redirectsRouter = require('./routes/redirects');
const foldersRouter = require('./routes/folders');
const notesRouter = require('./routes/notes');

// Use route modules
app.use('/', homeRouter);
app.use('/', searchRouter);
app.use('/', aboutRouter);
app.use('/', sitemapRouter);
app.use('/', redirectsRouter);
app.use('/', foldersRouter);
app.use('/', notesRouter);

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
