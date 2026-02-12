const express = require('express');
const router = express.Router();
const { searchNotes } = require('../data');
const { getTagsFromNotes } = require('../utils');
const { siteUrl } = require('../constants');

router.get('/search', (req, res) => {
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

module.exports = router;
