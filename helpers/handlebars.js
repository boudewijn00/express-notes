module.exports = {
    isArticlesFolder: (folder) => folder.title === 'articles',
    isEqual: (arg1, arg2) => arg1 === arg2,
    showFolder: (folder) => folder.title !== 'articles',
    markdown: (content) => {        
        html = require('markdown-it')({
            html: true,
            linkify: true,
            typographer: true
          }).render(content);

        return html;
    },
    truncateWords: (str, maxWords) => {
        if (!str) return '';
        const words = str.split(' ');
        if (words.length > maxWords) {
            return words.slice(0, maxWords).join(' ') + '...';
        }
        return str;
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
                        const readMoreLink = ` <a href="/notes/${newNote.note_id}">Read more</a>`;
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
