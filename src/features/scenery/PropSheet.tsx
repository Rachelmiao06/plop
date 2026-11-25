import Image from "next/image";

import {
  filesWithoutSettings,
  layout,
  propSettings,
  propIds,
  propPx,
  props,
  propSrc,
  propWidth,
  type PropGroup,
  type PropId,
  type SceneryProp,
} from "./content";

const groupOrder: { group: PropGroup; title: string }[] = [
  { group: "big", title: "Big" },
  { group: "tree", title: "Trees" },
  { group: "mid", title: "Middle" },
  { group: "small", title: "Small" },
  { group: "person", title: "People" },
  { group: "friend", title: "Little friends" },
];

const inLayout = new Set(layout.map((p) => p.prop));
const current = propIds.filter((id) => props[id].set === "doodle");
const isStandee = (id: PropId) => (propSettings(id)?.kind ?? "standee") === "standee";

/** Every cut-out on a pale snow panel, base on the panel's bottom line, with its name and sizes. */
export function PropSheet() {
  const unused = current.filter((id) => isStandee(id) && !inLayout.has(id));
  const notScenery = current.filter((id) => !isStandee(id));
  const crayon = propIds.filter((id) => props[id].set === "crayon");
  return (
    <div className="flex flex-col gap-8">
      {groupOrder.map(({ group, title }) => {
        const ids = current.filter((id) => props[id].group === group && isStandee(id) && inLayout.has(id));
        return ids.length === 0 ? null : (
          <CardGroup key={group} title={title}>
            {ids.map((id) => (
              <PropCard key={id} name={id} />
            ))}
          </CardGroup>
        );
      })}

      {unused.length > 0 && (
        <CardGroup title="Current set, not in the layout">
          {unused.map((id) => (
            <PropCard key={id} name={id} />
          ))}
        </CardGroup>
      )}

      {notScenery.length > 0 && (
        <CardGroup title="Not scenery: main character model and decal">
          {notScenery.map((id) => (
            <PropCard key={id} name={id} />
          ))}
        </CardGroup>
      )}

      {filesWithoutSettings.length > 0 && (
        <CardGroup title="New files with no settings yet">
          {filesWithoutSettings.map((name) => (
            <PropCard key={name} name={name} />
          ))}
        </CardGroup>
      )}

      {crayon.length > 0 && (
        <CardGroup title="Spares: the first crayon set">
          {crayon.map((id) => (
            <PropCard key={id} name={id} />
          ))}
        </CardGroup>
      )}
    </div>
  );
}
function CardGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-2xl font-bold">{title}</h3>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</ul>
    </section>
  );
}

function PropCard({ name }: { name: string }) {
  const settings = (props as Record<string, SceneryProp | undefined>)[name];
  const px = propPx(name);
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* The panel's bottom edge stands for the snow line, so the base should touch it. */}
      <div className="flex h-44 items-end justify-center border-b-2 border-snow-shadow bg-muted/70 px-3 pt-3">
        {px ? (
          <Image
            src={propSrc(name)}
            alt={settings?.label ?? name}
            width={px.w}
            height={px.h}
            unoptimized
            className="max-h-full w-auto object-contain object-bottom"
          />
        ) : (
          <span className="mb-16 text-sm font-bold text-destructive">no file yet</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2 text-sm">
        <span className="font-bold">{settings?.label ?? name}</span>
        <code className="text-xs">{name}.webp</code>
        <span className="text-xs">
          {px ? `${px.w} × ${px.h} px` : "missing"}
          {settings &&
            ` · ${settings.height} tall × ${propWidth(name as PropId).toFixed(2)} wide · sinks ${settings.sink}`}
          {settings?.motion && " · moving: loop later"}
          {!settings && " · add it to props in content.ts"}
        </span>
      </div>
    </li>
  );
}
