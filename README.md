# Orion Powers — Engineering Portfolio

**A responsive personal portfolio with an Orion constellation theme, custom motion, and experience-first navigation.**

[Live portfolio](https://orionpowers.com) · [GitHub Pages preview](https://p-orion.github.io/Space-Resume-Site/) · [LinkedIn](https://www.linkedin.com/in/orion-powers/)

This site presents my software engineering experience, applied AI projects, education, and hardware prototypes. Its visual system combines gold accents, a deep-space background, animated sections, and detailed project and experience views.

## Engineering highlights

- Custom scrolling and animation logic for the hero, experience, education, and projects.
- Responsive layouts with dedicated narrow-screen interaction handling.
- Semantic HTML content, project imagery, professional links, and resume download.
- Static deployment through GitHub Pages and Vercel.

## Architecture

The deployable site lives in **`Home page animation redesign/github-export/`**. HTML, inline CSS, and custom JavaScript define the page; a generated support runtime loads React/Babel from a CDN. There is **no local application build step or backend**.

| Path | Purpose |
| --- | --- |
| [`index.html`](Home%20page%20animation%20redesign/github-export/index.html) | Page content, styles, and animation logic |
| `support.js` | Generated rendering runtime; not edited directly |
| `image-slot.js` | Image placeholder component |
| `images/` | Photos, project images, and visual assets |
| `documents/` | Downloadable resume |
| [`docs/SITE-GUIDE.md`](docs/SITE-GUIDE.md) | Site structure and editing reference |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Change history |

Paths in the middle four rows are relative to the deployable folder.

## Run locally

From the repository root:

```bash
cd "Home page animation redesign/github-export"
python -m http.server 8080
```

Open **http://localhost:8080**. On Windows, `py -m http.server 8080` works with the Python launcher. Serve the files over HTTP rather than opening `index.html` directly. The first load needs internet access for CDN dependencies and fonts.

## Deploy

- **GitHub Pages:** [The existing workflow](.github/workflows/deploy-pages.yml) publishes the deployable folder when changes reach `main`.
- **Vercel:** [`vercel.json`](vercel.json) selects the same folder as static output and disables framework/build detection.

## Validation and maintenance

Preview changes in a browser, check desktop and mobile navigation, and verify section links, project images, and the resume download. Read [`AGENTS.md`](AGENTS.md) and [`CLAUDE.md`](CLAUDE.md) before making changes. Record edits in the changelog; update the site guide when structure changes.

**Orion Powers** · [Portfolio](https://orionpowers.com) · [Contact](mailto:orionthanhpowers@gmail.com)
