const express = require('express');
const router = express.Router();
const { getFolders, getNoteByNoteId, getRecentNotes, getNotes, homeArticle, articlesFolder } = require('../data');
const { slugify, getTagsFromNotes, createMetaDescription } = require('../utils');
const { siteUrl } = require('../constants');

router.get('/', (req, res) => {
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

module.exports = router;
