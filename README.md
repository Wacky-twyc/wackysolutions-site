# !WackySolutions LLC — website

Static site. No build step, no framework, no dependencies to install.
Publishes on GitHub Pages straight from the repository.

- **Pages:** Home, About, Services, Contact, Privacy Policy (plus a 404)
- **Stack:** vanilla HTML/CSS/JS, Three.js (hero + scroll morph), GSAP ScrollTrigger
- **Highlight colour:** `#D4A017` — rgb(212, 160, 23)
- **Legal entity name used throughout:** `!WackySolutions LLC`

---

## Before you deploy — one thing left

The address and entity details are already filled in from the Georgia
Certificate of Organization:

- **Legal name:** `!WackySolutions LLC` (Georgia, Control No. 26170970)
- **Principal office:** 1870 The Exchange SE, Ste 220 #202767, Atlanta, GA 30339
- **Organized:** August 10, 2026

### Point the contact form somewhere

In `contact.html`, the form has `data-endpoint="REPLACE_WITH_FORM_ENDPOINT"`.

Until you replace it, the form falls back to opening the visitor's mail app with
everything pre-filled — so it is never a dead end, which matters during Apple's
review. To collect submissions properly, use a Cloudflare Worker (your account
already has a `workers.dev` subdomain) and paste the POST URL into that
attribute.

---

## Deploy

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<your-username>/wackysolutions-site.git
git push -u origin main
```

### Turn on GitHub Pages

1. Repo → **Settings** → **Pages**
2. **Source:** Deploy from a branch → `main` → `/ (root)` → **Save**
3. Under **Custom domain**, enter `wackysolutions.org` → **Save**
   (the `CNAME` file in this repo already contains it)
4. Wait for the DNS check to go green, then tick **Enforce HTTPS**

Every push to `main` republishes automatically.

> Free GitHub Pages publishes from **public** repositories. If you need the repo
> private, that requires a paid GitHub plan.

---

## DNS — five records, no transfer needed

Your domain stays registered with Microsoft. Your email stays exactly where it
is. You are only *adding* records, never changing the MX ones.

In the M365 admin center: **Settings → Domains → wackysolutions.org →
DNS records → + Add records**.

| Type  | Host / Name | Value                | Purpose      |
|-------|-------------|----------------------|--------------|
| A     | `@`         | `185.199.108.153`    | apex domain  |
| A     | `@`         | `185.199.109.153`    | apex domain  |
| A     | `@`         | `185.199.110.153`    | apex domain  |
| A     | `@`         | `185.199.111.153`    | apex domain  |
| CNAME | `www`       | `<username>.github.io` | www subdomain |

Replace `<username>` with your GitHub username or organization name.

**Order matters for the certificate.** Add all five records and let them
resolve *before* GitHub issues the TLS certificate. If the certificate is
generated while only one of apex or www is pointing correctly, it will not
cover the other one, and you will have to force a regeneration by removing and
re-adding the custom domain.

DNS changes can take up to 24 hours to propagate, though it is usually minutes.

**Do not touch these existing records:** `MX`, the SPF `TXT`, the DKIM
`CNAME`s (`selector1`, `selector2`), `autodiscover`, or the Teams `SRV`
records. Those keep `info@wackysolutions.org` working.

### Verify before you enroll with Apple

```bash
curl -I https://wackysolutions.org        # 200, and note the certificate
curl -I https://www.wackysolutions.org    # should reach the site too
```

Then send and receive a test email at `info@wackysolutions.org`.

---

## If you ever switch to Cloudflare Pages

Only relevant if you move hosting later. Cloudflare Pages attaches custom
domains by CNAME and cannot CNAME an apex record, so it requires the domain's
nameservers to be on Cloudflare — which means transferring the registration away
from Microsoft (they lock the nameservers on domains bought in the admin
center). That is a five-day ICANN wait plus recreating every mail record before
cutover, and getting the order wrong takes your email down.

GitHub Pages avoids all of it because A records work at the apex. There is no
reason to do the transfer unless you specifically want Cloudflare's edge
features.

If you do: move `cloudflare/_headers` and `cloudflare/_redirects` back to the
repository root first, then follow Microsoft's documented transfer flow
(Settings → Domains → Check health → Transfer domain).

---

## Apple organization verification checklist

Work through this before you start the enrollment.

**Sequencing:**

- [x] Georgia Certificate of Organization issued (08/11/2026)
- [x] EIN issued
- [ ] **Confirm the EIN name matches the Certificate.** The CP575A reads
      `WACKYSOLUTIONS LLC` with no leading `!`. The Georgia certificate reads
      `!WackySolutions LLC`. See the note below before you file anything else.
- [ ] D&B record created with the legal name and the Atlanta principal office
      address (1870 The Exchange SE, Ste 220 #202767)
- [ ] D-U-N-S issued
- [ ] Two further business days elapsed so D&B has reached Apple

**Website:**

- [ ] Live at `https://wackysolutions.org` with a working apex, not just `www`
- [ ] "Enforce HTTPS" is ticked in the repo's Pages settings
- [ ] Address placeholders filled and matching the D&B record exactly
- [ ] Phone and email visible on the Contact page and in every footer
- [ ] Legal entity name `!WackySolutions LLC` in the footer of every page
- [ ] Privacy Policy reachable at a stable URL (you will need this again for
      App Store Connect)
- [ ] Contact form either posts somewhere real or falls back to mail — never a
      silent failure
- [ ] Every page loads on a phone; no broken links; no placeholder text anywhere
- [ ] `info@wackysolutions.org` sends and receives (Apple may email it)

**Enrollment:**

- [ ] Enrol as Company/Organization, never Individual
- [ ] Enter the legal entity name exactly as on the D&B record
- [ ] You are the owner/founder with authority to bind the company
- [ ] Government photo ID ready

---

## The hero animation

The dot of the `!` is a filament bulb. It flickers on, falls, bursts on impact,
and the fragments swarm inward to assemble `WackySolutions`. On scroll, the same
particles re-form twice more: into an app wireframe, then into a phone.

It is one WebGL context and one particle system; all the morphing happens in a
vertex shader, so it stays cheap on a phone. Particle count drops from 7,000 to
3,200 on narrow screens.

**It degrades on purpose.** If WebGL is unavailable, or the visitor has
"Reduce Motion" turned on, the canvas never initialises and the HTML wordmark
stays visible as ordinary styled text. The page is fully readable and navigable
with JavaScript disabled entirely — every word of content is in the HTML.

To change the animation timing, edit `INTRO_MS` in `assets/js/stage.js`.

---

## File map

```
index.html          Home — hero + scroll journey
about.html          Company story
services.html       Three service areas, engagement levels, quote CTA
contact.html        NAP block + form
privacy.html        Privacy Policy
404.html            Not found
assets/css/main.css Design tokens and all styling
assets/js/stage.js  Three.js particle system (ES module)
assets/js/site.js   Nav, reveals, ScrollTrigger, form
assets/img/         favicon
CNAME               Tells GitHub Pages which domain serves this repo
.nojekyll           Serves files as-is, no Jekyll processing
cloudflare/         Unused config, kept in case you switch hosts
robots.txt          Allows everything, points to the sitemap
sitemap.xml         Five pages
site.webmanifest    PWA metadata
fill-address.sh     Placeholder filler
```

---

## Notes

- The Privacy Policy is a solid working draft, not legal advice. Have a lawyer
  read it before launch, particularly if you start collecting anything beyond
  contact-form submissions.
- Copy on the Services page deliberately avoids naming a build timeline. If you
  want to advertise a specific turnaround, add it — just make sure it is one you
  will hit every time, because it becomes a promise.
- Three.js and GSAP load from public CDNs. If you would rather not depend on
  them, download both into `assets/js/vendor/` and update the paths in
  `index.html`.
