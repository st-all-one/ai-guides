import { Partial } from "fresh/runtime";
import { define } from "@/utils/define.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Admin Dashboard" />
        <title>Admin Dashboard</title>
        <script
          dangerouslySetInnerHTML={{
            __html:
              `document.documentElement.dataset.theme = localStorage.getItem("theme") || "light";`,
          }}
        />
      </head>
      <body class="bg-base-100 text-base-content min-h-screen" f-client-nav>
        <Partial name="body">
          <Component />
        </Partial>
      </body>
    </html>
  );
});
