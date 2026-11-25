import Image from "next/image";

import {
  effectPx,
  effects,
  effectSrc,
  filesWithoutSettings,
  propSettings,
  propIds,
  propPx,
  props,
  propSrc,
  propWidth,
  type PropId,
  type SceneryProp,
} from "./content";

const current = propIds.filter((id) => props[id].set === "doodle");
const role = (id: PropId) => propSettings(id)?.role;

/** Every cut-out on a pale snow panel, base on the panel's bottom line, with its name and sizes, grouped by role. */
export function PropSheet() {
  const groups: { title: string; ids: PropId[] }[] = [
    { title: "Throwers", ids: current.filter((id) => role(id) === "thrower") },
    { title: "Pins (can be knocked down)", ids: current.filter((id) => role(id) === "pin") },
    { title: "Frame (village along the lane, never knocked down)", ids: current.filter((id) => role(id) === "frame") },
    { title: "Not a standee", ids: current.filter((id) => !role(id)) },
  ];
  const crayon = propIds.filter((id) => props[id].set === "crayon");
  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) =>
        g.ids.length === 0 ? null : (
          <CardGroup key={g.title} title={g.title}>
            {g.ids.map((id) => (
              <PropCard key={id} name={id} />
            ))}
          </CardGroup>
        ),
      )}

      <CardGroup title="Effects (not standees, never in the layout)">
        {(Object.keys(effects) as (keyof typeof effects)[]).map((id) => (
          <EffectCard key={id} id={id} />
        ))}
      </CardGroup>

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
          {settings?.pin &&
            ` · pin: base ${settings.pin.footprint[0]} × ${settings.pin.footprint[1]}, ${settings.pin.weight}`}
          {!settings && " · add it to props in content.ts"}
        </span>
      </div>
    </li>
  );
}

function EffectCard({ id }: { id: keyof typeof effects }) {
  const e = effects[id];
  const px = effectPx(id);
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex h-32 items-center justify-center bg-muted/70 p-4">
        {px ? (
          <Image
            src={effectSrc(id)}
            alt={e.label}
            width={px.w}
            height={px.h}
            unoptimized
            className="max-h-full w-auto object-contain"
          />
        ) : (
          <span className="text-sm font-bold text-destructive">no file yet</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2 text-sm">
        <span className="font-bold">{e.label}</span>
        <code className="text-xs">effects/{id}.webp</code>
        <span className="text-xs">
          {px ? `${px.w} × ${px.h} px` : "missing"} · about {e.size} tall
        </span>
        <span className="text-xs">{e.note}</span>
      </div>
    </li>
  );
}
