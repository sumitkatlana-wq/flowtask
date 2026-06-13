# FlowTask — Deploy Guide

## Option 1: GitHub Pages (Recommended — Free Forever)

1. Go to https://github.com/new and create a new repository named `flowtask`
2. Upload all files from this folder to the repo (drag-and-drop on GitHub web UI, or use git)
3. Go to **Settings → Pages → Source → Deploy from branch → main → / (root)**
4. Your app is live at: `https://yourusername.github.io/flowtask`
5. Open that URL on your phone/desktop → click **Install** or **Add to Home Screen**

## Option 2: Vercel (Instant, 30 seconds)

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New Project** → Import your GitHub repo
3. Click **Deploy** — done. Gets a URL like `flowtask.vercel.app`

## Option 3: Local (for testing only)

```bash
# In this folder, run:
npx serve .
# Then open http://localhost:3000
```

---

## After Deploying

- Open the URL in **Chrome on desktop** → look for the install icon (⊕) in the address bar → click **Install**
- Open the URL in **Chrome on Android** → tap the banner or Menu → **Add to Home Screen**
- Open in **Safari on iPhone** → tap Share → **Add to Home Screen**

---

## ClickUp Setup

1. Go to **Settings** in FlowTask
2. Get your ClickUp API token: https://app.clickup.com/settings/apps
3. Paste it in Settings → ClickUp API token
4. Click **Test & sync ClickUp** — tasks will import automatically

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space / Q | Quick capture |
| F | Focus mode |
| N | New project |
| 1-5 | Navigate views |
| Esc | Close panels |
