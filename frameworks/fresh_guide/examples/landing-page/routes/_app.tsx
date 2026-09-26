import { Partial } from "fresh/runtime";
import { define } from "@/utils/define.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="en" data-theme="corporate">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ShipFast — Build Faster</title>
        <meta
          name="description"
          content="The all-in-one developer platform that helps you ship faster. Deploy globally, scale effortlessly, and build with confidence."
        />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="ShipFast — Build Faster" />
        <meta
          property="og:description"
          content="The all-in-one developer platform that helps you ship faster. Deploy globally, scale effortlessly."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ShipFast — Build Faster" />
        <meta
          name="twitter:description"
          content="The all-in-one developer platform that helps you ship faster."
        />
        <meta name="twitter:image" content="/og-image.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="stylesheet" href="/styles.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) { document.documentElement.style.setProperty('--motion-ok', '0'); }} catch(e) {}`,
          }}
        />
      </head>
      <body
        f-client-nav
        f-view-transition
        style="--motion-ok: 1"
      >
        <Partial name="app">
          <Component />
        </Partial>
      </body>
    </html>
  );
});
