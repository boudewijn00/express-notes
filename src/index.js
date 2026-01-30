const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const homeArticle = '36ec96bfba5b4c10838d684de6952d4c';
const articlesFolder = 'b7bc7b8a876e4254ad9865f91ddc8f70';
const siteUrl = 'https://notes.hello-data.nl';

// Helper to create meta description from text
const createMetaDescription = (text, maxLength = 160) => {
    if (!text) return null;
    // Strip HTML tags and markdown
    const clean = text.replace(/<[^>]*>/g, '').replace(/[#*_`\[\]]/g, '').trim();
    if (clean.length <= maxLength) return clean;
    return clean.substring(0, maxLength - 3).trim() + '...';
};

const handlebars = require('express-handlebars');

app.engine('handlebars', handlebars.engine({
    layoutsDir: `${__dirname}/views/layouts`,
    partialsDir: `${__dirname}/views/partials`,
    helpers: require('./helpers/handlebars.js')
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '../public')));

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
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?select=*&parent_id=eq.${folderId}&order=created_time.desc&note_id=neq.${homeArticle}`, config);

    return replaceResourceTitleByImageTag(response.data).then(results => {
        return processLinkImages(results);
    });
};

const getRecentNotes = async () => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?select=*&order=created_time.desc&limit=5&note_id=neq.${homeArticle}&parent_id=neq.${articlesFolder}`, config);

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
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?select=*&note_id=eq.${id}`, config);

    return replaceResourceTitleByImageTag(response.data).then(notes => processLinkImages(notes));
};

const searchNotes = async (query) => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?select=*&link_excerpt_tsv=plfts(english).${query}&order=created_time.desc`, config);

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
        const note = notes[0] || { title: '', body: '' };
        res.render('home', {
            layout : 'main',
            folders: folders,
            note: note,
            recentNotes: recentNotes,
            // SEO
            canonicalUrl: siteUrl,
            metaDescription: createMetaDescription(note.link_excerpt || note.body) || 'Web development notes and bookmarks about PHP, Laravel, Node.js, APIs, databases, and more',
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

    if (!query) {
        return res.render('search', {
            layout: 'main',
            query: query,
            // SEO
            pageTitle: 'Search',
            canonicalUrl: `${siteUrl}/search`,
            metaDescription: 'Search through web development notes and bookmarks',
        });
    }

    searchNotes(query).then((notes) => {
        res.render('search', {
            layout: 'main',
            notes: notes,
            query: query,
            hasResults: notes.length > 0,
            // SEO
            pageTitle: `Search: ${query}`,
            canonicalUrl: `${siteUrl}/search?q=${encodeURIComponent(query)}`,
            metaDescription: `Search results for "${query}" - ${notes.length} results found`,
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
            notes: notesGroupedByMonth,
            // SEO
            pageTitle: 'About',
            canonicalUrl: `${siteUrl}/about`,
            metaDescription: 'Articles and thoughts about web development, programming, and technology',
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
                const pageTitle = queryTag ? `${folder.title} - ${queryTag}` : folder.title;
                res.render('notes', {
                    layout : 'main',
                    folders: folders,
                    folder: folder,
                    tags: getTagsFromNotes(notes),
                    notes: groupNotesByMonth(filteredNotesByTag),
                    queryTag: queryTag,
                    url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
                    // SEO
                    pageTitle: pageTitle,
                    canonicalUrl: queryTag ? `${siteUrl}/folders/${id}?tag=${encodeURIComponent(queryTag)}` : `${siteUrl}/folders/${id}`,
                    metaDescription: `Browse ${filteredNotesByTag.length} notes about ${folder.title}${queryTag ? ` tagged with ${queryTag}` : ''}`,
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

// Dynamic sitemap generation
app.get('/sitemap.xml', async (req, res) => {
    try {
        const folders = await getFolders();
        // Get all notes from all folders (excluding articles folder for main sitemap)
        const allNotesPromises = folders
            .filter(f => f.folder_id !== articlesFolder)
            .map(f => getNotes(f.folder_id));
        const notesArrays = await Promise.all(allNotesPromises);
        const allNotes = notesArrays.flat();

        // Also get article notes
        const articleNotes = await getNotes(articlesFolder);
        const filteredArticles = articleNotes.filter(n => n.note_id !== homeArticle);

        const now = new Date().toISOString().split('T')[0];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/about</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/search</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

        // Add folders
        for (const folder of folders) {
            if (folder.folder_id === articlesFolder) continue;
            xml += `
  <url>
    <loc>${siteUrl}/folders/${folder.folder_id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        }

        // Add individual notes
        for (const note of allNotes) {
            const lastmod = new Date(note.created_time).toISOString().split('T')[0];
            xml += `
  <url>
    <loc>${siteUrl}/notes/${note.note_id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
        }

        // Add article notes
        for (const note of filteredArticles) {
            const lastmod = new Date(note.created_time).toISOString().split('T')[0];
            xml += `
  <url>
    <loc>${siteUrl}/notes/${note.note_id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
        }

        xml += `
</urlset>`;

        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        res.status(500).send('Error generating sitemap');
    }
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
        const note = noteArray[0];
        const canonicalUrl = `${siteUrl}/notes/${id}`;

        // JSON-LD structured data for the note
        const structuredData = `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": ${JSON.stringify(note.title)},
  "datePublished": "${note.created_time}",
  "url": "${canonicalUrl}",
  "publisher": {
    "@type": "Organization",
    "name": "Hello Data Notes"
  }
}
</script>`;

        res.render('note', {
            layout : 'main',
            folder: folder,
            tags: getTagsFromNotes(noteArray),
            notes: groupNotesByMonth(noteArray),
            queryTag: null,
            url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            // SEO
            pageTitle: note.title,
            canonicalUrl: canonicalUrl,
            metaDescription: createMetaDescription(note.link_excerpt || note.body),
            ogType: 'article',
            ogImage: note.link_image || null,
            structuredData: structuredData,
        });
    })
    .catch((error) => {
        res.render('error', {
            layout : 'main',
            error: error
        });
    });
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
