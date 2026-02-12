const md = require('markdown-it')({
    html: true,
    linkify: true,
    typographer: true
});

// Generate URL-friendly slug from text
const slugify = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 80);
};

module.exports = {
    slugify: slugify,
    isArticlesFolder: (folder) => folder.title === 'articles',
    isEqual: (arg1, arg2) => arg1 === arg2,
    showFolder: (folder) => folder.title !== 'articles',
    or: (...args) => {
        // Remove the last argument (Handlebars options object)
        args.pop();
        return args.some(arg => !!arg);
    },
    // Helper to check if a topic is selected in the form data
    isSelected: (selectedTopics, topicTitle) => {
        if (!selectedTopics) return false;
        if (Array.isArray(selectedTopics)) {
            return selectedTopics.includes(topicTitle);
        }
        return selectedTopics === topicTitle;
    },
    // Helper to check if a frequency option should be selected
    isFrequencySelected: (formFrequency, optionValue, defaultValue) => {
        // If formFrequency is not set, check if this is the default
        if (!formFrequency || formFrequency === '') {
            return optionValue === defaultValue;
        }
        return formFrequency === optionValue;
    },
    markdown: (content) => {
        return md.render(content);
    },
    truncateWords: (str, maxWords) => {
        if (!str) return '';
        const words = str.split(' ');
        if (words.length > maxWords) {
            return words.slice(0, maxWords).join(' ') + '...';
        }
        return str;
    },
    formatDate: (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    prepareAboutNotes: (notes) => {
        if (!notes) return {};

        const newNotesByMonth = {};
        for (const month in notes) {
            newNotesByMonth[month] = notes[month].map(note => {
                const newNote = {...note};
                if (newNote.body) {
                    const parts = newNote.body.split('---');
                    if (parts.length > 1) {
                        // Use slug-based URL: /articles/note-title-slug
                        const noteSlug = slugify(newNote.title);
                        const readMoreLink = ` <a href="/articles/${noteSlug}">Read more</a>`;
                        newNote.body = parts[0].trim() + readMoreLink;
                    } else {
                        newNote.body = parts[0];
                    }
                }

                if (newNote.body) {
                    newNote.body = newNote.body.replace(/\\/g, '');
                }

                return newNote;
            });
        }
        return newNotesByMonth;
    }
}
