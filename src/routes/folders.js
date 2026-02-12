const express = require('express');
const router = express.Router();
const { getFolders, getNotes, getFolderBySlug } = require('../data');
const { filterNotesByTag, getTagsFromNotes, groupNotesByMonth, slugify } = require('../utils');
const { siteUrl } = require('../constants');

// Slug-based folder route (must be after specific routes like /about, /search)
router.get('/:folderSlug', async (req, res) => {
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

module.exports = router;
