# Cloudflare Pages config (not used by GitHub Pages)

If you ever move hosting to Cloudflare Pages, move `_headers` and `_redirects`
back to the repository root. They set security headers, asset caching, the
www -> apex redirect, and extensionless URLs.

GitHub Pages ignores both files, which is why they live here instead.
