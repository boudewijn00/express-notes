const express = require('express');
const app = express();
app.use(express.json());

const folders = [
    { folder_id: 'folder1', title: 'Web Development' },
    { folder_id: 'folder2', title: 'Databases' },
    { folder_id: 'folder3', title: 'APIs' },
    { folder_id: 'b7bc7b8a876e4254ad9865f91ddc8f70', title: 'Articles' }
];

app.get('/notes', (req, res) => {
    const noteId = req.query['note_id'];
    if (noteId && noteId.includes('36ec96bfba5b4c10838d684de6952d4c')) {
        return res.json([{
            note_id: '36ec96bfba5b4c10838d684de6952d4c',
            title: 'Welcome',
            body: 'Test',
            tags: [],
            created_time: new Date().toISOString()
        }]);
    }
    const parentId = req.query['parent_id'];
    if (parentId && parentId.includes('b7bc7b8a876e4254ad9865f91ddc8f70')) {
        return res.json([]);
    }
    res.json([]);
});

app.get('/folders', (req, res) => {
    res.json(folders);
});

app.post('/subscribers', (req, res) => {
    console.log('Subscriber data received:', req.body);
    res.status(201).json({ id: Date.now(), ...req.body });
});

app.listen(3001, () => {
    console.log('Mock PostgREST API listening at http://localhost:3001');
});
