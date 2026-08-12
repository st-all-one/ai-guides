import { define } from "@/utils/define.ts";
import PageHeader from "@/components/PageHeader.tsx";
import Breadcrumb from "@/components/Breadcrumb.tsx";

interface Settings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
}

let mockSettings: Settings = {
  siteName: "Admin Dashboard",
  siteDescription: "A powerful admin dashboard built with Fresh.",
  maintenanceMode: false,
};

export const handler = define.handlers({
  GET(ctx) {
    return ctx.render({ settings: mockSettings, success: "" });
  },
  async POST(ctx) {
    const form = await ctx.req.formData();
    mockSettings = {
      siteName: form.get("siteName")?.toString() || mockSettings.siteName,
      siteDescription:
        form.get("siteDescription")?.toString() || mockSettings.siteDescription,
      maintenanceMode: form.get("maintenanceMode") === "on",
    };
    return ctx.render({ settings: mockSettings, success: "Settings saved successfully." });
  },
});

export default define.page<typeof handler>(function SettingsPage({ data }) {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage application configuration."
      />

      {data.success && (
        <div class="alert alert-success mb-6" role="alert">
          <span>{data.success}</span>
        </div>
      )}

      <div class="card bg-base-100 shadow-md border border-base-300 max-w-2xl">
        <div class="card-body">
          <form method="POST">
            <div class="form-control mb-4">
              <label class="label" for="siteName">
                <span class="label-text">Site Name</span>
              </label>
              <input
                id="siteName"
                name="siteName"
                type="text"
                class="input input-bordered w-full"
                value={data.settings.siteName}
                aria-required="true"
              />
            </div>

            <div class="form-control mb-4">
              <label class="label" for="siteDescription">
                <span class="label-text">Site Description</span>
              </label>
              <textarea
                id="siteDescription"
                name="siteDescription"
                class="textarea textarea-bordered w-full"
                rows={3}
              >
                {data.settings.siteDescription}
              </textarea>
            </div>

            <div class="form-control mb-6">
              <label class="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  name="maintenanceMode"
                  class="toggle toggle-primary"
                  checked={data.settings.maintenanceMode}
                />
                <span class="label-text">Maintenance Mode</span>
              </label>
              {data.settings.maintenanceMode && (
                <p class="text-sm text-warning mt-1">
                  Maintenance mode is currently enabled. The site is not
                  accessible to regular users.
                </p>
              )}
            </div>

            <button type="submit" class="btn btn-primary">
              Save Settings
            </button>
          </form>
        </div>
      </div>
    </>
  );
});
