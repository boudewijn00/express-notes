const express = require('express');
const router = express.Router();
const { getNotes, homeArticle, articlesFolder } = require('../data');
const { groupNotesByMonth, getTagsFromNotes } = require('../utils');
const { siteUrl } = require('../constants');

router.get('/about', (req, res) => {
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

module.exports = router;
