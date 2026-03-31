# Converting a Basic HTML Website to GitHub Pages

This guide explains how to convert a standard HTML website into a GitHub Pages-compatible site using Jekyll, with clean URLs (no `.html` extensions).

---

## Table of Contents

1. [Required Files](#1-required-files)
2. [Understanding `_config.yml`](#2-understanding-_configyml)
3. [Adding Jekyll Front Matter](#3-adding-jekyll-front-matter)
4. [Fixing Asset Paths with `{{ site.baseurl }}`](#4-fixing-asset-paths-with--sitebaseurl-)
5. [Navigation Links](#5-navigation-links)
6. [Inline Styles with Background Images](#6-inline-styles-with-background-images)
7. [CSS Files with Asset References](#7-css-files-with-asset-references)
8. [SVG `<use>` References](#8-svg-use-references)
9. [Quick Checklist](#9-quick-checklist)

---

## 1. Required Files

Before deploying to GitHub Pages, add these files to your project root:

### `_config.yml`

The Jekyll configuration file (explained in detail below).

### `Gemfile`

```ruby
source "https://rubygems.org"

gem "github-pages", group: :jekyll_plugins
```

### `.gitignore`

```
_site/
.sass-cache/
.jekyll-cache/
.jekyll-metadata
Gemfile.lock
node_modules/
.DS_Store
Thumbs.db
```

---

## 2. Understanding `_config.yml`

The `_config.yml` file is the heart of your Jekyll configuration. Here's what each setting does:

```yaml
# Jekyll configuration for GitHub Pages

title: OMG Entertainment Group
description: Transform Every Event Into an Unforgettable Experience
url: ""          # Your GitHub Pages URL, e.g. https://username.github.io
baseurl: ""      # Subpath, e.g. "/repo-name" if hosted at username.github.io/repo-name

# Clean URLs - removes .html extension
permalink: pretty

# Exclude files from the build
exclude:
  - Gemfile
  - Gemfile.lock
  - README.md
  - node_modules
  - .gitignore
```

### Key Settings Explained

| Setting | Purpose |
|---|---|
| `title` | The site title, accessible via `{{ site.title }}` in templates |
| `description` | Site description, accessible via `{{ site.description }}` |
| `url` | The full base URL of your site (e.g., `https://username.github.io`) |
| `baseurl` | The subpath if the site is hosted under a repository name (e.g., `/my-repo`). Leave empty (`""`) if the site is at the root |
| `permalink: pretty` | Converts `page.html` → `/page/` (clean URLs without `.html`) |
| `exclude` | List of files/folders Jekyll should NOT process or include in the final site |

> **Important:** If your site is hosted at `https://username.github.io/repo-name/`, you **must** set `baseurl: "/repo-name"`. If hosted at `https://username.github.io/` (root), leave it as `baseurl: ""`.

---

## 3. Adding Jekyll Front Matter

Every HTML file **must** have Jekyll front matter at the very top. This tells Jekyll to process the file through its template engine (Liquid), which is required for `{{ site.baseurl }}` to work.

```yaml
---
layout: null
title: Page Title
permalink: /page-name/
---
```

### Example

**Before (plain HTML):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Contact Us</title>
</head>
```

**After (GitHub Pages ready):**
```html
---
layout: null
title: Contact Us
permalink: /contacts/
---
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Contact Us</title>
</head>
```

### Front Matter Fields

| Field | Purpose |
|---|---|
| `layout: null` | Tells Jekyll not to wrap this page in a layout template (use your own full HTML) |
| `title` | Page title metadata |
| `permalink` | The clean URL path for this page (e.g., `/contacts/` makes the page accessible at `yoursite.com/contacts/`) |

---

## 4. Fixing Asset Paths with `{{ site.baseurl }}`

This is the **most important change**. All paths to assets (CSS, JS, images, fonts, icons) must be prefixed with `{{ site.baseurl }}` so they resolve correctly regardless of where the site is hosted.

### CSS and JS File Links

**Before:**
```html
<link rel="stylesheet" href="assets/css/styles.css">
<script src="assets/js/custom.js"></script>
```

**After:**
```html
<link rel="stylesheet" href="{{ site.baseurl }}/assets/css/styles.css">
<script src="{{ site.baseurl }}/assets/js/custom.js"></script>
```

### Image `src` Attributes

**Before:**
```html
<img src="assets/images/logo.png" alt="Logo">
```

**After:**
```html
<img src="{{ site.baseurl }}/assets/images/logo.png" alt="Logo">
```

---

## 5. Navigation Links

Internal page links should use the clean URL format (with trailing slash) to match the `permalink: pretty` setting. Use `{{ site.baseurl }}` as a prefix for all internal links.

**Before:**
```html
<li><a href="contacts.html">Training</a></li>
<li><a href="join-team.html">Join Team</a></li>
```

**After:**
```html
<li><a href="{{ site.baseurl }}/contacts/">Training</a></li>
<li><a href="{{ site.baseurl }}/join-team/">Join Team</a></li>
```

> **Note:** The trailing slash (`/contacts/`) is important — it matches Jekyll's pretty permalink format.

---

## 6. Inline Styles with Background Images

Background images set via inline `style` attributes also need `{{ site.baseurl }}`.

**Before:**
```html
<footer style="background: url('assets/images/footer-bg.jpg') no-repeat; background-size: cover;">
```

**After:**
```html
<footer style="background: url('{{ site.baseurl }}/assets/images/footer-bg.jpg') no-repeat; background-size: cover;">
```

### More Examples

```html
<!-- Hero section background -->
<div class="single-slide" style="background: url('{{ site.baseurl }}/assets/images/hero-bg-1.jpg') no-repeat; background-size: cover;">

<!-- Section background -->
<section class="our-impact-section" style="background: url('{{ site.baseurl }}/assets/images/our-impact-bg.jpg') no-repeat; background-size: cover;">
```

---

## 7. CSS Files with Asset References

CSS files that reference assets (images, fonts, etc.) via `url()` also need `{{ site.baseurl }}`. For Jekyll to process a CSS file and replace Liquid tags, the CSS file **must also have front matter** at the top (empty front matter is fine):

```css
---
---
/* Now Jekyll will process {{ site.baseurl }} in this file */

header .navbar-default {
  background-image: url('{{ site.baseurl }}/assets/images/header-texture.png');
}

footer .bottom-block {
  background: url('{{ site.baseurl }}/assets/images/header-texture.png');
}
```

> **Important:** Without the `---` front matter block at the top of the CSS file, Jekyll will treat it as a static file and `{{ site.baseurl }}` will appear as literal text instead of being replaced with the actual path.

### Alternative: Use Relative Paths in CSS

If you prefer not to add front matter to CSS files, you can use **relative paths** instead. Paths in CSS are resolved relative to the CSS file's location, not the HTML page. So if your CSS is at `assets/css/styles.css`, you can reference images like:

```css
/* This works without {{ site.baseurl }} because it's relative to the CSS file */
background-image: url('../images/header-texture.png');
```

This approach works well for CSS-to-asset references but **does not** help with HTML files.

---

## 8. SVG `<use>` References

SVG sprites loaded via `<use href>` also need the baseurl prefix:

**Before:**
```html
<svg class="srdev-icon"><use href="assets/icons.svg#start-icon"></use></svg>
```

**After:**
```html
<svg class="srdev-icon">
    <use href="{{ site.baseurl }}/assets/icons.svg#start-icon"></use>
</svg>
```

---

## 9. Quick Checklist

Use this checklist when converting each HTML file:

- [ ] Add Jekyll front matter (`---` block) at the top of the file
- [ ] Set the `permalink` to the desired clean URL
- [ ] Prefix all `<link>` stylesheet `href` with `{{ site.baseurl }}`
- [ ] Prefix all `<script>` `src` with `{{ site.baseurl }}`
- [ ] Prefix all `<img>` `src` with `{{ site.baseurl }}`
- [ ] Prefix all `<a>` navigation `href` with `{{ site.baseurl }}` and use trailing slashes
- [ ] Prefix all inline `style="background: url(...)"` image paths with `{{ site.baseurl }}`
- [ ] Prefix all SVG `<use href="...">` with `{{ site.baseurl }}`
- [ ] If CSS files reference assets, either:
  - Add front matter and use `{{ site.baseurl }}` in `url()`, OR
  - Use relative paths (e.g., `../images/filename.png`)

---

## Project Structure

```
project-root/
├── _config.yml          # Jekyll configuration
├── Gemfile              # Ruby dependencies for GitHub Pages
├── .gitignore           # Git ignore rules
├── index.html           # Home page (with front matter)
├── contacts.html        # Contact page (with front matter)
├── join-team.html       # Join team page (with front matter)
├── event-manager.html   # Event manager page (with front matter)
└── assets/
    ├── css/
    │   ├── base.css
    │   ├── styles.css
    │   └── responsive.css
    ├── js/
    ├── images/
    ├── fonts/
    └── fontawesome-6/
```
