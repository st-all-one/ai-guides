import type { ComponentChildren } from "preact";
import type { State } from "@/utils/define.ts";

interface SidebarProps {
  url: URL;
  state: State;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

function isActive(currentPath: string, itemPath: string): boolean {
  if (itemPath === "/admin") return currentPath === "/admin";
  return currentPath.startsWith(itemPath);
}

export default function Sidebar({ url, state }: SidebarProps) {
  return (
    <aside class="w-64 h-screen bg-base-200 flex flex-col" aria-label="Admin navigation">
      <div class="p-4 border-b border-base-300">
        <a href="/admin" class="text-xl font-bold text-primary">
          Admin Panel
        </a>
      </div>
      <nav class="flex-1 p-2" role="navigation">
        <ul class="menu w-full">
          {navItems.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                class={isActive(url.pathname, item.href) ? "active" : ""}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {state.user && (
        <div class="p-4 border-t border-base-300">
          <div class="flex items-center gap-3">
            <div class="avatar placeholder">
              <div class="bg-neutral text-neutral-content w-10 rounded-full">
                <span class="text-sm">
                  {state.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{state.user.name}</p>
              <p class="text-xs text-base-content/60 truncate">
                {state.user.email}
              </p>
              <span class="badge badge-xs badge-outline mt-0.5">
                {state.user.role}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
