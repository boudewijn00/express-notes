const express = require('express');
const app = express();
const port = 3000;
const homeArticle = '36ec96bfba5b4c10838d684de6952d4c';
const articlesFolder = 'b7bc7b8a876e4254ad9865f91ddc8f70';

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
            note.body = note.body || '';
            const regex = /!\[([^\]]+\.(png|jpg|jpeg))\]\(:\/([a-f0-9]+)\)/g;
            const matches = note.body.matchAll(regex);

            for (const matched of matches) {
                const response = await axios.get(`${process.env.POSTGREST_HOST}/resources?title=eq.${matched[1]}`, config);
                note.body = note.body.replace(matched[0], `<img src="data:image/png;base64,${response.data[0].contents}" />`);
            }

            return note;
        })();

        promises.push(promise);
    }

    return Promise.all(promises);
}

function processLinkImages(notes) {
    return notes.map(note => {
        if (note.link_image && !note.link_image.startsWith('http')) {
            note.link_image = null;
        }
        return note;
    });
}

const getNotes = async (folderId) => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?parent_id=eq.${folderId}&order=created_time.desc&note_id=neq.${homeArticle}`, config);
    
    return replaceResourceTitleByImageTag(response.data).then(results => {   
        return processLinkImages(results);
    });
};

const getRecentNotes = async () => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?order=created_time.desc&limit=5&note_id=neq.${homeArticle}&parent_id=neq.${articlesFolder}`, config);

    return replaceResourceTitleByImageTag(response.data).then(results => {
        return processLinkImages(results);
    }).then(notes => {
        return Promise.all(notes.map(async note => {
            note.folder = await getFolder(note.parent_id);
            return note;
        }));
    });
};

const getFolders = async () => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/folders?order=title`, config);
    
    return response.data;
};

const getFolder = async (id) => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/folders?folder_id=eq.${id}`, config);

    return response.data[0];
};

const getNoteByNoteId = async (id) => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?note_id=eq.${id}`, config);

    return replaceResourceTitleByImageTag(response.data).then(notes => processLinkImages(notes));
};

const searchNotes = async (query) => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?link_excerpt_tsv=plfts(english).${query}&order=created_time.desc`, config);

    const notes = processLinkImages(response.data);
    return Promise.all(notes.map(async note => {
        note.folder = await getFolder(note.parent_id);
        return note;
    }));
};

const getTagsFromNotes = (notes) => {
    const result = notes.flatMap((note) => {
        return note.tags;
    });

    return [...new Set(result)];
}

const groupNotesByDate = (notes) => {
    const grouped = notes.reduce((r, a) => {
        const date = new Date(a.created_time).toISOString().split('T')[0];
        r[date] = [...r[date] || [], a];
        
        return r;
    }, {});

    return grouped;
}

const groupNotesByMonth = (notes) => {
    const grouped = notes.reduce((r, a) => {
        const date = new Date(a.created_time);
        const key = `${date.getFullYear()} ${date.toLocaleString('en-US', { month: 'long' })}`;
        r[key] = [...r[key] || [], a];
        
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
    Promise.all([
        getFolders(),
        getNoteByNoteId(homeArticle),
        getRecentNotes(),
    ]).then(([folders, notes, recentNotes]) => {
        res.render('home', {
            layout : 'main', 
            folders: folders,
            note: notes[0] || { title: '', body: '' },
            recentNotes: recentNotes,
        });
    }).catch((error) => {
        res.render('error', {
            layout : 'main',
            error: error
        });
    });
});

app.get('/search', (req, res) => {
    const query = req.query.q;

    getFolders().then((folders) => {
        if (!query) {
            return res.render('search', {
                layout: 'main',
                folders: folders,
                query: query
            });
        }

        searchNotes(query).then((notes) => {
            res.render('search', {
                layout: 'main',
                folders: folders,
                notes: groupNotesByMonth(notes),
                query: query,
                hasResults: notes.length > 0
            });
        }).catch((error) => {
            res.render('error', {
                layout : 'main',
                folders: folders,
                error: error
            });
        });
    }).catch((error) => {
        res.render('error', {
            layout : 'main',
            error: error
        });
    });
});

app.get('/about', (req, res) => {
    getNotes(articlesFolder).then((notes) => {
        const filteredNotes = notes.filter(note => note.note_id !== homeArticle);
        const notesGroupedByMonth = groupNotesByMonth(filteredNotes);
        
        res.render('about', {
            layout : 'main',
            notes: notesGroupedByMonth
        });
    }).catch((error) => {
        res.render('error', {
            layout : 'main',
            error: error
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
                    notes: groupNotesByMonth(filteredNotesByTag),
                    queryTag: queryTag,
                    url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
                });
            });
        });
    }).catch((error) => {
        res.render('error', {
            layout : 'main',
            error: error
        });
    })
});

app.get('/notes/:id', (req, res) => {
    const id = req.params.id;
    let noteArray;

    getNoteByNoteId(id)
    .then(notes => {
        if (!notes || notes.length === 0) {
            throw new Error('Note not found');
        }
        noteArray = notes;
        const note = noteArray[0];
        return getFolder(note.parent_id);
    })
    .then((folder) => {
        res.render('note', {
            layout : 'main', 
            folder: folder,
            tags: getTagsFromNotes(noteArray),
            notes: groupNotesByMonth(noteArray),
            queryTag: null,
            url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        });
    })
    .catch((error) => {
        res.render('error', {
            layout : 'main',
            error: error
        });
    });
});

app.get('/sitemap.xml', (req, res) => {
    res.sendFile(`${__dirname}/sitemap.xml`);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
