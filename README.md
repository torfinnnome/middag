# Middag - Deployment Guide

Middag is a weekly dinner planner that helps you organize meals for the week. The application fetches meal ideas from an Excel file and generates a weekly meal plan based on your preferences.

Key features:
- Fetch meal data from an Excel file with category organization
- Filter meals by categories (fish, vegetarian, red meat, etc.)
- Generate weekly meal plans using random or weighted algorithms
- Lock specific days to preserve certain meals
- Drag-and-drop reordering of meals
- Manual editing (double-click any meal to change it)
- Copy the plan to clipboard for sharing
- Multi-language support (Norwegian, English, Spanish)

This guide describes how to deploy the application.

## Overview

The application consists of two components:
- `index.html` - A standalone web application (no build process required)
- `cors-proxy-worker.js` - A Cloudflare Worker that fetches your Excel file and adds CORS headers

The Worker serves two purposes:
1. Allows the application to fetch Excel files from any URL without CORS restrictions
2. Keeps your recipe file URL private (stored as a secret in Cloudflare)

## Prerequisites

- A Cloudflare account (free tier is sufficient)
- An Excel file (.xlsx) with your recipes, hosted somewhere publicly accessible
- Git and npm installed locally

## Deployment Steps

### Step 1: Deploy the CORS Proxy Worker

1. Login to Cloudflare:
   ```bash
   npx wrangler login
   ```

2. Deploy the worker:
   ```bash
   npx wrangler deploy cors-proxy-worker.js --config wrangler-proxy.toml
   ```

3. Note the Worker URL (it will show something like):
   ```
   https://middag-proxy.YOUR_SUBDOMAIN.workers.dev
   ```

4. Set your secret recipe URL:
   ```bash
   npx wrangler secret put DEFAULT_RECIPE_URL --config wrangler-proxy.toml
   ```

   When prompted, paste your Excel file URL (e.g., `https://example.com/your-recipes.xlsx`)

### Step 2: Update index.html

1. Open `index.html` and find line ~529:
   ```javascript
   const proxyUrl = 'https://middag-proxy.YOUR_SUBDOMAIN.workers.dev/';
   ```

2. Replace `YOUR_SUBDOMAIN` with your actual Cloudflare worker subdomain

### Step 3: Deploy the HTML

Choose one of these methods:

#### Option A: GitHub Pages
```bash
git add index.html cors-proxy-worker.js wrangler-proxy.toml
git commit -m "Add simple single-file version with CORS proxy"
git push
```

Then in GitHub:
- Go to Settings → Pages
- Source: Deploy from branch → main
- Your site will be at: `https://YOUR_USERNAME.github.io/middag/`

#### Option B: Cloudflare Pages
- Go to Cloudflare Dashboard → Pages
- Create new project
- Connect your GitHub repo or upload `index.html` directly
- Deploy the project

#### Option C: Any Static Host
Upload `index.html` to any web server.

### Step 4: Testing

1. Open your deployed site
2. Click "Load Meals" without entering a URL
3. The application should load your default (hidden) recipes
4. Users can still provide their own Excel URL if they want

## How It Works

```
User clicks "Load Meals"
         ↓
    (no URL entered)
         ↓
HTML calls → Worker (with no URL param)
         ↓
Worker uses → SECRET DEFAULT_RECIPE_URL
         ↓
Worker fetches Excel → Adds CORS headers
         ↓
Returns to HTML → Displays meals
```

Your recipe URL is never exposed in the HTML source code.

## Updating Your Recipe URL Later

```bash
npx wrangler secret put DEFAULT_RECIPE_URL --config wrangler-proxy.toml
```

Paste the new URL when prompted.

## Costs

- Worker: Free tier includes 100,000 requests per day
- Bandwidth: Free on Cloudflare's free tier
- Total: No cost for typical usage
