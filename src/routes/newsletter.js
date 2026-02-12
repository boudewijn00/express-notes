const express = require('express');
const router = express.Router();
const { getFolders, getNotesFromPastWeek, getNotesFromPastMonth, articlesFolder } = require('../data');
const { getTagsFromNotes, groupNotesByDate } = require('../utils');
const { siteUrl } = require('../constants');

// Newsletter preview page
router.get('/newsletter', async (req, res) => {
    const period = req.query.period || 'week'; // 'week' or 'month'
    
    try {
        const [folders, notes] = await Promise.all([
            getFolders(),
            period === 'month' ? getNotesFromPastMonth() : getNotesFromPastWeek()
        ]);

        // Separate regular notes from articles
        const regularNotes = notes.filter(n => n.parent_id !== articlesFolder);
        const articleNotes = notes.filter(n => n.parent_id === articlesFolder);

        // Group notes by date for better organization
        const groupedNotes = groupNotesByDate(regularNotes);

        const periodText = period === 'month' ? 'Past Month' : 'Past Week';
        
        res.render('newsletter', {
            layout: 'main',
            folders: folders,
            notes: regularNotes,
            articleNotes: articleNotes,
            groupedNotes: groupedNotes,
            period: period,
            periodText: periodText,
            canonicalUrl: `${siteUrl}/newsletter`,
            metaKeywords: getTagsFromNotes(notes).join(', '),
            metaDescription: `Newsletter - Notes and articles from the ${periodText.toLowerCase()}`,
        });
    } catch (error) {
        res.render('error', {
            layout: 'main',
            error: error
        });
    }
});

module.exports = router;
