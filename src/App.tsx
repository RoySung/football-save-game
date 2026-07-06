import { useState, useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { EventBus } from './game/EventBus';

function App() {
    const [score, setScore] = useState(0);
    const [timer, setTimer] = useState(30);
    const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');

    useEffect(() => {
        EventBus.on('game-started', () => {
            setGameState('playing');
        });

        EventBus.on('update-score', (newScore: number) => {
            setScore(newScore);
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

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gray-950 font-sans touch-none select-none">
            {/* Phaser Game Canvas */}
            <PhaserGame />

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between">
                
                {/* HUD */}
                {gameState === 'playing' && (
                    <div className="p-4 flex justify-between items-start pt-safe w-full max-w-md mx-auto">
                        <div className="bg-white/20 backdrop-blur-md px-4 sm:px-6 py-2 rounded-2xl text-white font-bold text-xl sm:text-2xl shadow-lg border border-white/30 flex items-center gap-2">
                            <span>⚽</span> {score}
                        </div>
                        <div className="bg-white/20 backdrop-blur-md px-4 sm:px-6 py-2 rounded-2xl text-white font-bold text-xl sm:text-2xl shadow-lg border border-white/30 flex items-center gap-2">
                            <span>⏱️</span> 00:{timer.toString().padStart(2, '0')}
                        </div>
                    </div>
                )}

                {/* Start Screen */}
                {gameState === 'start' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
                        <div className="bg-white/10 p-8 rounded-3xl border border-white/20 flex flex-col items-center max-w-[90%] w-sm mx-4 text-center shadow-2xl">
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 drop-shadow-md">Football Save</h1>
                            <p className="text-gray-200 mb-8 leading-relaxed text-sm sm:text-base">
                                點擊進入畫面的足球進行撲救！<br/><br/>
                                必須等球飛入<span className="text-emerald-400 font-bold mx-1">下方區域</span>才算成功。<br/>
                                若過早點擊則無效。<br/><br/>
                                隨時間流逝，球速會越來越快！
                            </p>
                            <button 
                                onClick={startGame}
                                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold py-4 px-12 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transform transition hover:scale-105 active:scale-95 text-xl w-full"
                            >
                                開始遊戲
                            </button>
                        </div>
                    </div>
                )}

                {/* Game Over Screen */}
                {gameState === 'gameover' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md pointer-events-auto">
                        <div className="bg-white/10 p-8 rounded-3xl border border-white/20 flex flex-col items-center max-w-[90%] w-sm mx-4 text-center shadow-2xl animate-[fadeIn_0.5s_ease-out]">
                            <h2 className="text-3xl font-bold text-white mb-2">時間到！</h2>
                            <p className="text-gray-300 mb-4">總共撲救成功</p>
                            <div className="text-6xl font-black text-emerald-400 mb-8 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                                {score} <span className="text-2xl text-white font-bold">球</span>
                            </div>
                            <button 
                                onClick={restartGame}
                                className="bg-white/20 hover:bg-white/30 border border-white/40 text-white font-bold py-4 px-10 rounded-full shadow-lg transition transform hover:scale-105 active:scale-95 w-full text-lg"
                            >
                                再玩一次
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Guide line for Save Zone (Optional, for better UX) */}
            {gameState === 'playing' && (
                <div className="absolute bottom-[50%] w-full border-t-2 border-emerald-500/30 border-dashed pointer-events-none shadow-[0_-2px_10px_rgba(16,185,129,0.1)]"></div>
            )}
        </div>
    );
}

export default App;
