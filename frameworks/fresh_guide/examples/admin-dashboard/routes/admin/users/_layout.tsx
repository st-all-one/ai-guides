import { define } from "@/utils/define.ts";
import PageHeader from "@/components/PageHeader.tsx";
import Breadcrumb from "@/components/Breadcrumb.tsx";

export default define.layout(function UsersLayout({ Component, url }) {
  const isUserDetail = url.pathname.match(/^\/admin\/users\/[^/]+$/);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          ...(isUserDetail
            ? [{ label: "Users", href: "/admin/users" }, { label: "User Detail" }]
            : [{ label: "Users" }]),
        ]}
      />
      <Component />
    </>
  );
});
