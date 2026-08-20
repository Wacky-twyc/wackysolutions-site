# !WackySolutions LLC — website

Static, no build step. Five pages plus a 404. Drop the folder in a repo and turn on GitHub Pages.

```
index.html          Home
about.html          About
services.html       Services
contact.html        Contact (enquiry form)
privacy.html        Privacy Policy
404.html            Not found — GitHub Pages serves this automatically
assets/css/site.css All styling. Tokens are in the :root block at the top.
assets/js/site.js   Mobile nav, scroll reveal, contact form
assets/favicon.svg
.nojekyll           Stops Jekyll from touching the files
robots.txt
```

## Preview locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Publish on GitHub Pages

1. Push these files to the repository root on the `main` branch.
2. Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. For a custom domain, add a `CNAME` file containing `wackysolutions.org` and point the DNS at GitHub Pages.

## Wire up the contact form

GitHub Pages serves static files only, so the form posts to Formspree. It is already wired up, on `contact.html`:

```html
<form id="contact-form" data-endpoint="https://formspree.io/f/mkjwqozg" ...>
```

The form sends JSON to that URL and only checks whether the response status is a success, so any form backend would work if you ever switch:

```json
{ "name": "", "email": "", "phone": "", "stage": "", "message": "", "_subject": "" }
```

A failed submission shows Formspree's own error message (`{"errors": [{"field", "code", "message"}]}`) where there is one, and falls back to the phone number where there is not.

Emptying `data-endpoint` makes the form open the visitor's mail app with the message pre-filled instead. Useful for local testing, since submissions from a `file://` page have no origin and Formspree rejects them.

A `company_website` honeypot field is stripped client-side before sending. If you later run your own endpoint, reject any submission that still contains it.

In the Formspree dashboard: confirm the notification address by submitting once, check whether reCAPTCHA is enabled (it interferes with AJAX submissions), and restrict the form to your domain — the endpoint is visible in the page source.

## Design system

Every colour, typeface and layout width is a custom property in `:root` at the top of `site.css`. Changing `--paper`, `--ink` and `--accent` reskins the whole site.

- **Ground** — flat light grey (`--paper` `#E4E4E1`), two lighter steps for panels. No gradients, no shadows, square corners.
- **Accent** — one gold, in two values. `--accent` `#D4A017` is the bright mark: the giant `!`, button fills, the meter bars, the rail asterisk, hover rules. `--accent-text` `#7E5B07` is the same hue darkened for anything set as text — links, highlighted headline words, list bullets, the small tags. Bright gold sits at roughly 1.9:1 against the ground, which is unreadable at text sizes, so text uses the darker value and reaches about 4.9:1. Buttons use ink text on gold rather than white. `--error` `#A32014` is functional only, for a failed form submission.
- **Type** — Bodoni Moda for the oversized page mark and pull quotes; Archivo (variable width) condensed and uppercase for headlines, labels and navigation; Archivo at normal width for body copy.
- **Structure** — section names sit in the left margin column (`.split-label`) and act as the index. That is the replacement for numbered headers.

### The page mark

Each page ends its hero with one oversized serif word bleeding off the bottom edge: `!WACKY`, `ABOUT`, `SERVICES`, `CONTACT`, `PRIVACY`, `404`. `site.js` measures the word and sets the font size so it spans the row exactly, then seats it on the bottom edge using the font's own metrics — so it stays flush whichever font actually loads. The `--mark-size` value in the markup is only the pre-JS fallback. Add `data-fit-max="380"` to cap the size on short words (the 404 uses this).

To change a page's word, edit the `mark=` value and let the script handle the rest.

## Editing

The header, footer and rail markup are repeated in each page rather than pulled from a template, because GitHub Pages serves these files with no build step. When you change navigation or footer content, change it in all six HTML files — worth telling Claude Code explicitly so it doesn't stop after the first one.

## Before launch

- Confirm the registered address and the formation state on `about.html` and in every footer.
- Have counsel review `privacy.html`. It describes a site with no analytics and no cookies — if you add either, update that page first.
- Add an OG image and `og:` meta tags if the site will be shared on social.
