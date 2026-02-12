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
    // Create plain text by removing HTML tags and markdown
    // Remove all angle brackets to ensure no HTML remains
    let clean = text.replace(/<[^>]*>/g, ' ');  // Replace tags with space
    clean = clean.replace(/[<>]/g, '');  // Remove any remaining angle brackets
    clean = clean.replace(/[#*_`\[\]]/g, '');  // Remove markdown syntax
    clean = clean.replace(/\s+/g, ' ').trim();  // Normalize whitespace
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
