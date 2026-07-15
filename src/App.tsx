import { useState, useEffect, useRef } from "react";
import { PhaserGame } from "./game/PhaserGame";
import { EventBus } from "./game/EventBus";
import { useTranslation } from "react-i18next";
import { type Language } from "./locales";
import {
  qualifiesForLeaderboard,
  submitScore,
  fetchLeaderboard,
  type LeaderboardEntry,
} from "./leaderboard";
import { isFirebaseConfigured } from "./firebase";
import { StartScreen } from "./components/StartScreen";
import { GameOverScreen } from "./components/GameOverScreen";
import { GAME_CONSTANTS } from "./constants";
import "./App.css";

function App() {
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState<number>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const durationParam = urlParams.get("duration");
    return durationParam ? parseInt(durationParam, 10) : GAME_CONSTANTS.DURATION;
  });
  const [gameState, setGameState] = useState<
    "start" | "countdown" | "playing" | "gameover"
  >("start");
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("game-muted") === "true";
  });
  const [scoreAnimKey, setScoreAnimKey] = useState(0);
  const [countdown, setCountdown] = useState<number>(
    GAME_CONSTANTS.COUNTDOWN_DURATION,
  );
  const [bestScore, setBestScore] = useState<number>(() => {
    const saved = localStorage.getItem("game-best-score");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isNewBest, setIsNewBest] = useState(false);
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const [logoState, setLogoState] = useState<"normal" | "shocked" | "angry">(
    "normal",
  );
  const [logoClickCount, setLogoClickCount] = useState(0);
  const logoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem("game-nickname") || "";
  });
  const [leaderboardEntries, setLeaderboardEntries] = useState<
    LeaderboardEntry[]
  >([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [isQualify, setIsQualify] = useState(true);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [viewState, setViewState] = useState<"summary" | "leaderboard">(
    "summary",
  );
  const [showLeaderboardFromStart, setShowLeaderboardFromStart] =
    useState(false);

  useEffect(() => {
    document.title = t("metaTitle");
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", t("metaDesc"));
    }
  }, [lang, t]);

  useEffect(() => {
    EventBus.on("game-started", () => {
      setGameState("playing");
    });

    EventBus.on("update-score", (newScore: number) => {
      setScore(newScore);
      setScoreAnimKey((prev) => prev + 1);
    });

    EventBus.on("update-timer", (newTime: number) => {
      setTimer(newTime);
    });

    EventBus.on("game-over", (finalScore: number) => {
      setGameState("gameover");
      setViewState("summary");
      setScoreSubmitted(false);

      const savedBest = localStorage.getItem("game-best-score");
      const currentBest = savedBest ? parseInt(savedBest, 10) : 0;
      if (finalScore > currentBest) {
        localStorage.setItem("game-best-score", finalScore.toString());
        setBestScore(finalScore);
        setIsNewBest(true);
      } else {
        setBestScore(currentBest);
        setIsNewBest(false);
      }

      // Check leaderboard qualification
      qualifiesForLeaderboard(finalScore)
        .then((qualifies) => {
          setIsQualify(qualifies);
        })
        .catch((err) => {
          console.error("Could not check leaderboard qualification:", err);
          setIsQualify(true); // Fallback to allow attempting entry
        });
    });

    return () => {
      EventBus.removeListener("game-started");
      EventBus.removeListener("update-score");
      EventBus.removeListener("update-timer");
      EventBus.removeListener("game-over");
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (logoTimeoutRef.current) {
        clearTimeout(logoTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("autoplay") === "true") {
      const timeout = setTimeout(() => {
        startGame();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, []);

  const startCountdownFlow = (onFinish: () => void) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setGameState("countdown");
    setCountdown(GAME_CONSTANTS.COUNTDOWN_DURATION);

    let current = GAME_CONSTANTS.COUNTDOWN_DURATION;
    countdownIntervalRef.current = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        onFinish();
      } else {
        setCountdown(current);
      }
    }, 1000);
  };

  const startGame = () => {
    setIsNewBest(false);
    setShowLeaderboardFromStart(false);
    setSubmitError(null);
    startCountdownFlow(() => {
      EventBus.emit("start-game");
    });
  };

  const restartGame = () => {
    setScore(0);
    const urlParams = new URLSearchParams(window.location.search);
    const durationParam = urlParams.get("duration");
    setTimer(durationParam ? parseInt(durationParam, 10) : GAME_CONSTANTS.DURATION);
    setIsNewBest(false);
    setShowLeaderboardFromStart(false);
    setSubmitError(null);
    EventBus.emit("restart-game");

    startCountdownFlow(() => {
      EventBus.emit("start-game");
    });
  };

  const backToMenu = () => {
    setScore(0);
    const urlParams = new URLSearchParams(window.location.search);
    const durationParam = urlParams.get("duration");
    setTimer(durationParam ? parseInt(durationParam, 10) : GAME_CONSTANTS.DURATION);
    setIsNewBest(false);
    setSubmitError(null);
    EventBus.emit("restart-game");
    setGameState("start");
    setShowLeaderboardFromStart(false);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem("game-muted", nextMuted.toString());
    EventBus.emit("toggle-mute", nextMuted);
  };

  const toggleLanguage = () => {
    const nextLang = lang === "en" ? "zh-TW" : "en";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("game-lang", nextLang);
  };

  const handleLogoClick = () => {
    const nextCount = logoClickCount + 1;
    setLogoClickCount(nextCount);

    if (logoTimeoutRef.current) {
      clearTimeout(logoTimeoutRef.current);
    }

    if (nextCount >= GAME_CONSTANTS.LOGO_ANGRY_THRESHOLD) {
      setLogoState("angry");
      logoTimeoutRef.current = setTimeout(() => {
        setLogoState("normal");
        setLogoClickCount(0);
      }, GAME_CONSTANTS.LOGO_ANGRY_TIMEOUT);
    } else {
      setLogoState("shocked");
      logoTimeoutRef.current = setTimeout(() => {
        setLogoState("normal");
        setLogoClickCount(0);
      }, GAME_CONSTANTS.LOGO_SHOCKED_TIMEOUT);
    }
  };

  const getFeedbackMessage = () => {
    if (score >= GAME_CONSTANTS.FEEDBACK_AMAZING) return t("feedback.amazing");
    if (score >= GAME_CONSTANTS.FEEDBACK_GREAT) return t("feedback.greatJob");
    if (score >= GAME_CONSTANTS.FEEDBACK_GOOD) return t("feedback.keepTrying");
    return t("feedback.tryAgain");
  };

  const loadLeaderboard = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("autoplay") === "true") {
      setIsLoadingLeaderboard(true);
      setLeaderboardError(null);
      await new Promise(resolve => setTimeout(resolve, 300));
      setLeaderboardEntries([
        { id: "1", name: "Roy ⚽", score: 18, timestamp: { seconds: Date.now()/1000 } },
        { id: "2", name: "CatLover 🐾", score: 15, timestamp: { seconds: Date.now()/1000 - 3600 } },
        { id: "3", name: "SoccerPro", score: 12, timestamp: { seconds: Date.now()/1000 - 7200 } },
        { id: "4", name: "GK_Milo 🐈", score: 10, timestamp: { seconds: Date.now()/1000 - 10800 } },
        { id: "5", name: "StrikerLeo", score: 8, timestamp: { seconds: Date.now()/1000 - 14400 } },
      ]);
      setIsLoadingLeaderboard(false);
      return;
    }

    if (!isFirebaseConfigured) {
      setLeaderboardError(t("leaderboard.notConfigured"));
      return;
    }
    setIsLoadingLeaderboard(true);
    setLeaderboardError(null);
    try {
      const data = await fetchLeaderboard();
      setLeaderboardEntries(data);
    } catch (e: any) {
      console.error("Error loading leaderboard:", e);
      setLeaderboardError(t("leaderboard.error"));
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleSubmitScore = async () => {
    if (!nickname.trim()) return;
    setSubmittingScore(true);
    setSubmitError(null);
    try {
      const cleanName = nickname.trim().substring(0, 12);
      localStorage.setItem("game-nickname", cleanName);
      await submitScore(cleanName, score);
      setScoreSubmitted(true);
      await loadLeaderboard();
      setViewState("leaderboard");
    } catch (e) {
      console.error("Submission failed:", e);
      setSubmitError(t("leaderboard.error"));
    } finally {
      setSubmittingScore(false);
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden font-sans touch-none select-none"
      style={{ background: "var(--color-bg)", height: "100dvh" }}
    >
      {/* Phaser Game Canvas */}
      <PhaserGame />

      {/* Volume Switcher */}
      <div className="volume-toggle-container">
        <button
          onClick={toggleMute}
          className="volume-toggle-btn"
          aria-label="Toggle Volume"
        >
          {isMuted ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          )}
        </button>
      </div>

      {/* Language Switcher */}
      {(gameState === "start" || gameState === "gameover") && (
        <div className="lang-toggle-container">
          <div onClick={toggleLanguage} className="lang-toggle-pill">
            <span className={`lang-item ${lang === "zh-TW" ? "active" : ""}`}>
              繁中
            </span>
            <span className={`lang-item ${lang === "en" ? "active" : ""}`}>
              EN
            </span>
          </div>
        </div>
      )}

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
        {/* HUD */}
        {gameState === "playing" && (
          <div className="p-4 flex justify-between items-start pt-safe w-full max-w-md mx-auto anim-slide-down mt-2">
            {/* Score Pill */}
            <div key={scoreAnimKey} className="hud-pill anim-score-pop">
              <span className="hud-label">{t("hud.goal")}</span> {score}
            </div>
            {/* Timer Pill */}
            <div
              className={`hud-pill ${timer <= 5 ? "hud-pill-critical" : timer <= 10 ? "hud-pill-warning" : ""}`}
            >
              <span className="hud-label">{t("hud.time")}</span> 00:
              {timer.toString().padStart(2, "0")}
            </div>
          </div>
        )}

        {/* Start Screen */}
        {gameState === "start" && (
          <StartScreen
            logoState={logoState}
            handleLogoClick={handleLogoClick}
            startGame={startGame}
            showLeaderboardFromStart={showLeaderboardFromStart}
            setShowLeaderboardFromStart={setShowLeaderboardFromStart}
            loadLeaderboard={loadLeaderboard}
            leaderboardEntries={leaderboardEntries}
            isLoadingLeaderboard={isLoadingLeaderboard}
            leaderboardError={leaderboardError}
          />
        )}

        {/* Game Over Screen */}
        {gameState === "gameover" && (
          <GameOverScreen
            score={score}
            bestScore={bestScore}
            isNewBest={isNewBest}
            viewState={viewState}
            setViewState={setViewState}
            nickname={nickname}
            setNickname={setNickname}
            isQualify={isQualify}
            scoreSubmitted={scoreSubmitted}
            submittingScore={submittingScore}
            handleSubmitScore={handleSubmitScore}
            loadLeaderboard={loadLeaderboard}
            leaderboardEntries={leaderboardEntries}
            isLoadingLeaderboard={isLoadingLeaderboard}
            leaderboardError={leaderboardError}
            restartGame={restartGame}
            backToMenu={backToMenu}
            getFeedbackMessage={getFeedbackMessage}
            isFirebaseConfigured={isFirebaseConfigured}
            submitError={submitError}
          />
        )}
      </div>

      {/* Save Zone Guide Box */}
      {(gameState === "playing" || gameState === "countdown") && (
        <div
          className={`save-zone-container pointer-events-none ${gameState === "playing" ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"}`}
        >
          <div className="save-zone-guide">
            <span className="save-zone-label">{t("hud.saveZone")}</span>
          </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {gameState === "countdown" && (
        <div className="absolute top-[25%] left-0 right-0 flex justify-center pointer-events-none z-20">
          <div key={countdown} className="countdown-number anim-countdown-pop">
            {countdown}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
