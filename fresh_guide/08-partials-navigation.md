# 08 — Partials & Navigation

## 1. Enabling Partials

In `_app.tsx` — wrap with `<Partial>` + add `f-client-nav` on `<body>`:

```tsx
import { Partial } from "fresh/runtime";

export default define.page(function App({ Component }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body f-client-nav>
        <Partial name="body">
          <Component />
        </Partial>
      </body>
    </html>
  );
});
```

- `f-client-nav` — enables partial navigation for the element and all descendants
- `<Partial name="...">` — marks a content region; `name` MUST be unique per response
- On `<a>` click: Fresh fetches the new page via `fetch`, extracts matching `<Partial name="...">` blocks from the HTML, and swaps them into the DOM (no full page reload)

Nested partials — only the innermost *matching* partials are swapped. Outer partials with the same name on the current page are left alone.

---

## 2. Optimized Partial Routes

Use `f-partial` on links/forms to point to a lightweight endpoint that returns *only* the partial markup (no `<html>`, `<head>`, `<body>` wrapper):

```tsx
<a href="/docs/page1" f-partial="/partials/docs/page1">Page 1</a>
```

| Attribute   | Purpose |
|-------------|---------|
| `href`      | Browser URL the user navigates to (address bar) |
| `f-partial` | Lightweight endpoint returning ONLY `<Partial>` markup |

The optimized route:

```tsx
// routes/partials/docs/[id].tsx
import { define, type RouteConfig } from "@fresh/server";
import { Partial } from "fresh/runtime";

export const config: RouteConfig = {
  skipAppWrapper: true,        // Skip _app.tsx wrapping
  skipInheritedLayouts: true,  // Skip _layout.tsx files
};

export default define.page(async (ctx) => {
  const content = await loadContent(ctx.params.id);
  return (
    <Partial name="docs-content">
      {content}
    </Partial>
  );
});
```

Without `f-partial`, Fresh fetches the full page HTML and extracts partials from it (wastes bandwidth). With `f-partial`, the response is just the partial(s) — no wrapper overhead.

---

## 3. Replacement Modes

Three modes on `<Partial>`:

| Mode      | Behavior                                    | Requires `key` |
|-----------|---------------------------------------------|----------------|
| `replace` | **Default** — swap entire partial content   | No             |
| `prepend` | Insert new content *before* existing        | **Yes**        |
| `append`  | Insert new content *after* existing         | **Yes**        |

```tsx
// REPLACE (default)
<Partial name="profile">
  <p>New profile data</p>
</Partial>

// APPEND with key
<Partial name="logs-list" mode="append" key={lines[0]}>
  {lines.map((line) => <li key={line}>{line}</li>)}
</Partial>

// PREPEND with key
<Partial name="notifications" mode="prepend" key={newNotif.id}>
  <Notification {...newNotif} />
</Partial>
```

Keys prevent re-inserting the same content on multiple navigations. Fresh tracks which `key` values have already been applied.

---

## 4. Multiple Partials in One Response

Return several `<Partial>` blocks from a single endpoint — Fresh updates all matching names on the page atomically:

```tsx
export default function AddToCartPartial({ newItem, totalPrice }) {
  return (
    <>
      <Partial name="cart-items" mode="append" key={newItem.id}>
        <li class="cart-item">
          <span>{newItem.name}</span>
          <span>{newItem.price} €</span>
        </li>
      </Partial>
      <Partial name="total-price">
        <p class="font-bold">Total: {totalPrice} €</p>
      </Partial>
    </>
  );
}
```

All partials in the response are processed in a single DOM update pass.

---

## 5. View Transitions

Enable smooth page-to-page animations with zero JS animation code:

```tsx
<body f-client-nav f-view-transition>
```

Uses the browser [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) — progressive enhancement (unsupported browsers = no animation, navigation still works).

**Browser support:** Chrome 111+, Edge 111+, Safari 18+

### Global transition CSS

```css
::view-transition-old(root) {
  animation: fade-out 0.2s ease-in;
}
::view-transition-new(root) {
  animation: fade-out 0.2s ease-out reverse;
}

@keyframes fade-out {
  to { opacity: 0; }
}
```

### Per-element transitions

Give elements a `view-transition-name`:

```css
.sidebar {
  view-transition-name: sidebar;
}
.main-content {
  view-transition-name: content;
}

::view-transition-old(content) {
  animation: slide-out-left 0.3s ease-in;
}
::view-transition-new(content) {
  animation: slide-in-right 0.3s ease-out;
}

@keyframes slide-out-left {
  to { transform: translateX(-100%); opacity: 0; }
}
@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
}
```

**Constraints:**
- `view-transition-name` must be **unique** on the page at any given moment
- Only one old/new pair animates per name
- Overflow elements may clip during animation — use `overflow: visible` on parent if needed

**Opting out:** Add `style="view-transition-name: none"` on elements you want to exclude from transitions.

---

## 6. Loading Indicators

Hook into `_freshIndicator` — a property on `<a>`, `<button>`, or `<form>` elements. Assign a Preact `Signal<boolean>`; Fresh sets it to `true` while the partial fetch is in-flight, `false` when done.

### Links

```tsx
import { useSignal } from "@preact/signals";

function NavLink() {
  const loading = useSignal(false);
  return (
    <a
      href="/next-page"
      f-partial="/partials/next-page"
      ref={(el) => {
        if (el) el._freshIndicator = loading;
      }}
    >
      {loading.value ? "Loading..." : "Go"}
    </a>
  );
}
```

### Forms

```tsx
function MyForm() {
  const saving = useSignal(false);
  return (
    <form action="/save" f-partial="/partials/save" method="POST">
      <input name="title" />
      <button
        type="submit"
        ref={(el) => {
          if (el) el._freshIndicator = saving;
        }}
      >
        {saving.value ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

### Global loading bar

Use a persistent signal in the app shell:

```tsx
// _app.tsx — global indicator
import { signal } from "@preact/signals";

export const globalLoading = signal(false);

export default define.page(function App({ Component }) {
  return (
    <html>
      <head>...</head>
      <body f-client-nav>
        <div class="loading-bar" data-loading={globalLoading.value} />
        <Partial name="body">
          <Component />
        </Partial>
      </body>
    </html>
  );
});
```

Set `el._freshIndicator = globalLoading` on every `<a>` / `<button>` that triggers navigation.

---

## 7. BYPASSING / DISABLING PARTIALS

### Per-element

```tsx
<a href="/docs/page1" f-client-nav={false}>No partials</a>
```

### Per-subtree

```tsx
<div f-client-nav={false}>
  <a href="/docs/page1">No partials here</a>
  <a href="/docs/page2">Still no partials</a>
</div>
```

**Resolution algorithm:** Fresh walks from the clicked `<a>` up through ancestors. The first element with a truthy `f-client-nav` wins. `f-client-nav={false}` explicitly disables partials for that element and all children — useful for external links, logout buttons, or areas where full navigation is desired.

---

## 8. `isPartial` — Server-Side Detection

Fresh passes `isPartial` in `PageProps` — `true` when the request came from a partial fetch, `false` for regular page loads.

```tsx
import { define } from "@fresh/server";
import type { PageProps } from "fresh";

export default define.page(function DocsPage({ isPartial }: PageProps) {
  return (
    <div>
      {!isPartial && <HeavySidebar />}   {/* Skip on partial requests */}
      <MainContent />
    </div>
  );
});
```

Use to:
- Skip rendering heavy layout/components that haven't changed
- Return different markup for partial vs. full requests
- Avoid re-initializing state that persists across navigations

`isPartial` is also available on handlers:

```tsx
export const handler = {
  GET(req, ctx) {
    const isPartial = req.headers.get("X-Fresh-Partial") !== null;
    // ...
  },
};
```
