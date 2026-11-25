import type { Metadata } from "next";
import { Suspense } from "react";

import { INVITE, InviteBackdrop, InviteCard, inviteDescription, inviteTitle, readInvite } from "@/features/invite";
import { LoadingScreen } from "@/features/loading";
import { WeChatShareImage } from "@/features/share";

type Props = PageProps<"/invite">;

/** "{name} 邀请你来打雪仗 · Plop!": the tab title, and the title of WeChat's chat card for this link. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { name, score } = readInvite(await searchParams);
  const title = { absolute: inviteTitle(name) };
  const description = inviteDescription(score);
  return {
    title,
    description,
    openGraph: { title: inviteTitle(name), description, type: "website", siteName: "Plop!" },
    twitter: { card: "summary_large_image", title: inviteTitle(name), description },
  };
}

/** The name and score live in the address, so this part waits for the request (inside Suspense). */
async function Card({ searchParams }: Props) {
  const invite = readInvite(await searchParams);
  return <InviteCard {...invite} />;
}

/** The invite card: a Christmas-evening welcome. Accept goes to the game with `?from=<name>`. */
export default function InvitePage(props: Props) {
  const { words, art, squareImage } = INVITE;
  return (
    <main className="plop-invite relative h-dvh w-full overflow-hidden">
      {/* Must stay the first image in <body>: WeChat uses it for the chat link card. */}
      <WeChatShareImage src={squareImage.src} size={squareImage.size} />
      <InviteBackdrop />
      <Suspense fallback={null}>
        <Card {...props} />
      </Suspense>
      <LoadingScreen
        art={{ ...art.mouse, alt: "" }}
        note={words.loading.zh}
        small={words.loading.en}
      />
    </main>
  );
}
