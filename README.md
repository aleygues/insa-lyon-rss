# INSA Lyon RSS

A simple RSS feed generator that scrapes the latest news from INSA Lyon's website.

## Features

- Scrapes news from [INSA Lyon Actualites](https://www.insa-lyon.fr/fr/actualites)
- Serves a valid RSS 2.0 feed with news items including:
  - Title
  - Description
  - Publication date
  - Image enclosure
- In-memory caching with stale-while-revalidate strategy for optimal performance

## Cache Strategy

- **Cache TTL**: 20 minutes
- **Stale threshold**: 15 minutes
- **Behavior**:
  - First 15 minutes: Serve from cache (fast)
  - Between 15-20 minutes: Serve stale cache immediately, refresh in background
  - After 20 minutes: Fetch fresh data (cache expired)

This ensures fast responses while keeping the feed relatively up-to-date.

## Usage

### Development

```bash
# Install dependencies
npm install

# Run the server
npm run dev

# Or build and run
npm run build
node dist/index.js
```

The server will start on http://localhost:3000

### Docker

```bash
# Build and run with Docker Compose
docker compose up --build

# Or run with Docker
docker build -t insa-lyon-rss .
docker run -p 3000:3000 insa-lyon-rss
```

## API

### GET /

Returns the RSS feed in XML format.

**Response**: `application/rss+xml`

## Project Structure

```
.
├── src/
│   ├── index.ts      # Express server
│   ├── scrap.ts      # HTML scraping logic
│   └── cache.ts      # In-memory cache with stale-while-revalidate
├── package.json
├── tsconfig.json
├── Dockerfile
└── compose.yml
```
