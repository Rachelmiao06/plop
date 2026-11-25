import { content } from "./content";

// Placeholder only. The real 3D scene is built in its own issue.
export function SnowScene() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 bg-background p-8 text-center text-foreground">
      <h1 className="font-heading text-6xl font-semibold tracking-tight">
        {content.title}
      </h1>
      <p className="max-w-sm text-muted-foreground">{content.tagline}</p>
      <p className="text-sm text-muted-foreground">{content.status}</p>
    </section>
  );
}
