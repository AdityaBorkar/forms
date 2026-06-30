import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

const examples = [
  { label: "Simple Form", to: "/simple-form" },
  { label: "Nested Fields", to: "/nested-form" },
  { label: "Array Fields", to: "/array-form" },
  { label: "Custom Field Types", to: "/custom-field-types" },
  { label: "Custom Field Component", to: "/custom-field-component" },
] as const;

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-border border-r bg-sidebar p-4 text-sidebar-foreground">
        <h1 className="mb-6 font-semibold text-lg">@adistack/forms</h1>
        <nav className="grid gap-1">
          {examples.map((ex) => (
            <Link
              activeOptions={{ exact: true }}
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
              className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              key={ex.to}
              to={ex.to}
            >
              {ex.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
