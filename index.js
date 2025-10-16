const express = require('express');
const app = express();
const port = 3000;
const homeArticle = '36ec96bfba5b4c10838d684de6952d4c';

const handlebars = require('express-handlebars');

app.engine('handlebars', handlebars.engine({
    layoutsDir: `${__dirname}/views/layouts`,
    partialsDir: `${__dirname}/views/partials`,
    helpers: require('./helpers/handlebars.js')
}));

app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.static('public'));

require('dotenv').config();

const axios = require('axios');
const config = {
    headers: {
        'Authorization': process.env.POSTGREST_TOKEN,
    }
};

function replaceResourceTitleByImageTag(notes) {
    const promises = [];

    for (const i in notes) {
        const promise = (async () => {
            const note = notes[i];
            const regex = /!\[([^\]]+\.(png|jpg|jpeg))\]\(:\/([a-f0-9]+)\)/g;
            const matches = note.body.matchAll(regex);

            for (const matched of matches) {
                const response = await axios.get(`https://${process.env.POSTGREST_HOST}/resources?title=eq.${matched[1]}`, config);
                note.body = note.body.replace(matched[0], `<img src="data:image/png;base64,${response.data[0].contents}" />`);
            }

            return note;
        })();

        promises.push(promise);
    }

    return Promise.all(promises);
}

const getNotes = async (folderId) => {
    const response = await axios.get(`https://${process.env.POSTGREST_HOST}/notes?parent_id=eq.${folderId}&order=created_time.desc&note_id=neq.${homeArticle}`, config);
    
    return replaceResourceTitleByImageTag(response.data).then(results => {   
        return results;
    });
};

const getFolders = async () => {
    const response = await axios.get(`https://${process.env.POSTGREST_HOST}/folders?order=title`, config);
    
    return response.data;
};

const getFolder = async (id) => {
    const response = await axios.get(`https://${process.env.POSTGREST_HOST}/folders?folder_id=eq.${id}`, config);

    return response.data[0];
};

const getNoteByNoteId = async (id) => {
    const response = await axios.get(`https://${process.env.POSTGREST_HOST}/notes?note_id=eq.${id}`, config);

    return replaceResourceTitleByImageTag(response.data);
};

const getTagsFromNotes = (notes) => {
    const result = notes.flatMap((note) => {
        return note.tags;
    });

    return [...new Set(result)];
}

const groupNotesByDate = (notes) => {
    const grouped = notes.reduce((r, a) => {
        r[new Date(a.created_time).toLocaleDateString('us', 'US')] = [...r[new Date(a.created_time).toLocaleDateString('us', 'US')] || [], a];
        
        return r;
    }, {});

    return grouped;
}

const filterNotesByTag = (notes, tag) => {
    if(!tag) return notes;
    const result = notes.filter((note) => {
        return note.tags.includes(tag);
    });
    
    return result;
}

app.get('/', (req, res) => {
    const tags = req.query.tags;
    getFolders().then((folders) => {
        getNoteByNoteId(homeArticle).then((notes) => { 
            res.render('home', {
                layout : 'main', 
                folders: folders,
                note: notes[0],
            });
        });
    }).catch((error) => {
        res.render('error', {
            layout : 'main'
        });
    });
});

app.get('/folders/:id', (req, res) => {
    const id = req.params.id;
    const queryTag = req.query.tag;
    getFolder(id).then((folder) => {
        getFolders().then((folders) => {
            getNotes(id).then((notes) => {
                const filteredNotesByTag = filterNotesByTag(notes, queryTag);
                res.render('notes', {
                    layout : 'main', 
                    folders: folders,
                    folder: folder,
                    tags: getTagsFromNotes(notes),
                    notes: groupNotesByDate(filteredNotesByTag),
                    queryTag: queryTag,
                    url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
                });
            });
        });
    }).catch((error) => {
        res.send('an error occured');
    })
});

app.get('/sitemap.xml', (req, res) => {
    res.sendFile(`${__dirname}/sitemap.xml`);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
