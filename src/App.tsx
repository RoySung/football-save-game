import { useState, useEffect, useRef } from "react";
import { PhaserGame } from "./game/PhaserGame";
import { EventBus } from "./game/EventBus";
import { useTranslation } from "react-i18next";
import { type Language } from "./locales";
import "./App.css";

function App() {
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(30);
  const [gameState, setGameState] = useState<
    "start" | "countdown" | "playing" | "gameover"
  >("start");
  const [scoreAnimKey, setScoreAnimKey] = useState(0);
  const [countdown, setCountdown] = useState(3);
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
  const [logoState, setLogoState] = useState<"normal" | "shocked" | "angry">("normal");
  const [logoClickCount, setLogoClickCount] = useState(0);
  const logoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const startCountdownFlow = (onFinish: () => void) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setGameState("countdown");
    setCountdown(3);

    let current = 3;
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
    startCountdownFlow(() => {
      EventBus.emit("start-game");
    });
  };

  const restartGame = () => {
    setScore(0);
    setTimer(30);
    setIsNewBest(false);
    EventBus.emit("restart-game");

    startCountdownFlow(() => {
      EventBus.emit("start-game");
    });
  };

  const backToMenu = () => {
    setScore(0);
    setTimer(30);
    setIsNewBest(false);
    EventBus.emit("restart-game");
    setGameState("start");
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

    if (nextCount >= 5) {
      setLogoState("angry");
      logoTimeoutRef.current = setTimeout(() => {
        setLogoState("normal");
        setLogoClickCount(0);
      }, 3000);
    } else {
      setLogoState("shocked");
      logoTimeoutRef.current = setTimeout(() => {
        setLogoState("normal");
        setLogoClickCount(0);
      }, 1000);
    }
  };

  const getFeedbackMessage = () => {
    if (score >= 15) return t("feedback.amazing");
    if (score >= 10) return t("feedback.greatJob");
    if (score >= 5) return t("feedback.keepTrying");
    return t("feedback.tryAgain");
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden font-sans touch-none select-none"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Phaser Game Canvas */}
      <PhaserGame />

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
          <div className="p-4 flex justify-between items-start pt-safe w-full max-w-md mx-auto anim-slide-down">
            {/* Score Pill */}
            <div key={scoreAnimKey} className="hud-pill anim-score-pop">
              <span className="hud-label">{t("hud.goal")}</span> {score}
            </div>
            {/* Timer Pill */}
            <div
              className={`hud-pill ${timer <= 10 ? "hud-pill-warning" : ""}`}
            >
              <span className="hud-label">{t("hud.time")}</span> 00:
              {timer.toString().padStart(2, "0")}
            </div>
          </div>
        )}

        {/* Start Screen */}
        {gameState === "start" && (
          <div className="absolute inset-0 flex items-center justify-center overlay-bright pointer-events-auto">
            <div className="game-card p-8 flex flex-col items-center max-w-[90%] w-[440px] mx-4 text-center anim-bounce-in">
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

              {/* Start Button */}
              <button
                onClick={startGame}
                className="game-btn game-btn-primary py-4 px-12 text-xl w-full"
              >
                {t("startGame")}
              </button>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 flex items-center justify-center overlay-celebration pointer-events-auto">
            <div className="game-card p-6 pb-12 flex flex-col items-center max-w-[90%] w-[340px] mx-4 text-center anim-bounce-in">
              {/* Top Badge: NEW BEST or TIMES UP */}
              <div className="badge-new-best">
                {isNewBest ? t("newBest") : t("timesUp")}
              </div>

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
                style={{ marginBottom: "24px" }}
              >
                {t("savesEarned", { count: score })}
              </div>

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
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Zone Guide Box */}
      {(gameState === "playing" || gameState === "countdown") && (
        <div
          className={`save-zone-container pointer-events-none transition-all duration-1000 ${gameState === "playing" ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"}`}
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
