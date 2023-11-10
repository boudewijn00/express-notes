module.exports = {
    isBookmarksFolder: function (folder) {
        return folder.title !== 'articles';
    },
    isArticlesFolder: function (folder) {
        return folder.title === 'articles';
    },
    isEqual: function (arg1, arg2) {
        return arg1 === arg2;
    },
    showFolder: function (title) {
        return title === 'backend' || title === 'frontend' || title === 'misc' || title === 'articles';
    },
    markdown: function (content) {        
        html = require('markdown-it')({
            html: true,
            linkify: true,
            typographer: true
          }).render(content);

        return html;
    }
}