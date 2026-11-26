import type { Metadata } from "next";
import { Suspense } from "react";

import { INVITE, InviteCard, inviteDescription, inviteTitle, readInvite } from "@/features/invite";
import { LoadingScreen } from "@/features/loading";
import { WeChatShareImage } from "@/features/share";

type Props = PageProps<"/invite">;

/** The root share card's alt text (same words as `app/opengraph-image.alt.txt`). */
const SITE_IMAGE_ALT =
  "Plop! paper bowling on snow: two hand-drawn snowmen, one in a bucket hat and one in a red hat, with a penguin, a snowy pine and snowballs.";

/** "{name} 邀请你来打雪仗 · Plop!": the tab title, and the title of WeChat's chat card for this link. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { name, score } = readInvite(await searchParams);
  const title = { absolute: inviteTitle(name) };
  const description = inviteDescription(score);
  // Setting openGraph here replaces the root layout's whole openGraph, its image included, so the link card had
  // no picture (a grey link icon in chat apps). The square invite art first (chat apps crop to a square), then the
  // large card. Relative URLs resolve against the root layout's metadataBase, so the tags are absolute.
  const { src, size, alt } = INVITE.squareImage;
  const square = { url: src, width: size, height: size, type: "image/jpeg", alt };
  const large = { url: "/opengraph-image.png", width: 1200, height: 630, type: "image/png", alt: SITE_IMAGE_ALT };
  return {
    title,
    description,
    openGraph: { title: inviteTitle(name), description, type: "website", siteName: "Plop!", images: [square, large] },
    twitter: { card: "summary", title: inviteTitle(name), description, images: [square] },
  };
}

/** The name and score live in the address, so this part waits for the request (inside Suspense). */
async function Card({ searchParams }: Props) {
  const invite = readInvite(await searchParams);
  return <InviteCard {...invite} />;
}

/**
 * The invite card on an all-white page (Rachel): the loading snowball rolls, bursts into snow, and the card pops out
 * of the puff. Accept goes to the game with `?g=<group>&from=<name>`.
 */
export default function InvitePage(props: Props) {
  const { words, squareImage } = INVITE;
  return (
    <main className="plop-invite relative h-dvh w-full overflow-hidden bg-snow-white">
      {/* Must stay the first image in <body>: WeChat uses it for the chat link card. */}
      <WeChatShareImage src={squareImage.src} size={squareImage.size} />
      <Suspense fallback={null}>
        <Card {...props} />
      </Suspense>
      {/* No 3D scene here: ready once the page has loaded; the card pops out of the snowball's puff. */}
      <LoadingScreen note={words.loading} noScene reveal />
    </main>
  );
}
