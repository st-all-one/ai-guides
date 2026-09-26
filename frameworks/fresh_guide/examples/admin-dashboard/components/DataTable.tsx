import type { ComponentChildren } from "preact";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ComponentChildren;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  caption?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ComponentChildren;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  caption,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div class="text-center py-12 text-base-content/60" role="status">
        <p class="text-lg">No data available</p>
        <p class="text-sm mt-1">There are no records to display.</p>
      </div>
    );
  }

  return (
    <div class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <caption class="sr-only">{caption || "Data table"}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col">{col.label}</th>
            ))}
            {actions && <th scope="col">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={(row.id as string) || idx}
              class={onRowClick ? "cursor-pointer hover" : ""}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row) : String(row[col.key] ?? "")}
                </td>
              ))}
              {actions && <td>{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
