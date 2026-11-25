#!/usr/bin/env bash
# يبني النسخة المبسّطة للطلاب (موقع ثابت دون خادم: بلا معلم ذكي ولا لوحة معلم) في مجلد static-site/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
tar -C "$ROOT" --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./static-site -cf - . | tar -C "$WORK" -xf -
ln -s "$ROOT/node_modules" "$WORK/node_modules"
# إزالة أجزاء الخادم
rm -rf "$WORK/src/app/api" "$WORK/src/app/admin" "$WORK/src/middleware.ts"
(cd "$WORK" && STATIC_EXPORT=1 NEXT_TELEMETRY_DISABLED=1 npx next build)
rm -rf "$ROOT/static-site"
cp -r "$WORK/out" "$ROOT/static-site"
echo "تم: النسخة المبسّطة في $ROOT/static-site"
