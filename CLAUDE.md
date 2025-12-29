# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Express.js web application for managing and displaying notes/bookmarks stored in a PostgreSQL database accessed via PostgREST API. It uses Handlebars for templating and Bulma (via SASS) for styling.

## Development Commands

### Running the Application
- `npm start` - Start the server in production mode
- `npm run dev` - Start with nodemon for auto-reload on file changes
- `npm run debug` - Start with Node.js inspector enabled for debugging

### CSS/Styling
- `npm run build:css` - Compile SASS to CSS once (compressed output)
- `npm run watch:css` - Watch and auto-compile SASS changes during development

The SASS source is in `src/sass/mystyles.scss` and compiles to `public/mystyles.css`.

## Architecture

### Application Structure

**Main entry point:** `src/index.js` - Single-file Express application with all routes and data access logic.

**Directory structure:**
```
src/
  ├── index.js          - Main application file
  ├── helpers/          - Handlebars helper functions
  │   └── handlebars.js
  ├── views/            - Handlebars templates
  │   ├── layouts/
  │   ├── partials/
  │   └── *.handlebars
  └── sass/             - SASS source files
public/                 - Static assets (compiled CSS, images)
```

**Key constants:**
- `homeArticle`: ID for the home page article (`36ec96bfba5b4c10838d684de6952d4c`)
- `articlesFolder`: ID for the articles folder (`b7bc7b8a876e4254ad9865f91ddc8f70`)

### Data Model

The application works with two main entity types from the PostgREST API:

1. **Notes** - Individual bookmarks/notes with:
   - `note_id` - Unique identifier
   - `title`, `body` - Content fields
   - `parent_id` - References folder (for organizing notes)
   - `tags` - Array of tag strings
   - `created_time` - Timestamp
   - `link_excerpt`, `link_favicon`, `link_image` - Metadata for bookmarked URLs
   - `link_excerpt_tsv` - Full-text search vector (PostgreSQL tsvector)
   - `hacker_news_id` - Optional Hacker News story ID (displays link to HN discussion)

2. **Folders** - Organization containers with:
   - `folder_id` - Unique identifier
   - `title` - Folder name

### Routes

- `GET /` - Home page: displays home article + folder navigation + recent notes
- `GET /folders/:id` - Notes in a specific folder, grouped by month, with optional tag filtering (`?tag=`)
- `GET /notes/:id` - Individual note view
- `GET /about` - Articles from the special articles folder
- `GET /search` - Full-text search using PostgreSQL tsquery (`?q=`)
- `GET /sitemap.xml` - Static sitemap file

### Key Functions

**Data fetching:**
- `getNotes(folderId)` - Fetch all notes in a folder
- `getNoteByNoteId(id)` - Fetch a specific note by ID
- `getRecentNotes()` - Fetch 5 most recent notes (excluding home article and articles folder)
- `getFolders()` - Fetch all folders
- `getFolder(id)` - Fetch a specific folder by ID
- `searchNotes(query)` - Full-text search across notes

**Data processing:**
- `replaceResourceTitleByImageTag(notes)` - Converts markdown image references to base64 embedded images by fetching from `/resources` endpoint
- `processLinkImages(notes)` - Filters out invalid link images (non-HTTP URLs)
- `groupNotesByMonth(notes)` - Groups notes by "YYYY Month" for display
- `groupNotesByDate(notes)` - Groups notes by ISO date
- `filterNotesByTag(notes, tag)` - Filters notes by tag
- `getTagsFromNotes(notes)` - Extracts unique tags from a note collection

### View Layer

**Handlebars setup:**
- Layout: `src/views/layouts/main.handlebars`
- Views: `src/views/*.handlebars`
- Partials: `src/views/partials/*.handlebars`
- Custom helpers: `src/helpers/handlebars.js`

**Custom Handlebars helpers:**
- `markdown(content)` - Renders markdown to HTML using markdown-it (with HTML, linkify, typographer enabled)
- `formatDate(date)` - Formats dates as "DD Month YYYY" (en-GB locale)
- `truncateWords(str, maxWords)` - Truncates string to word count with ellipsis
- `isArticlesFolder(folder)` - Checks if folder is the special "articles" folder
- `isEqual(arg1, arg2)` - Equality comparison
- `showFolder(folder)` - Returns true if folder should be shown in navigation (not "articles")
- `prepareAboutNotes(notes)` - Processes article notes, splitting on `---` delimiter and adding "Read more" links

**Key partials:**
- `bookmark.handlebars` - Displays individual bookmark with favicon, title, excerpt, tags
- `bookmarks.handlebars` - Collection of bookmarks
- `tags.handlebars` - Tag filter interface
- `articles.handlebars` - Article listing

### Environment Variables

Required in `.env`:
- `POSTGREST_HOST` - PostgREST API base URL
- `POSTGREST_TOKEN` - JWT token for PostgREST authentication
- `GEMINI_API_KEY` - (Currently unused in code)
- `OPENAI_API_KEY` - (Currently unused in code)

### Special Behavior

1. **Image embedding:** Notes can reference resources using markdown syntax `![filename.png](:/resourceId)`. These are automatically fetched from the `/resources` endpoint and embedded as base64 data URIs.

2. **Search:** Uses PostgreSQL full-text search via the `link_excerpt_tsv` tsvector column with `plfts(english)` operator.

3. **Articles folder:** Notes in the articles folder are treated specially - they're excluded from recent notes and have dedicated routing through `/about`.

4. **Tag filtering:** The `/folders/:id` route supports tag-based filtering while maintaining the full tag list for the UI.

5. **Month grouping:** Notes are typically grouped by month ("YYYY Month") for display rather than shown as flat lists.

6. **Hacker News integration:** When a note has a `hacker_news_id` field, a link to the Hacker News discussion is automatically displayed (format: `https://news.ycombinator.com/item?id={hacker_news_id}`).

## Development Notes

- Nodemon watches `.js`, `.html`, and `.handlebars` files (see `nodemon.json`)
- Static files served from `public/` directory
- All data access goes through PostgREST API with Bearer token authentication
- No test suite currently exists (`npm test` exits with error)
