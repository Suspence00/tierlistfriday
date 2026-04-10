<div align="center">

# 🏆 Tier List Friday

**Create beautiful tier lists and share them instantly.**

Build a topic, generate a link, and let your group rank everything from S to F.  
One-click image downloads and optional Discord integration — zero sign-ups, zero cost.

🌐 **Try it out live at [https://tlf.sensei.lol](https://tlf.sensei.lol)**

[How it works](#how-it-works) · [Features](#features) · [Tech Stack](#tech-stack) · [FAQ](#faq)

</div>

---

## What is this?

Tier List Friday is a free, open-source tier list maker built for groups. One person creates a topic (like "Fast Food Chains" or "Marvel Movies"), generates a **magic link**, and shares it. Everyone clicks the link, drags items into S/A/B/C/D/F tiers, and either downloads their tier list as an image or posts it directly to a Discord channel.

No accounts. No servers. No cost. Just vibes and hot takes.

---

## How It Works

### The Magic Link

Everything runs through a single sharable URL. When the organizer creates a topic, all the data — topic name, items, and optional webhook — gets compressed and encoded into the URL itself. That means:

- **No backend.** It's a static site. Nothing is stored on a server.
- **No database.** The URL *is* the data.
- **No sign-ups.** Click the link = ready to rank.

The link looks like:
```
https://tlf.sensei.lol/#data=N4IgLg9gJgpgTgYQ...
```

Under the hood, the topic data is compressed with [LZ-String](https://pieroxy.net/blog/pages/lz-string/index.html) and encoded as a URL fragment (`#`). The fragment never even hits the hosting server — it stays entirely in the browser.

### For the Organizer

<table>
<tr>
<td width="50">
<h3>01</h3>
</td>
<td>
<strong>Discord Webhook</strong> <em>(Optional)</em><br>
Right-click your Discord channel → Edit Channel → Integrations → Webhooks → New Webhook → Copy URL.<br>
Paste it in. It saves to your browser's local storage so you only do this once. Skip this step entirely if you don't want Discord integration.
</td>
</tr>
<tr>
<td>
<h3>02</h3>
</td>
<td>
<strong>Topic</strong><br>
Enter what everyone is ranking. "Fast Food Chains", "Horror Movies", "Programming Languages" — whatever you want.
</td>
</tr>
<tr>
<td>
<h3>03</h3>
</td>
<td>
<strong>Items</strong><br>
Add the things to rank. You can add them one at a time (with automatic Wikipedia image searching), paste a bulk list, or even upload a full CSV with names & image URLs. Items can be reordered by dragging.
</td>
</tr>
<tr>
<td>
<h3>04</h3>
</td>
<td>
<strong>Generate Link</strong><br>
Click the button. The link is auto-copied to your clipboard. Share it wherever — Discord, group chat, email, carrier pigeon.<br>
You can also click <strong>"Open Tier List"</strong> to jump straight into ranking yourself.
</td>
</tr>
</table>

### For Participants

1. **Click the link** — the tier list loads instantly with the topic and items ready to go.
2. **Enter your name** — it starts blank every time, so there's no confusion about who's ranking.
3. **Drag items into tiers** — S (best) through F (worst). Smooth drag-and-drop powered by [SortableJS](https://sortablejs.github.io/Sortable/) and an accessible Tap-to-Move feature for mobile touchscreen users.
4. **Add custom items** — see something missing? Hit "+ Add Custom Item" and throw it in.
5. **Share your results:**
   - 💾 **Download Image** — saves a PNG of your completed tier list with your name, the topic, and branding. Always available.
   - 🚀 **Share to Discord** — posts the image directly to the Discord channel via webhook. Only appears if the organizer set up a webhook.

---

## Features

| Feature | Details |
|---------|---------|
| 🖱️ Drag & Drop | Smooth, animated ranking with touch support (mobile-friendly) |
| 📸 Image Export | Generates a clean PNG tier list image with branding |
| 💬 Discord Integration | Optional one-click posting via webhooks — no bot needed |
| 🔗 Magic Links | All data encoded in the URL — no server, no database |
| ➕ Custom Items | Participants can add their own items to the ranking |
| 📋 Bulk Add | Paste a list of items, or upload a CSV file with names & URLs |
| 🔍 Image Search | Automatically fetch image URLs from Wikipedia when adding items |
| 👆 Tap-to-Move | Accessible mobile tiering: tap an item, then tap a destination row |
| 🎊 Confetti | Because sharing your tier list deserves a celebration |
| 📱 Responsive | Works on desktop, tablet, and phone |
| 🔒 Privacy | Webhook URL is obfuscated in the link, name is never stored remotely |

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Structure | HTML5 | Semantic, accessible markup |
| Styling | Vanilla CSS | Custom design system with CSS variables |
| Logic | Vanilla JS (ES Modules) | Zero framework dependencies |
| Drag & Drop | [SortableJS](https://sortablejs.github.io/Sortable/) | Smooth, cross-platform drag and drop |
| Image Generation | [html2canvas](https://html2canvas.hertzen.com/) | Captures the tier list as a PNG |
| URL Compression | [LZ-String](https://pieroxy.net/blog/pages/lz-string/index.html) | Compresses data for URL encoding |
| Celebrations | [canvas-confetti](https://www.kirilv.com/canvas-confetti/) | Confetti burst on share/download |
| Typography | [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) + [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | Bold, editorial feel |

All dependencies are loaded via CDN — no `npm install`, no build step, no `node_modules`.

---

## Project Structure

```
tierlistfriday/
├── index.html              # Single-page app with both views
├── css/
│   └── style.css           # Design system and all styles
├── js/
│   ├── app.js              # Entry point — routes between views
│   ├── organizer.js        # Topic builder, webhook setup, link generator
│   ├── tierlist.js         # Drag-and-drop tier ranking
│   ├── share.js            # Image generation, download, Discord posting
│   └── utils.js            # URL encoding/decoding, DOM helpers, toasts
└── README.md
```

### How the views work

The app has two views in the same HTML file, toggled by JavaScript:

- **No hash in URL** → **Organizer View** (build topics, add items, generate links)
- **`#data=...` in URL** → **Participant View** (drag-and-drop tier list)

This means deploying a single `index.html` is all you need.

---

## FAQ

### Is the webhook URL safe in the shared link?

It's compressed and Base64-encoded — not human-readable, but not encrypted either. Anyone with the link could theoretically extract it. Since you're typically sharing the link with the same people who have access to the Discord channel, this is a non-issue. If someone abuses it, just delete the webhook in Discord and create a new one (takes 10 seconds).

### How many items can I add?

There's no hard limit, but URLs have a practical length limit around 2,000 characters in most browsers. With text-only items, you can comfortably fit 30-50+ items. Adding image URLs (which are long) will reduce this. If you hit the limit, the link generation will still work but the URL may not be pasteable in some apps.

### Does it work on mobile?

Yes. SortableJS handles touch events, and the CSS is fully responsive. The tier labels shrink on small screens and items resize to fit.

### Can I use this without Discord?

Absolutely. Leave the webhook field blank and everyone can still download their tier list as an image. Share the images in any group chat, social media, or print them out and tape them to your fridge.

### Can multiple people use the same link?

Yes! That's the whole point. Everyone who opens the link gets their own fresh tier list to fill out. Each person's ranking is independent — there's no shared state.

### Where is my data stored?

Nowhere remotely. The topic data is in the URL. Your webhook URL and display name are in your browser's local storage. The generated tier list image exists only in your browser until you download or share it. Nothing touches a server (except the Discord webhook POST when you hit "Share").

---

## License

MIT — do whatever you want with it.

---

<div align="center">

**Built for Tier List Friday.** 🏆

*Because someone had to settle the fast food debate once and for all.*

</div>
