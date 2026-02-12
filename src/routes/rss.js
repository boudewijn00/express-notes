const express = require('express');
const router = express.Router();
const { getRecentNotes, getNotes, articlesFolder, homeArticle } = require('../data');
const { slugify, createMetaDescription } = require('../utils');
const { siteUrl } = require('../constants');

// RSS 2.0 feed
router.get('/rss.xml', async (req, res) => {
    try {
        // Get recent notes (5 most recent)
        const recentNotes = await getRecentNotes();
        
        // Get articles
        const articleNotes = await getNotes(articlesFolder);
        const filteredArticles = articleNotes.filter(n => n.note_id !== homeArticle);
        
        // Combine recent notes and articles, sort by date, limit to 20 items
        const allItems = [...recentNotes, ...filteredArticles]
            .sort((a, b) => new Date(b.created_time) - new Date(a.created_time))
            .slice(0, 20);

        const now = new Date();
        const buildDate = now.toUTCString();

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Notes - Hello Data</title>
    <link>${siteUrl}</link>
    <description>Web development notes and bookmarks about PHP, Laravel, Node.js, APIs, databases, and more</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
`;

        for (const note of allItems) {
            // Determine the URL for the note
            let noteUrl;
            if (note.parent_id === articlesFolder) {
                // Article
                const noteSlug = slugify(note.title);
                noteUrl = `${siteUrl}/articles/${noteSlug}`;
            } else if (note.folder) {
                // Regular note with folder info
                const folderSlug = slugify(note.folder.title);
                const noteSlug = slugify(note.title);
                noteUrl = `${siteUrl}/${folderSlug}/${noteSlug}`;
            } else {
                // Skip if we can't determine the URL
                continue;
            }

            // Create description from note content
            let description = '';
            if (note.link_excerpt) {
                description = escapeXml(createMetaDescription(note.link_excerpt, 500) || '');
            } else if (note.body) {
                description = escapeXml(createMetaDescription(note.body, 500) || '');
            }

            const title = escapeXml(note.title);
            const pubDate = new Date(note.created_time).toUTCString();

            xml += `
    <item>
      <title>${title}</title>
      <link>${noteUrl}</link>
      <guid>${noteUrl}</guid>
      <pubDate>${pubDate}</pubDate>`;

            if (description) {
                xml += `
      <description>${description}</description>`;
            }

            if (note.tags && note.tags.length > 0) {
                for (const tag of note.tags) {
                    xml += `
      <category>${escapeXml(tag)}</category>`;
                }
            }

            xml += `
    </item>`;
        }

        xml += `
  </channel>
</rss>`;

        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Error generating RSS feed:', error);
        res.status(500).send('Error generating RSS feed');
    }
});

// Helper function to escape XML special characters
function escapeXml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

module.exports = router;
