interface PageHeaderAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: PageHeaderAction;
}

export default function PageHeader(
  { title, description, action }: PageHeaderProps,
) {
  return (
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">{title}</h1>
        {description && (
          <p class="text-base-content/60 mt-1">{description}</p>
        )}
      </div>
      {action && (
        <div>
          {action.href
            ? (
              <a href={action.href} class="btn btn-primary">
                {action.label}
              </a>
            )
            : (
              <button
                type="button"
                class="btn btn-primary"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            )}
        </div>
      )}
    </div>
  );
}
