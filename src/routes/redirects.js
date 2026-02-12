const express = require('express');
const router = express.Router();
const { getFolder, getNoteByNoteId, homeArticle } = require('../data');
const { slugify } = require('../utils');

// Redirect old folder URLs to new slug-based URLs
router.get('/folders/:id', (req, res) => {
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

// Redirect old note URLs to new slug-based URLs
router.get('/notes/:id', (req, res) => {
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

module.exports = router;
