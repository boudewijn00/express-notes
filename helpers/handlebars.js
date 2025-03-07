module.exports = {
    isArticlesFolder: function (folder) {
        return folder.title === 'articles';
    },
    isEqual: function (arg1, arg2) {
        return arg1 === arg2;
    },
    showFolder: function (title) {
        return title === 'backend' 
        || title === 'soft skills'
        || title === 'frontend' 
        || title === 'misc' 
        || title === 'hardware'
        || title === 'data'
        || title === 'architecture'
        || title === 'artificial intelligence'
        || title === 'devops';
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