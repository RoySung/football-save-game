import { useTranslation } from "react-i18next";
import { LeaderboardView } from "./LeaderboardView";
import { GAME_CONSTANTS } from "../constants";
import { type LeaderboardEntry } from "../leaderboard";
import { AboutMe } from "./AboutMe";

interface GameOverScreenProps {
  score: number;
  bestScore: number;
  isNewBest: boolean;
  viewState: "summary" | "leaderboard";
  setViewState: (state: "summary" | "leaderboard") => void;
  nickname: string;
  setNickname: (name: string) => void;
  isQualify: boolean;
  scoreSubmitted: boolean;
  submittingScore: boolean;
  handleSubmitScore: () => void;
  loadLeaderboard: () => Promise<void>;
  leaderboardEntries: LeaderboardEntry[];
  isLoadingLeaderboard: boolean;
  leaderboardError: string | null;
  restartGame: () => void;
  backToMenu: () => void;
  getFeedbackMessage: () => string;
  isFirebaseConfigured: boolean;
  submitError: string | null;
}

export function GameOverScreen({
  score,
  bestScore,
  isNewBest,
  viewState,
  setViewState,
  nickname,
  setNickname,
  isQualify,
  scoreSubmitted,
  submittingScore,
  handleSubmitScore,
  loadLeaderboard,
  leaderboardEntries,
  isLoadingLeaderboard,
  leaderboardError,
  restartGame,
  backToMenu,
  getFeedbackMessage,
  isFirebaseConfigured,
  submitError,
}: GameOverScreenProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 flex items-center justify-center overlay-celebration pointer-events-auto">
      <div className="game-card p-6 pb-12 flex flex-col items-center max-w-[90%] w-[340px] mx-4 text-center anim-bounce-in">
        {/* Top Badge: NEW BEST or TIMES UP */}
        <div className="badge-new-best">
          {isNewBest ? t("newBest") : t("timesUp")}
        </div>

        {viewState === "summary" ? (
          <>
            {/* Bubble Feedback Title */}
            <h2 className="game-title-cartoon">
              {isNewBest ? t("feedback.amazing") : getFeedbackMessage()}
            </h2>

            {/* Score Box */}
            <div className="score-box">
              <span className="score-box-value">{score}</span>
              <span className="score-box-best">
                {t("hud.best")}: {bestScore}
              </span>
            </div>

            {/* Green Pill Badge */}
            <div
              className="score-pill-green"
              style={{ marginBottom: "20px" }}
            >
              {t("savesEarned", { count: score })}
            </div>

            {/* Nickname Input & Submission */}
            {isFirebaseConfigured && isQualify && !scoreSubmitted ? (
              <div className="nickname-input-container">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    const val = e.target.value.substring(0, GAME_CONSTANTS.LEADERBOARD_MAX_NAME_LENGTH);
                    setNickname(val);
                  }}
                  placeholder={t("leaderboard.nicknamePlaceholder")}
                  className="game-input"
                  maxLength={GAME_CONSTANTS.LEADERBOARD_MAX_NAME_LENGTH}
                  disabled={submittingScore}
                />
                {submitError && (
                  <div className="text-red-500 text-xs font-bold mb-2">
                    {submitError}
                  </div>
                )}
                <button
                  onClick={handleSubmitScore}
                  disabled={submittingScore || !nickname.trim()}
                  className="game-btn game-btn-secondary py-2 px-6 text-md w-full"
                >
                  {submittingScore ? t("leaderboard.submitting") : t("leaderboard.submit")}
                </button>
              </div>
            ) : isFirebaseConfigured && !isQualify ? (
              <div className="leaderboard-not-qualified">
                {t("leaderboard.notQualified")}
              </div>
            ) : (
              !isFirebaseConfigured && (
                <div className="leaderboard-not-qualified">
                  {t("leaderboard.notConfigured")}
                </div>
              )
            )}

            {/* View Leaderboard Button */}
            <button
              onClick={() => {
                loadLeaderboard();
                setViewState("leaderboard");
              }}
              className="game-btn game-btn-primary py-2.5 px-6 text-md w-[85%] mt-2"
            >
              {t("leaderboard.title")}
            </button>
          </>
        ) : (
          <>
            {/* Leaderboard View */}
            <LeaderboardView
              entries={leaderboardEntries}
              isLoading={isLoadingLeaderboard}
              error={leaderboardError}
              currentNickname={nickname}
              currentScore={score}
              scoreSubmitted={scoreSubmitted}
            />

            {/* Back to Summary Button */}
            <button
              onClick={() => setViewState("summary")}
              className="game-btn game-btn-secondary py-2.5 px-6 text-md w-[85%] mt-2"
            >
              {t("backToMenu")}
            </button>
          </>
        )}

        {/* Leaderboard Tab (decorative) */}
        <div className="leaderboard-tab" title={t("hud.best")} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M2 20h20v2H2zm2-2h4V10H4zm6 0h4V6h-4zm6 0h4v-5h-4z" />
          </svg>
        </div>

        {/* Footer Buttons floating at bottom */}
        <div className="footer-btn-container">
          <button
            onClick={restartGame}
            className="btn-round-cyan"
            title={t("restartGame")}
          >
            <svg viewBox="0 0 24 24">
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
          </button>
          <button
            onClick={backToMenu}
            className="btn-round-cyan"
            title={t("backToMenu")}
          >
            <svg viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </button>
        </div>
      </div>
      <AboutMe />
    </div>
  );
}
