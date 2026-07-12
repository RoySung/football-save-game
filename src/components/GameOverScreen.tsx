import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LeaderboardView } from "./LeaderboardView";
import { GAME_CONSTANTS } from "../constants";
import { type LeaderboardEntry } from "../leaderboard";
import { AboutMe } from "./AboutMe";
import { shareScore } from "../shareUtils";

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
  const { t, i18n } = useTranslation();
  const [showButtons, setShowButtons] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await shareScore(score, i18n.language);
    } finally {
      setIsSharing(false);
    }
  }, [score, i18n.language, isSharing]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButtons(true);
    }, GAME_CONSTANTS.GAME_OVER_BUTTONS_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const delayedBtnClass = `transition-all duration-500 ease-out ${
    showButtons
      ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
      : "opacity-0 translate-y-4 scale-95 pointer-events-none"
  }`;

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
              <span className="score-box-label">{t("totalSaves")}</span>
              <span className="score-box-value">{score}</span>
              <span className="score-box-best">
                {t("hud.best")}: {bestScore}
              </span>
            </div>

            {/* Nickname Input & Submission */}
            {isFirebaseConfigured && isQualify && !scoreSubmitted ? (
              <div className={`nickname-input-container ${delayedBtnClass}`}>
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
                  disabled={submittingScore || !showButtons}
                />
                {submitError && (
                  <div className="text-red-500 text-xs font-bold mb-2">
                    {submitError}
                  </div>
                )}
                <button
                  onClick={handleSubmitScore}
                  disabled={submittingScore || !nickname.trim() || !showButtons}
                  className="game-btn game-btn-secondary py-2 px-6 text-md w-full"
                >
                  {submittingScore ? t("leaderboard.submitting") : t("leaderboard.submit")}
                </button>
              </div>
            ) : isFirebaseConfigured && !isQualify ? (
              <div className={`leaderboard-not-qualified ${delayedBtnClass}`}>
                {t("leaderboard.notQualified")}
              </div>
            ) : (
              !isFirebaseConfigured && (
                <div className={`leaderboard-not-qualified ${delayedBtnClass}`}>
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
              disabled={!showButtons}
              className={`game-btn game-btn-primary py-2.5 px-6 text-md w-[85%] mt-2 ${delayedBtnClass}`}
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
              disabled={!showButtons}
              className={`game-btn game-btn-secondary py-2.5 px-6 text-md w-[85%] mt-2 ${delayedBtnClass}`}
            >
              {t("backToMenu")}
            </button>
          </>
        )}


        {/* Footer Buttons floating at bottom */}
        <div className={`footer-btn-container ${delayedBtnClass}`}>
          <button
            onClick={handleShare}
            disabled={!showButtons || isSharing}
            className="btn-round-cyan"
            title={t("shareScore")}
          >
            {isSharing ? (
              <svg viewBox="0 0 24 24" className="anim-spin" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" strokeDasharray="32 32" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
              </svg>
            )}
          </button>
          <button
            onClick={restartGame}
            disabled={!showButtons}
            className="btn-round-cyan btn-round-highlight"
            title={t("restartGame")}
          >
            <svg viewBox="0 0 24 24">
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
          </button>
          <button
            onClick={backToMenu}
            disabled={!showButtons}
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
