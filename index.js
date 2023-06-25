const express = require('express');
const app = express();
const port = 3000;

const handlebars = require('express-handlebars');

app.engine('handlebars', handlebars.engine({
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

require('dotenv').config();

const axios = require('axios');
const config = {
    headers: {
        'Authorization': process.env.POSTGREST_TOKEN,
    }
};

const getTags = async () => {
    const response = await axios.get(process.env.POSTGREST_HOST+':8000/tags', config);

    return response.data;
};

const getNotes = async (folderId, tags) => {
    tagsQuery = tags ? '&tags=cs.{' + tags + '}' : '';
    const response = await axios.get(process.env.POSTGREST_HOST+':8000/notes?parent_id=eq.'+folderId+tagsQuery, config);

    return response.data;
};

const getFolders = async () => {
    const response = await axios.get(process.env.POSTGREST_HOST+':8000/folders', config);
    
    return response.data;
};

const getFolder = async (id) => {
    const response = await axios.get(process.env.POSTGREST_HOST+':8000/folders?folder_id=eq.'+id, config);

    return response.data[0];
};

app.get('/', (req, res) => {
    const tags = req.query.tags;
    getFolders().then((folders) => {
        res.render('home', {
            layout : 'main', 
            folders: folders
        });
    });
});

app.get('/folders/:id', (req, res) => {
    const id = req.params.id;
    const queryTags = req.query.tags;
    getTags().then((tags) => {
        getFolder(id).then((folder) => {
            getFolders().then((folders) => {
                getNotes(id, queryTags).then((notes) => {
                    res.render('notes', {
                        layout : 'main', 
                        folders: folders,
                        folder: folder,
                        notes: notes,
                        tags: tags,
                        url: req.protocol + '://' + req.get('host') + req.originalUrl,
                        helpers: {
                            isBookmarksFolder: function(folder) {
                                return folder.title === 'bookmarks';
                            }
                        }
                    });
                });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});