import { useState, useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { EventBus } from './game/EventBus';
import { useTranslation } from 'react-i18next';
import { type Language } from './locales';
import './App.css';

function App() {
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(30);
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
    const [scoreAnimKey, setScoreAnimKey] = useState(0);
    const { t, i18n } = useTranslation();
    const lang = i18n.language as Language;

    useEffect(() => {
        document.title = t('metaTitle');
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.setAttribute('content', t('metaDesc'));
        }
    }, [lang, t]);

    useEffect(() => {
        EventBus.on('game-started', () => {
            setGameState('playing');
        });

        EventBus.on('update-score', (newScore: number) => {
            setScore(newScore);
            setScoreAnimKey(prev => prev + 1);
        });

        EventBus.on('update-timer', (newTime: number) => {
            setTimer(newTime);
        });

        EventBus.on('game-over', () => {
            setGameState('gameover');
        });

        return () => {
            EventBus.removeListener('game-started');
            EventBus.removeListener('update-score');
            EventBus.removeListener('update-timer');
            EventBus.removeListener('game-over');
        };
    }, []);

    const startGame = () => {
        EventBus.emit('start-game');
    };

    const restartGame = () => {
        setScore(0);
        setTimer(30);
        setGameState('playing');
        EventBus.emit('restart-game');
        // Add a slight delay before starting to ensure scene restarted properly
        setTimeout(() => {
            EventBus.emit('start-game');
        }, 100);
    };

    const toggleLanguage = () => {
        const nextLang = lang === 'en' ? 'zh-TW' : 'en';
        i18n.changeLanguage(nextLang);
        localStorage.setItem('game-lang', nextLang);
    };

    const getFeedbackMessage = () => {
        if (score >= 15) return t('feedback.amazing');
        if (score >= 10) return t('feedback.greatJob');
        if (score >= 5) return t('feedback.keepTrying');
        return t('feedback.tryAgain');
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden font-sans touch-none select-none"
             style={{ background: 'var(--color-bg)' }}>
            {/* Phaser Game Canvas */}
            <PhaserGame />

            {/* Language Switcher */}
            {gameState !== 'playing' && (
                <div className="lang-toggle-container">
                    <div 
                        onClick={toggleLanguage}
                        className="lang-toggle-pill"
                    >
                        <span className={`lang-item ${lang === 'zh-TW' ? 'active' : ''}`}>
                            繁中
                        </span>
                        <span className={`lang-item ${lang === 'en' ? 'active' : ''}`}>
                            EN
                        </span>
                    </div>
                </div>
            )}

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
                
                {/* HUD */}
                {gameState === 'playing' && (
                    <div className="p-4 flex justify-between items-start pt-safe w-full max-w-md mx-auto anim-slide-down">
                        {/* Score Pill */}
                        <div key={scoreAnimKey} className="hud-pill anim-score-pop">
                            <span className="hud-label">{t('hud.goal')}</span> {score}
                        </div>
                        {/* Timer Pill */}
                        <div className={`hud-pill ${timer <= 10 ? 'hud-pill-warning' : ''}`}>
                            <span className="hud-label">{t('hud.time')}</span> 00:{timer.toString().padStart(2, '0')}
                        </div>
                    </div>
                )}

                {/* Start Screen */}
                {gameState === 'start' && (
                    <div className="absolute inset-0 flex items-center justify-center overlay-bright pointer-events-auto">
                        <div className="game-card p-8 flex flex-col items-center max-w-[90%] w-sm mx-4 text-center anim-bounce-in">
                            {/* Logo */}
                            <img 
                                src="/assets/logo.png" 
                                alt="Football Save" 
                                className="game-logo mb-4 anim-float"
                            />
                            
                            {/* Instructions */}
                            <div className="info-bubble mb-6 text-left">
                                <p className="leading-relaxed text-sm sm:text-base" style={{ color: 'var(--color-text)' }}>
                                    {t('instructions.part1')}<br/><br/>
                                    {t('instructions.part2')}<span className="text-accent-green mx-1">{t('instructions.bottomZone')}</span>{t('instructions.part3')}<br/>
                                    {t('instructions.part4')}<br/><br/>
                                    {t('instructions.part5')}
                                </p>
                            </div>

                            {/* Start Button */}
                            <button 
                                onClick={startGame}
                                className="game-btn game-btn-primary py-4 px-12 text-xl w-full anim-float"
                                style={{ animationDelay: '0.3s' }}
                            >
                                {t('startGame')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Game Over Screen */}
                {gameState === 'gameover' && (
                    <div className="absolute inset-0 flex items-center justify-center overlay-celebration pointer-events-auto">
                        <div className="game-card p-8 flex flex-col items-center max-w-[90%] w-sm mx-4 text-center anim-bounce-in">
                            {/* Title */}
                            <h2 className="game-title text-3xl mb-2">
                                {t('timesUp')}
                            </h2>
                            
                            <p className="mb-4 font-semibold" style={{ color: 'var(--color-text-light)' }}>
                                {t('totalSaves')}
                            </p>

                            {/* Score Display */}
                            <div className="flex items-center gap-3 mb-8">
                                <span className="star-decoration text-3xl anim-pulse">★</span>
                                <span className="score-display text-7xl">{score}</span>
                                <span className="star-decoration text-3xl anim-pulse" style={{ animationDelay: '0.5s' }}>★</span>
                            </div>

                            <p className="text-lg font-bold mb-6" style={{ color: 'var(--color-text)' }}>
                                {getFeedbackMessage()}
                            </p>

                            {/* Restart Button */}
                            <button 
                                onClick={restartGame}
                                className="game-btn game-btn-secondary py-4 px-10 w-full text-lg anim-float"
                                style={{ animationDelay: '0.5s' }}
                            >
                                {t('restartGame')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Guide line for Save Zone */}
            {gameState === 'playing' && (
                <div className="absolute bottom-[50%] w-full save-zone-guide pointer-events-none"></div>
            )}
        </div>
    );
}

export default App;
