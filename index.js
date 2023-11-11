const express = require('express');
const app = express();
const port = 3000;
const homeArticle = '36ec96bfba5b4c10838d684de6952d4c';

const handlebars = require('express-handlebars');

app.engine('handlebars', handlebars.engine({
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
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
    let promises = [];

    for (let i in notes) {
        let promise = new Promise(async (resolve, reject) => {
            let note = notes[i];
            let regex = /!\[([^\]]+\.(png|jpg|jpeg))\]\(:\/([a-f0-9]+)\)/;
            let matched = note.body.match(regex);

            if(matched){
                const response = await axios.get(process.env.POSTGREST_HOST+':8000/resources?title=eq.'+matched[1], config);
                note.body = note.body.replace(matched[0], '<img src="data:image/png;base64,'+response.data[0].contents+'" />');
            }

            resolve(note);
        });

        promises.push(promise);
    }

    return Promise.all(promises);
}

const getNotes = async (folderId) => {
    const response = await axios.get(process.env.POSTGREST_HOST+':8000/notes?parent_id=eq.'+folderId+'&order=created_time.desc&note_id=neq.'+homeArticle, config);
    
    return replaceResourceTitleByImageTag(response.data).then(results => {   
        const notes = results.reduce((r, a) => {
            r[new Date(a.created_time).toLocaleDateString('us', 'US')] = [...r[new Date(a.created_time).toLocaleDateString('us', 'US')] || [], a];
            
            return r;
        }, {});

        return notes;
    });
};

const getFolders = async () => {
    const response = await axios.get(process.env.POSTGREST_HOST+':8000/folders?order=title', config);
    
    return response.data;
};

const getFolder = async (id) => {
    const response = await axios.get(process.env.POSTGREST_HOST+':8000/folders?folder_id=eq.'+id, config);

    return response.data[0];
};

const getNoteByNoteId = async (id) => {
    const response = await axios.get(process.env.POSTGREST_HOST+':8000/notes?note_id=eq.'+id, config);

    return replaceResourceTitleByImageTag(response.data);
};

const filterTagsFromNotes = (notes) => {
    let tags = [];

    for (let i in notes) {
        for (let j in notes[i]) {
            let note = notes[i][j];
            for (let k in note.tags) {
                tags.push(note.tags[k]);
            }
        }
    }

    return tags.filter((v, i, a) => a.indexOf(v) === i);
}

const filterNotesByTag = (notes, tag) => {
    if(tag) {
        for (let i in notes) {
            for (let j in notes[i]) {
                let note = notes[i][j];
                let found = false;
                for (let k in note.tags) {
                    if(tag.includes(note.tags[k])) {
                        found = true;
                    }
                }
                if(!found) {
                    delete notes[i][j];
                }
            }
        }
    }

    for (let i in notes) {
        if(!notes[i][0]) {
            delete notes[i];
        }
    }

    return notes;
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
    }).catch(() => {
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
                res.render('notes', {
                    layout : 'main', 
                    folders: folders,
                    folder: folder,
                    tags: filterTagsFromNotes(notes),
                    notes: filterNotesByTag(notes, queryTag),
                    queryTag: queryTag,
                    url: req.protocol + '://' + req.get('host') + req.originalUrl,
                });
            });
        });
    }).catch((error) => {
        res.send('an error occured');
    })
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});