const express = require('express');
const router = express.Router();
const { getFolderBySlug, getNoteBySlug, articlesFolder } = require('../data');
const { getTagsFromNotes, groupNotesByMonth, createMetaDescription } = require('../utils');
const { siteUrl } = require('../constants');

// Slug-based note route
router.get('/:folderSlug/:noteSlug', async (req, res) => {
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

module.exports = router;
