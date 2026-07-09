import { useTranslation } from "react-i18next";
import { LeaderboardView } from "./LeaderboardView";
import { type LeaderboardEntry } from "../leaderboard";

interface StartScreenProps {
  logoState: "normal" | "shocked" | "angry";
  handleLogoClick: () => void;
  startGame: () => void;
  showLeaderboardFromStart: boolean;
  setShowLeaderboardFromStart: (show: boolean) => void;
  loadLeaderboard: () => Promise<void>;
  leaderboardEntries: LeaderboardEntry[];
  isLoadingLeaderboard: boolean;
  leaderboardError: string | null;
}

export function StartScreen({
  logoState,
  handleLogoClick,
  startGame,
  showLeaderboardFromStart,
  setShowLeaderboardFromStart,
  loadLeaderboard,
  leaderboardEntries,
  isLoadingLeaderboard,
  leaderboardError,
}: StartScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 flex items-center justify-center overlay-bright pointer-events-auto">
      <div className="game-card p-8 flex flex-col items-center max-w-[90%] w-[440px] mx-4 text-center anim-bounce-in">
        {!showLeaderboardFromStart ? (
          <>
            {/* Logo */}
            <img
              src={
                logoState === "angry"
                  ? "/assets/logo_angry.png"
                  : logoState === "shocked"
                    ? "/assets/logo_shock.png"
                    : "/assets/logo.png"
              }
              alt="Football Save"
              className={`game-logo mb-6 ${
                logoState === "angry"
                  ? "logo-angry"
                  : logoState === "shocked"
                    ? "logo-shocked"
                    : "anim-float"
              }`}
              onClick={handleLogoClick}
            />

            {/* Instructions */}
            <div className="info-bubble mb-8 text-left">
              <p
                className="leading-relaxed text-sm sm:text-base"
                style={{ color: "var(--color-text)" }}
              >
                {t("instructions.part1")}
                <br />
                <br />
                {t("instructions.part2")}
                <span className="mx-1 inline-block align-middle font-extrabold text-highlight border-2 border-dashed border-highlight rounded-[6px] px-1.5 py-px leading-tight bg-highlight-dark/5">
                  {t("instructions.bottomZone")}
                </span>
                {t("instructions.part3")}
                <br />
                {t("instructions.part4")}
                <br />
                <br />
                {t("instructions.part5")}
              </p>
            </div>

            {/* Start / Leaderboard Buttons */}
            <div className="w-full flex flex-col gap-4">
              <button
                onClick={startGame}
                className="game-btn game-btn-primary py-4 px-12 text-xl w-full"
              >
                {t("startGame")}
              </button>
              <button
                onClick={() => {
                  setShowLeaderboardFromStart(true);
                  loadLeaderboard();
                }}
                className="game-btn game-btn-secondary py-3 px-8 text-lg w-full"
              >
                {t("leaderboard.title")}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Leaderboard View on Start Screen */}
            <LeaderboardView
              entries={leaderboardEntries}
              isLoading={isLoadingLeaderboard}
              error={leaderboardError}
              containerClassName="leaderboard-container w-full max-h-[220px]"
            />

            {/* Back Button */}
            <button
              onClick={() => setShowLeaderboardFromStart(false)}
              className="game-btn game-btn-secondary py-3.5 px-8 text-lg w-full mt-4"
            >
              {t("backToMenu")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
