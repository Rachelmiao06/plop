import Image from "next/image";

import { props, propWidth, type PropGroup, type PropId, type SceneryProp } from "./content";

const groupOrder: { group: PropGroup; title: string }[] = [
  { group: "big", title: "Big" },
  { group: "tree", title: "Trees" },
  { group: "mid", title: "Middle" },
  { group: "small", title: "Small" },
  { group: "friend", title: "Little friends" },
];

const ids = Object.keys(props) as PropId[];

/** Every cut-out on a pale snow panel, base on the panel's bottom line, with its name and sizes. */
export function PropSheet() {
  return (
    <div className="flex flex-col gap-8">
      {groupOrder.map(({ group, title }) => (
        <section key={group} className="flex flex-col gap-3">
          <h3 className="font-heading text-2xl font-bold">{title}</h3>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ids
              .filter((id) => props[id].group === group)
              .map((id) => (
                <PropCard key={id} id={id} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PropCard({ id }: { id: PropId }) {
  const p: SceneryProp = props[id];
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* The panel's bottom edge stands for the snow line, so the base should touch it. */}
      <div className="flex h-44 items-end justify-center border-b-2 border-snow-shadow bg-muted/70 px-3 pt-3">
        <Image
          src={p.src}
          alt={p.label}
          width={p.px.w}
          height={p.px.h}
          unoptimized
          className="max-h-full w-auto object-contain object-bottom"
        />
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2 text-sm">
        <span className="font-bold">{p.label}</span>
        <code className="text-xs">{id}.webp</code>
        <span className="text-xs">
          {p.px.w} × {p.px.h} px · {p.height} tall × {propWidth(id).toFixed(2)} wide · sinks {p.sink}
        </span>
      </div>
    </li>
  );
}
