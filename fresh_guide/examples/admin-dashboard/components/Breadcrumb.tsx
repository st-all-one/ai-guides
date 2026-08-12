interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div class="breadcrumbs text-sm pb-2">
      <ul>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx}>
              {isLast || !item.href ? (
                <span class={isLast ? "font-medium text-base-content" : ""}>
                  {item.label}
                </span>
              ) : (
                <a href={item.href} class="text-primary hover:underline">
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
