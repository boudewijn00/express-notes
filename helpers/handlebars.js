module.exports = {
    isArticlesFolder: (folder) => folder.title === 'articles',
    isEqual: (arg1, arg2) => arg1 === arg2,
    showFolder: (title) => title === 'backend' 
        || title === 'soft skills'
        || title === 'frontend' 
        || title === 'misc' 
        || title === 'hardware'
        || title === 'data'
        || title === 'devops'
        || title === 'software'
        || title === 'documentation'
        || title === 'architecture'
        || title === 'artificial intelligence',
    markdown: (content) => {        
        html = require('markdown-it')({
            html: true,
            linkify: true,
            typographer: true
          }).render(content);

        return html;
    }
}