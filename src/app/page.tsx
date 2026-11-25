import { Game } from "@/features/game";
import { LoadingScreen } from "@/features/loading";

export default function Home() {
  return (
    <>
      <Game />
      <LoadingScreen />
    </>
  );
}
