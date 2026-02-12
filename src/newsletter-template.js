const { siteUrl } = require('./constants');
const { slugify } = require('./utils');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true
});

/**
 * Generate HTML email content for newsletter
 * @param {Array} notes - Array of notes to include
 * @param {Array} articleNotes - Array of article notes
 * @param {string} period - 'week' or 'month'
 */
function generateNewsletterHTML(notes, articleNotes, period) {
    const periodText = period === 'month' ? 'Past Month' : 'Past Week';
    
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #363636;
            font-size: 28px;
            margin-bottom: 10px;
        }
        h2 {
            color: #363636;
            font-size: 22px;
            margin-top: 30px;
            margin-bottom: 15px;
            border-bottom: 2px solid #3273dc;
            padding-bottom: 5px;
        }
        .note {
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e0e0e0;
        }
        .note:last-child {
            border-bottom: none;
        }
        .note-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .note-title a {
            color: #3273dc;
            text-decoration: none;
        }
        .note-title a:hover {
            text-decoration: underline;
        }
        .note-excerpt {
            color: #4a4a4a;
            margin-bottom: 8px;
        }
        .note-meta {
            font-size: 14px;
            color: #7a7a7a;
            margin-top: 8px;
        }
        .tags {
            margin-top: 8px;
        }
        .tag {
            display: inline-block;
            background-color: #f5f5f5;
            color: #4a4a4a;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 12px;
            margin-right: 5px;
            margin-bottom: 5px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            font-size: 12px;
            color: #7a7a7a;
        }
        .footer a {
            color: #3273dc;
            text-decoration: none;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        .no-notes {
            text-align: center;
            color: #7a7a7a;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📧 Newsletter - ${periodText}</h1>
        <p style="color: #7a7a7a; margin-bottom: 20px;">Here are the latest notes and articles</p>
`;

    // Add articles section
    if (articleNotes && articleNotes.length > 0) {
        html += `
        <h2>📝 Articles</h2>
`;
        articleNotes.forEach(note => {
            html += generateNoteHTML(note);
        });
    }

    // Add regular notes section
    if (notes && notes.length > 0) {
        html += `
        <h2>🔖 Bookmarks & Notes (${notes.length})</h2>
`;
        notes.forEach(note => {
            html += generateNoteHTML(note);
        });
    } else {
        html += `
        <div class="no-notes">No notes found for the ${periodText.toLowerCase()}.</div>
`;
    }

    html += `
        <div class="footer">
            <p>View this newsletter online: <a href="${siteUrl}/newsletter?period=${period}">${siteUrl}/newsletter</a></p>
            <p>This is an automated newsletter. To unsubscribe, please contact the administrator.</p>
        </div>
    </div>
</body>
</html>
`;

    return html;
}

/**
 * Generate HTML for a single note
 * @param {Object} note - Note object
 */
function generateNoteHTML(note) {
    const noteSlug = slugify(note.title);
    const folderSlug = note.folder ? slugify(note.folder.title) : '';
    const noteUrl = folderSlug ? `${siteUrl}/${folderSlug}/${noteSlug}` : `${siteUrl}/notes/${note.note_id}`;
    
    let html = `
        <div class="note">
            <div class="note-title">
                <a href="${noteUrl}">${escapeHtml(note.title)}</a>
            </div>
`;

    if (note.link_excerpt) {
        html += `
            <div class="note-excerpt">${escapeHtml(note.link_excerpt)}</div>
`;
    }

    if (note.body && !note.link_excerpt) {
        // For articles, render markdown but truncate
        const plainText = note.body.replace(/<[^>]*>/g, '').replace(/[#*_`\[\]]/g, '');
        const truncated = plainText.length > 300 ? plainText.substring(0, 300) + '...' : plainText;
        html += `
            <div class="note-excerpt">${escapeHtml(truncated)}</div>
`;
    }

    const date = new Date(note.created_time);
    const formattedDate = date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });

    html += `
            <div class="note-meta">
                📅 ${formattedDate}`;
    
    if (note.folder) {
        html += ` | 📁 ${escapeHtml(note.folder.title)}`;
    }
    
    html += `
            </div>
`;

    if (note.tags && note.tags.length > 0) {
        html += `
            <div class="tags">
`;
        note.tags.forEach(tag => {
            html += `<span class="tag">${escapeHtml(tag)}</span>`;
        });
        html += `
            </div>
`;
    }

    html += `
        </div>
`;

    return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

module.exports = {
    generateNewsletterHTML
};
