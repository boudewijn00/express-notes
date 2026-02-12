const axios = require('axios');
const { slugify } = require('./utils');

const homeArticle = '36ec96bfba5b4c10838d684de6952d4c';
const articlesFolder = 'b7bc7b8a876e4254ad9865f91ddc8f70';

const config = {
    headers: {
        'Authorization': process.env.POSTGREST_TOKEN,
    }
};

function replaceResourceTitleByImageTag(notes) {
    const promises = notes.map(async (note) => {
        note.body = note.body || '';
        const regex = /!\[([^\]]+\.(png|jpg|jpeg))\]\(:\/([a-f0-9]+)\)/g;
        const matches = [...note.body.matchAll(regex)];

        const responses = await Promise.all(
            matches.map(matched =>
                axios.get(`${process.env.POSTGREST_HOST}/resources?title=eq.${matched[1]}`, config)
            )
        );

        matches.forEach((matched, idx) => {
            if (responses[idx].data && responses[idx].data[0] && responses[idx].data[0].contents) {
                note.body = note.body.replace(matched[0], `<img src="data:image/png;base64,${responses[idx].data[0].contents}" />`);
            }
        });

        return note;
    });

    return Promise.all(promises);
}

function processLinkImages(notes) {
    return notes.map(note => {
        if (note.link_image && !note.link_image.startsWith('http')) {
            note.link_image = null;
        }
        return note;
    });
}

const getNotes = async (folderId) => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?select=*&parent_id=eq.${folderId}&order=created_time.desc&note_id=neq.${homeArticle}`, config);

    return replaceResourceTitleByImageTag(response.data).then(results => {
        return processLinkImages(results);
    });
};

const getRecentNotes = async () => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?select=*&order=created_time.desc&limit=5&note_id=neq.${homeArticle}&parent_id=neq.${articlesFolder}`, config);

    const [notes, folders] = await Promise.all([
        replaceResourceTitleByImageTag(response.data).then(processLinkImages),
        getFolders(),
    ]);

    const folderMap = Object.fromEntries(folders.map(f => [f.folder_id, f]));
    return notes.map(note => {
        note.folder = folderMap[note.parent_id];
        return note;
    });
};

const getFolders = async () => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/folders?order=title`, config);
    
    return response.data;
};

const getFolder = async (id) => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/folders?folder_id=eq.${id}`, config);

    return response.data[0];
};

// Find folder by slug
const getFolderBySlug = async (slug) => {
    const folders = await getFolders();
    return folders.find(f => slugify(f.title) === slug);
};

// Find note by slug within a folder
const getNoteBySlug = async (folderId, slug) => {
    const notes = await getNotes(folderId);
    return notes.find(n => slugify(n.title) === slug);
};

const getNoteByNoteId = async (id) => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?select=*&note_id=eq.${id}`, config);

    return replaceResourceTitleByImageTag(response.data).then(notes => processLinkImages(notes));
};

const searchNotes = async (query) => {
    const response = await axios.get(`${process.env.POSTGREST_HOST}/notes?select=*&link_excerpt_tsv=plfts(english).${query}&order=created_time.desc`, config);

    const notes = processLinkImages(response.data);
    return Promise.all(notes.map(async note => {
        note.folder = await getFolder(note.parent_id);
        return note;
    }));
};

module.exports = {
    homeArticle,
    articlesFolder,
    getNotes,
    getRecentNotes,
    getFolders,
    getFolder,
    getFolderBySlug,
    getNoteBySlug,
    getNoteByNoteId,
    searchNotes
};
