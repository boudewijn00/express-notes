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
    // Strip HTML tags and markdown - remove all tags first, then clean markdown
    let clean = text.replace(/<[^>]*>/g, '');  // Remove all HTML tags
    clean = clean.replace(/<script[^>]*>.*?<\/script>/gi, '');  // Extra safety: remove any script tags
    clean = clean.replace(/[#*_`\[\]]/g, '').trim();  // Remove markdown syntax
    if (clean.length <= maxLength) return clean;
    return clean.substring(0, maxLength - 3).trim() + '...';
};

const getTagsFromNotes = (notes) => {
    const result = notes.flatMap((note) => {
        return note.tags;
    });

    return [...new Set(result)];
};

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

module.exports = {
    slugify,
    createMetaDescription,
    getTagsFromNotes,
    groupNotesByDate,
    groupNotesByMonth,
    filterNotesByTag
};
