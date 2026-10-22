// One page shell for the whole app, so every screen uses the window the same way.
// Width tiers (Material 3 window classes: expanded ≥840, large ≥1200, extra-large ≥1600):
//   app  — dashboards, tables, boards: fluid up to 1600px, side padding grows with the window.
//   read — one column of text or a form to study: capped at 65-75 characters per line (max-w-3xl/4xl).
//   form — settings and sign-in style pages: narrow on purpose.
// Nothing is stretched: cards and tables fill the tier, and the tier stops where lines get too long to read.
const TIER = {
  app: "max-w-[1600px]",
  wide: "max-w-4xl",
  read: "max-w-3xl",
  form: "max-w-2xl",
} as const;

export function Shell({ children, width = "app", gap = "gap-4", className = "" }: { children: React.ReactNode; width?: keyof typeof TIER; gap?: string; className?: string }) {
  return (
    <main className={`mx-auto flex min-h-screen w-full ${TIER[width]} flex-col ${gap} bg-neutral-50 px-4 py-6 text-neutral-900 sm:px-6 lg:px-8 2xl:px-12 ${className}`}>
      {children}
    </main>
  );
}
