#!/usr/bin/env bash
# Fills the address placeholders across every page in one pass.
#
#   ./fill-address.sh "1234 Peachtree St NE, Suite 500" "30309"
#
# Use the exact street address and ZIP that you gave Dun & Bradstreet.
# Apple compares the website, the D&B record, and your enrollment form.

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 \"<street address>\" \"<zip>\"" >&2
  exit 1
fi

STREET="$1"
ZIP="$2"

# macOS and GNU sed disagree about -i, so write through a temp file.
for f in *.html; do
  tmp="$(mktemp)"
  sed -e "s|\[\[STREET_ADDRESS\]\]|${STREET}|g" \
      -e "s|\[\[ZIP\]\]|${ZIP}|g" "$f" > "$tmp"
  mv "$tmp" "$f"
  echo "updated $f"
done

echo
remaining=$(grep -l '\[\[' ./*.html 2>/dev/null || true)
if [ -n "$remaining" ]; then
  echo "Still has placeholders: $remaining"
  exit 1
fi
echo "Done. No placeholders left."
