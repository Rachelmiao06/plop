import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { TokenValue } from "./TokenValue";

export const metadata: Metadata = { title: "Plop! · tokens" };

// Class names are written out in full so Tailwind can find them.
const palette = [
  { name: "ink", fill: "bg-ink", note: "text and outlines" },
  { name: "paper", fill: "bg-paper", note: "page background" },
  { name: "snow-shadow", fill: "bg-snow-shadow", note: "shadow on snow" },
  { name: "sky-blue", fill: "bg-sky-blue", note: "primary" },
  { name: "butter", fill: "bg-butter", note: "secondary" },
  { name: "berry", fill: "bg-berry", note: "warm red" },
  { name: "pine", fill: "bg-pine", note: "trees" },
  { name: "mint", fill: "bg-mint", note: "accent" },
  { name: "bark", fill: "bg-bark", note: "wood" },
  { name: "blush", fill: "bg-blush", note: "cheeks" },
  { name: "skin", fill: "bg-skin", note: "faces" },
  { name: "slate", fill: "bg-slate", note: "stone, metal" },
  { name: "ink-deep", fill: "bg-ink-deep", note: "text on colour" },
  { name: "berry-deep", fill: "bg-berry-deep", note: "warning text" },
];

const pairs = [
  { name: "background", box: "bg-background text-foreground" },
  { name: "card", box: "bg-card text-card-foreground" },
  { name: "primary", box: "bg-primary text-primary-foreground" },
  { name: "secondary", box: "bg-secondary text-secondary-foreground" },
  { name: "accent", box: "bg-accent text-accent-foreground" },
  { name: "muted", box: "bg-muted text-muted-foreground" },
  { name: "destructive", box: "bg-destructive/10 text-destructive" },
];

const corners = [
  { name: "sm", box: "rounded-sm" },
  { name: "md", box: "rounded-md" },
  { name: "lg", box: "rounded-lg" },
  { name: "xl", box: "rounded-xl" },
  { name: "2xl", box: "rounded-2xl" },
  { name: "full", box: "rounded-full" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-3xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default function TokensPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-5 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-6xl font-bold">Plop! tokens</h1>
        <p className="max-w-prose">
          The look is &ldquo;crayon sticker snow village&rdquo;: warm brown
          outlines, coloured-pencil fills, pale blue shadows. Every colour,
          font and corner on this page comes from{" "}
          <code className="font-mono text-sm">globals.css</code>.
        </p>
      </header>

      <Section title="Palette">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {palette.map((c) => (
            <li
              key={c.name}
              className="flex flex-col overflow-hidden rounded-xl border-2 border-ink bg-card"
            >
              <div className={`h-20 border-b-2 border-ink ${c.fill}`} />
              <div className="flex flex-col gap-0.5 p-3">
                <span className="font-heading text-xl leading-tight font-bold">
                  {c.name}
                </span>
                <TokenValue name={`--${c.name}`} />
                <span className="text-xs">{c.note}</span>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Text on colour">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {pairs.map((p) => (
            <li
              key={p.name}
              className={`flex flex-col gap-1 rounded-xl border p-4 ${p.box}`}
            >
              <span className="font-heading text-2xl font-bold">Aa</span>
              <span className="text-sm">{p.name}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Fonts">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border p-5">
            <span className="text-xs">Headings · Gaegu</span>
            <p className="font-heading text-5xl font-bold">Plop! Snow day</p>
            <p className="font-heading text-2xl">
              Pull back, roll it bigger, let go.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border p-5">
            <span className="text-xs">Small text · Nunito</span>
            <p className="text-lg font-semibold">Pull back and let go</p>
            <p className="text-sm">
              Press a character and pull back. The snowball rolls, leaves a
              groove and grows. 0123456789
            </p>
          </div>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Play</Button>
          <Button size="lg" variant="secondary">
            Secondary
          </Button>
          <Button size="lg" variant="outline">
            Outline
          </Button>
          <Button size="lg" variant="ghost">
            Ghost
          </Button>
          <Button size="lg" variant="destructive">
            Reset snow
          </Button>
          <Button size="lg" disabled>
            Disabled
          </Button>
        </div>
      </Section>

      <Section title="Corners">
        <ul className="flex flex-wrap gap-4">
          {corners.map((r) => (
            <li
              key={r.name}
              className={`flex size-20 items-center justify-center border-2 border-ink bg-snow-shadow text-sm ${r.box}`}
            >
              {r.name}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
