module.exports = {
    isArticlesFolder: (folder) => folder.title === 'articles',
    isEqual: (arg1, arg2) => arg1 === arg2,
    showFolder: () => true,
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
    }
}
