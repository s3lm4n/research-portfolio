# Personal Research Portfolio Website

Static research portfolio for Selman Ali Dokumaci, documenting independent research in computational biophysics, molecular dynamics simulation, free energy calculations, and condition-responsive macromolecular therapeutic design.

## Tech Stack

- **HTML5**: Semantic, accessible markup conforming to modern web standards.
- **Tailwind CSS**: Delivered via official CDN for utility-first styling and rapid responsiveness.
- **Inter Font**: Hosted via Google Fonts for clean, contemporary academic typography.
- **Vanilla JavaScript**: Lightweight interactions (navigation toggles, metadata configuration) with zero external frameworks or runtime dependencies.

## Viewing Locally

To view the portfolio locally, simply open `index.html` in any modern web browser:

```bash
# Option 1: Direct file open
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows

# Option 2: Local HTTP server (recommended for testing asset paths)
python3 -m http.server 8000
# Then navigate to http://localhost:8000 in your browser
```

## File Structure

```
portfolio_website/
├── index.html          # Main portfolio homepage (bio, research overview, reports, inventions, contact)
├── macs-project.html   # Detailed research dossier for the MACS therapeutic design project
├── 404.html            # Error page matching the portfolio minimalist aesthetic
├── robots.txt          # Search engine crawler instructions and sitemap reference
├── sitemap.xml         # XML sitemap indicating page priorities and modification timestamps
└── README.md           # Project documentation and maintenance guide
```

Relative media paths reference scientific figures located in the `../MACS_clean/` directory hierarchy.

## Configuration

Site metadata and personal contact details are managed via the `siteConfig` JavaScript object declared in the `<head>` of `index.html`:

```javascript
const siteConfig = {
    name: 'Selman Ali Dokumaci',
    title: 'Independent Computational Biophysics Researcher',
    description: 'Research portfolio documenting computational biophysics, molecular dynamics, and condition-responsive therapeutic design.',
    email: '[email placeholder]',
    year: 2026
};
```

Update this object to reflect new roles, updated contact information, or copyright years.

## Adding a New Project

To add a new research project to the portfolio:

1. **Create the Project Page**: Duplicate `macs-project.html` as a template (e.g., `new-project.html`). Update the page metadata, executive summary, methodology, structural validation figures, and results tables.
2. **Add Project Card to Homepage**: In `index.html`, locate the `#projects` section and insert a new project card element linked to the new HTML page (`new-project.html`).
3. **Update Sitemap**: Open `sitemap.xml` and insert a new `<url>` block:
   ```xml
   <url>
     <loc>/new-project.html</loc>
     <lastmod>YYYY-MM-DD</lastmod>
     <priority>0.8</priority>
   </url>
   ```

## Adding a New Report

To publish a new technical report or publication:

1. **Update Project Dossier**: In the relevant project file (e.g., `macs-project.html`), locate the reports section and add a new entry containing the report title, date, key metrics, and links to source documents or artifacts.
2. **Update Homepage Reports**: In `index.html`, navigate to the `Publications & Reports` section (`#reports`) and add a corresponding entry to ensure cross-page discoverability.

## Deployment Options

This portfolio consists entirely of static files and can be hosted without backend build pipelines:

- **GitHub Pages**:
  1. Commit and push the repository to GitHub.
  2. In your repository settings, go to `Pages`.
  3. Under `Build and deployment`, set the source branch to `main` (or appropriate branch) and the directory to `/` or the website root.
- **Netlify**:
  - Drag and drop the `portfolio_website` directory into the Netlify manual deploy dashboard, or connect to your Git repository with build command left blank and publish directory set to `./`.
- **Cloudflare Pages / Vercel / AWS S3**:
  - Deploy directly as a static site with no build command required.

## Privacy Note

No analytics, cookies, tracking scripts, or third-party tracking services are included by default. External requests are limited to Google Fonts and the Tailwind CSS CDN at load time.
