# Orion Powers — Portfolio Site

A single-page animated portfolio. Pure static site — HTML, CSS, and JavaScript. No build step, no framework install, no server-side code.

## Files

- `index.html` — the whole page (markup + styles + animation logic)
- `support.js` — the tiny runtime that renders the page (loads React/Babel from a public CDN at runtime)
- `image-slot.js` — the drag-and-drop image placeholder component used in the Work section
- `images/` — photos, seals, and project thumbnails
- `documents/` — the résumé PDF

## Run it locally

Because the page fetches sibling files, open it through a local web server (not by double-clicking the file).

```bash
cd github-export
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, VS Code Live Server, etc.).

## Host it on GitHub Pages

### Option A — GitHub website (no command line)

1. Create a new repository on github.com.
2. Click **Add file → Upload files** and drag in everything from this folder (`index.html`, `support.js`, `image-slot.js`, and the `images/` and `documents/` folders).
3. Commit.
4. Go to **Settings → Pages**.
5. Under **Build and deployment → Source**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and **Save**.
6. Wait ~1 minute. Your site is live at `https://<your-username>.github.io/<repo-name>/`.

### Option B — command line

```bash
cd github-export
git init
git add .
git commit -m "Portfolio site"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then enable Pages in **Settings → Pages** as in step 4–6 above.

## Custom domain (optional)

In **Settings → Pages → Custom domain**, enter your domain and add the DNS records GitHub shows you. GitHub provisions HTTPS automatically.

## Notes

- An internet connection is required on first load — React and Babel are pulled from `unpkg.com`.
- Images dropped into the image slots are stored in the visitor's browser only; to ship fixed project screenshots, replace the slots with `<img>` tags pointing at files in `images/`.
- To edit content, open `index.html` in any text editor. Text and layout live in the markup near the top; the data arrays (projects, etc.) are in the `<script data-dc-script>` block near the bottom.
