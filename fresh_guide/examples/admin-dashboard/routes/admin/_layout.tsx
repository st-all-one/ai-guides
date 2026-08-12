import { define } from "@/utils/define.ts";
import Sidebar from "@/components/Sidebar.tsx";
import { SkipLink } from "@/components/SkipLink.tsx";

export const config = {
  skipInheritedLayouts: true,
};

export default define.layout(function AdminLayout({ Component, state, url }) {
  return (
    <div class="flex h-screen overflow-hidden">
      <SkipLink />
      <Sidebar url={url} state={state} />
      <main id="admin-main-content" class="flex-1 overflow-y-auto p-6" tabindex={-1}>
        <Component />
      </main>
    </div>
  );
});
