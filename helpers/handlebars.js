module.exports = {
    isBookmarksFolder: function(folder){
        return folder.title === 'bookmarks';
    },
    isArticlesFolder: function(folder){
        return folder.title === 'articles';
    },
    showFolder: function(title){
        return title === 'bookmarks' || title === 'articles';
    }
}