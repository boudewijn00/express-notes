const express = require('express');
const compression = require('compression');
const path = require('path');
const app = express();

app.use(compression());
app.use(express.urlencoded({ extended: true }));
const port = 3000;
const homeArticle = '36ec96bfba5b4c10838d684de6952d4c';
const articlesFolder = 'b7bc7b8a876e4254ad9865f91ddc8f70';
const siteUrl = 'https://notes.hello-data.nl';

// Generate URL-friendly slug from title
const slugify = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s-]/g, '')    // Remove special chars
        .trim()
        .replace(/\s+/g, '-')            // Spaces to hyphens
        .replace(/-+/g, '-')             // Collapse multiple hyphens
        .substring(0, 80);               // Limit length
};

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
app.use(express.static(path.join(__dirname, '../public'), { maxAge: '1d' }));

require('dotenv').config();

const axios = require('axios');

const config = {
    headers: {
        'Authorization': process.env.POSTGREST_TOKEN,
    }
};

function replaceResourceTitleByImageTag(notes) {
    const promises = notes.map(async (note) => {
        note.body = note.body || '';
        const regex = /!\[([^\]]+\.(png|jpg|jpeg))\]\(:\/([a-f0-9]+)\)/g;
        const matches = [...note.body.matchAll(regex)];

        const responses = await Promise.all(
            matches.map(matched =>
                axios.get(`${process.env.POSTGREST_HOST}/resources?title=eq.${matched[1]}`, config)
            )
        );

        matches.forEach((matched, idx) => {
            note.body = note.body.replace(matched[0], `<img src="data:image/png;base64,${responses[idx].data[0].contents}" />`);
        });

        return note;
    });

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

    const [notes, folders] = await Promise.all([
        replaceResourceTitleByImageTag(response.data).then(processLinkImages),
        getFolders(),
    ]);

    const folderMap = Object.fromEntries(folders.map(f => [f.folder_id, f]));
    return notes.map(note => {
        note.folder = folderMap[note.parent_id];
        return note;
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

// Find folder by slug
const getFolderBySlug = async (slug) => {
    const folders = await getFolders();
    return folders.find(f => slugify(f.title) === slug);
};

// Find note by slug within a folder
const getNoteBySlug = async (folderId, slug) => {
    const notes = await getNotes(folderId);
    return notes.find(n => slugify(n.title) === slug);
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
        getNotes(articlesFolder),
    ]).then(([folders, notes, recentNotes, articleNotes]) => {
        const note = notes[0] || { title: '', body: '' };

        // Get the latest article and prepare a preview
        let latestArticle = null;
        const filteredArticles = articleNotes.filter(n => n.note_id !== homeArticle);
        if (filteredArticles.length > 0) {
            const article = { ...filteredArticles[0] };
            if (article.body) {
                const parts = article.body.split('---');
                if (parts.length > 1) {
                    const articleSlug = slugify(article.title);
                    const readMoreLink = ` <a href="/articles/${articleSlug}">Read more</a>`;
                    article.body = parts[0].trim() + readMoreLink;
                }
                article.body = article.body.replace(/\\/g, '');
            }
            latestArticle = article;
        }

        res.render('home', {
            layout : 'main',
            folders: folders,
            note: note,
            recentNotes: recentNotes,
            latestArticle: latestArticle,
            // SEO
            canonicalUrl: siteUrl,
            metaKeywords: getTagsFromNotes(latestArticle ? [...recentNotes, latestArticle] : recentNotes).join(', '),
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
            metaKeywords: getTagsFromNotes(notes).join(', '),
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
            sidebarSpace: true,
            notes: notesGroupedByMonth,
            // SEO
            pageTitle: 'About',
            canonicalUrl: `${siteUrl}/about`,
            metaKeywords: getTagsFromNotes(filteredNotes).join(', '),
            metaDescription: 'Articles and thoughts about web development, programming, and technology',
        });
    }).catch((error) => {
        res.render('error', {
            layout : 'main',
            error: error
        });
    });
});

// Newsletter routes
app.get('/newsletter', (req, res) => {
    res.render('newsletter', {
        layout: 'main',
        sidebarSpace: true,
        // SEO
        pageTitle: 'Newsletter Subscription',
        canonicalUrl: `${siteUrl}/newsletter`,
        metaDescription: 'Subscribe to our newsletter to receive updates about web development notes and articles',
    });
});

// Helper function for newsletter page rendering
const renderNewsletterPage = (res, options = {}) => {
    res.render('newsletter', {
        layout: 'main',
        sidebarSpace: true,
        ...options,
        // SEO
        pageTitle: 'Newsletter Subscription',
        canonicalUrl: `${siteUrl}/newsletter`,
        metaDescription: 'Subscribe to our newsletter to receive updates about web development notes and articles',
    });
};

app.post('/newsletter', async (req, res) => {
    try {
        const { first_name, last_name, email, frequency, topics } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !email || !frequency) {
            return renderNewsletterPage(res, { error: 'All fields except topics are required.' });
        }

        // Validate email format - more comprehensive regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(email)) {
            return renderNewsletterPage(res, { error: 'Please provide a valid email address.' });
        }

        // Validate frequency
        const validFrequencies = ['daily', 'weekly', 'monthly'];
        if (!validFrequencies.includes(frequency)) {
            return renderNewsletterPage(res, { error: 'Please select a valid frequency.' });
        }

        // Prepare the data for PostgREST
        const subscriberData = {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            email: email.trim().toLowerCase(),
            frequency,
            topics: typeof topics === 'string' && topics.trim() 
                ? topics.split(',').map(t => t.trim()).filter(t => t.length > 0).slice(0, 10)
                : []
        };

        // Post to PostgREST subscribers endpoint
        await axios.post(`${process.env.POSTGREST_HOST}/subscribers`, subscriberData, config);

        renderNewsletterPage(res, { success: true });
    } catch (error) {
        // Check for duplicate email error (PostgreSQL unique constraint violation)
        let errorMessage = 'Failed to subscribe. Please try again later.';
        if (error.response && error.response.status === 409) {
            errorMessage = 'This email is already subscribed to our newsletter.';
        } else if (error.response && error.response.status === 400) {
            errorMessage = 'Invalid data provided. Please check your input.';
        }

        renderNewsletterPage(res, { error: errorMessage });
    }
});


// Redirect old folder URLs to new slug-based URLs
app.get('/folders/:id', (req, res) => {
    const id = req.params.id;
    const queryTag = req.query.tag;
    getFolder(id).then((folder) => {
        if (!folder) {
            return res.status(404).render('error', { layout: 'main', error: { message: 'Folder not found' } });
        }
        const folderSlug = slugify(folder.title);
        const redirectUrl = queryTag
            ? `/${folderSlug}?tag=${encodeURIComponent(queryTag)}`
            : `/${folderSlug}`;
        res.redirect(301, redirectUrl);
    }).catch((error) => {
        res.render('error', { layout: 'main', error: error });
    });
});

// Dynamic sitemap generation
app.get('/sitemap.xml', async (req, res) => {
    try {
        const folders = await getFolders();

        // Create folder lookup map
        const folderMap = {};
        for (const f of folders) {
            folderMap[f.folder_id] = f;
        }

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

        // Add folders (slug-based URLs)
        for (const folder of folders) {
            if (folder.folder_id === articlesFolder) continue;
            const folderSlug = slugify(folder.title);
            xml += `
  <url>
    <loc>${siteUrl}/${folderSlug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
        }

        // Add individual notes (slug-based URLs: /folder-slug/note-slug)
        for (const note of allNotes) {
            const folder = folderMap[note.parent_id];
            if (!folder) continue;
            const folderSlug = slugify(folder.title);
            const noteSlug = slugify(note.title);
            const lastmod = new Date(note.created_time).toISOString().split('T')[0];
            xml += `
  <url>
    <loc>${siteUrl}/${folderSlug}/${noteSlug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
        }

        // Add article notes
        for (const note of filteredArticles) {
            const noteSlug = slugify(note.title);
            const lastmod = new Date(note.created_time).toISOString().split('T')[0];
            xml += `
  <url>
    <loc>${siteUrl}/articles/${noteSlug}</loc>
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

// Redirect old note URLs to new slug-based URLs
app.get('/notes/:id', (req, res) => {
    const id = req.params.id;

    // Home article redirects to home page
    if (id === homeArticle) {
        return res.redirect(301, '/');
    }

    getNoteByNoteId(id)
    .then(notes => {
        if (!notes || notes.length === 0) {
            throw new Error('Note not found');
        }
        const note = notes[0];
        return getFolder(note.parent_id).then(folder => ({ note, folder }));
    })
    .then(({ note, folder }) => {
        const folderSlug = slugify(folder.title);
        const noteSlug = slugify(note.title);
        res.redirect(301, `/${folderSlug}/${noteSlug}`);
    })
    .catch((error) => {
        res.render('error', { layout: 'main', error: error });
    });
});

// Slug-based folder route (must be after specific routes like /about, /search)
app.get('/:folderSlug', async (req, res) => {
    const folderSlug = req.params.folderSlug;
    const queryTag = req.query.tag;
    const page = parseInt(req.query.page, 10) || 1;
    const notesPerPage = 20;

    try {
        const folder = await getFolderBySlug(folderSlug);
        if (!folder) {
            return res.status(404).render('error', { layout: 'main', error: { message: 'Folder not found' } });
        }

        const folders = await getFolders();
        
        // Get all notes for tags and filtering (we still need all notes for tag filtering)
        const allNotes = await getNotes(folder.folder_id);
        const filteredNotesByTag = filterNotesByTag(allNotes, queryTag);
        
        // Calculate pagination
        const totalNotes = filteredNotesByTag.length;
        const totalPages = Math.max(1, Math.ceil(totalNotes / notesPerPage));
        const offset = (page - 1) * notesPerPage;
        
        // Get paginated notes
        const paginatedNotes = filteredNotesByTag.slice(offset, offset + notesPerPage);
        
        const pageTitle = queryTag ? `${folder.title} - ${queryTag}` : folder.title;

        // Add slugs to notes for linking
        const notesWithSlugs = paginatedNotes.map(n => ({ ...n, slug: slugify(n.title) }));

        // Build pagination info
        const pagination = {
            currentPage: page,
            totalPages: totalPages,
            totalNotes: totalNotes,
            notesPerPage: notesPerPage,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            pages: []
        };
        
        // Generate page numbers for pagination UI (show max 7 pages)
        if (totalPages > 0) {
            const maxPagesToShow = 7;
            let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
            let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
            
            if (endPage - startPage < maxPagesToShow - 1) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pagination.pages.push({
                    number: i,
                    isCurrent: i === page
                });
            }
        }

        res.render('notes', {
            layout: 'main',
            folders: folders,
            folder: { ...folder, slug: folderSlug },
            tags: getTagsFromNotes(allNotes),
            notes: groupNotesByMonth(notesWithSlugs),
            queryTag: queryTag,
            pagination: pagination,
            url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            // SEO
            pageTitle: pageTitle,
            canonicalUrl: queryTag ? `${siteUrl}/${folderSlug}?tag=${encodeURIComponent(queryTag)}` : `${siteUrl}/${folderSlug}`,
            metaKeywords: getTagsFromNotes(allNotes).join(', '),
            metaDescription: `Browse ${totalNotes} notes about ${folder.title}${queryTag ? ` tagged with ${queryTag}` : ''}`,
        });
    } catch (error) {
        res.render('error', { layout: 'main', error: error });
    }
});

// Slug-based note route
app.get('/:folderSlug/:noteSlug', async (req, res) => {
    const { folderSlug, noteSlug } = req.params;

    try {
        const folder = await getFolderBySlug(folderSlug);
        if (!folder) {
            return res.status(404).render('error', { layout: 'main', error: { message: 'Folder not found' } });
        }

        const note = await getNoteBySlug(folder.folder_id, noteSlug);
        if (!note) {
            return res.status(404).render('error', { layout: 'main', error: { message: 'Note not found' } });
        }

        const canonicalUrl = `${siteUrl}/${folderSlug}/${noteSlug}`;

        // JSON-LD structured data
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

        const noteArray = [note];
        res.render('note', {
            layout: 'main',
            sidebarSpace: true,
            folder: { ...folder, slug: folderSlug },
            tags: getTagsFromNotes(noteArray),
            notes: groupNotesByMonth(noteArray.map(n => ({ ...n, slug: noteSlug }))),
            queryTag: null,
            url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            // SEO
            pageTitle: note.title,
            canonicalUrl: canonicalUrl,
            metaKeywords: (note.tags || []).join(', '),
            metaDescription: createMetaDescription(
                folder.folder_id === articlesFolder
                    ? (note.body || '').split('---')[0]
                    : (note.link_excerpt || note.body)
            ),
            ogType: 'article',
            ogImage: note.link_image || null,
            structuredData: structuredData,
        });
    } catch (error) {
        res.render('error', { layout: 'main', error: error });
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
