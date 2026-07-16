// OpenAPI JSON は実行時ルート /openapi.json を参照する。ログイン必須（proxy の Clerk 保護対象）。
// Stoplight Elements は CDN 版（web-components.min.js）を Web Component として埋め込んで描画する。
// メジャーバージョン固定（未固定の latest は破壊的変更・供給網リスクがあるため）。
const html = `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>EvalHub API リファレンス</title>
    <script src="https://unpkg.com/@stoplight/elements@9/web-components.min.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements@9/styles.min.css" />
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <elements-api apiDescriptionUrl="/openapi.json" router="hash" layout="sidebar"></elements-api>
  </body>
</html>`;

export function GET() {
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
