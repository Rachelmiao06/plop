import { Game } from "@/features/game";
import { LoadingScreen } from "@/features/loading";
import { ShareButton, WeChatShareImage } from "@/features/share";

export default function Home() {
  return (
    <>
      {/* Must stay the first image in <body>: WeChat uses it for the chat link card. */}
      <WeChatShareImage />
      <Game />
      <ShareButton />
      <LoadingScreen />
    </>
  );
}
