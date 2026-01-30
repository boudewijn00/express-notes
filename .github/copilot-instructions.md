# Express Notes - AI Agent Instructions

## Architecture Overview

Single-file Express.js app ([src/index.js](../src/index.js)) that displays notes/bookmarks from a PostgreSQL database via PostgREST API. Uses Handlebars templating and Bulma CSS framework.

**Key IDs (hardcoded in [src/index.js](../src/index.js)):**
- `homeArticle`: `36ec96bfba5b4c10838d684de6952d4c` - Home page content
- `articlesFolder`: `b7bc7b8a876e4254ad9865f91ddc8f70` - Special "About" section

## Development Workflow

- **Run dev server:** `npm run dev` (nodemon auto-reloads on changes)
- **Debug mode:** `npm run debug` (enables Node inspector)
- **Build CSS:** `npm run build:css` (compiles SASS once)
- **Watch CSS:** `npm run watch:css` (auto-compile during development)

SASS source: [src/sass/mystyles.scss](../src/sass/mystyles.scss) → [public/mystyles.css](../public/mystyles.css)

## Environment Setup

Requires `.env` file with:
- `POSTGREST_HOST` - PostgREST API endpoint
- `POSTGREST_TOKEN` - Bearer token for API authentication

## Data Model Patterns

**Notes structure:**
- Images: Markdown `![file.png](:/resourceId)` → converted to base64 embedded images via `replaceResourceTitleByImageTag()`
- `link_excerpt_tsv` - PostgreSQL full-text search vector (tsvector type)
- `hacker_news_id` - When present, shows link to HN discussion
- `tags` - Array of strings for categorization

**Data flow:** All API calls use axios with auth headers → process images → filter invalid URLs

## Handlebars Conventions

Custom helpers in [src/helpers/handlebars.js](../src/helpers/handlebars.js):
- `markdown(content)` - Renders markdown-it with HTML/linkify/typographer enabled
- `prepareAboutNotes(notes)` - Splits body on `---` delimiter, inserts "Read more" links
- `truncateWords(str, maxWords)` - Truncates with ellipsis
- `formatDate(date)` - British format (day month year)
- `isArticlesFolder()`, `showFolder()` - Hide "articles" folder from navigation

## Route-Specific Behavior

- `/` - Combines home article + folder list + 5 recent notes (excludes articlesFolder)
- `/folders/:id?tag=` - Groups notes by month, filters by tag if query param present
- `/notes/:id` - Individual note with breadcrumb (fetches parent folder)
- `/about` - Shows notes from articlesFolder, uses `prepareAboutNotes()` helper
- `/search?q=` - PostgreSQL tsquery full-text search on `link_excerpt_tsv` field

## Styling Approach

Bulma CSS via SASS with custom color palettes for light/dark themes:
- Theme toggle implemented in [public/theme.js](../public/theme.js)
- Color variables: `$purple`, `$pink`, `$brown`, `$beige-*` (light) and `*-dark` variants
- Dark mode: `[data-theme="dark"]` attribute on root element
- Custom styles after Bulma import for theme-specific overrides

## Common Patterns

**Grouping notes:**
```javascript
groupNotesByMonth(notes) // "2024 January" format
groupNotesByDate(notes)  // ISO date keys
```

**Filtering:**
```javascript
filterNotesByTag(notes, tag) // Returns all if tag is falsy
```

**Error handling:** All routes catch errors → render `error.handlebars` view
