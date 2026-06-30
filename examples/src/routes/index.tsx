import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexComponent,
});

function IndexComponent() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">
        Select an example from the sidebar.
      </p>
    </div>
  );
}
