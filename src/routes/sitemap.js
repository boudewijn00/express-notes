const express = require('express');
const router = express.Router();
const { getFolders, getNotes, homeArticle, articlesFolder } = require('../data');
const { slugify } = require('../utils');
const { siteUrl } = require('../constants');

// Dynamic sitemap generation
router.get('/sitemap.xml', async (req, res) => {
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

module.exports = router;
