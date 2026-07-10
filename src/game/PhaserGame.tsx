import { useEffect, useRef, memo } from 'react';
import { Game } from 'phaser';
import { config } from './GameConfig';

export const PhaserGame = memo(() => {
    const gameRef = useRef<Game | null>(null);

    useEffect(() => {
        if (!gameRef.current) {
            gameRef.current = new Game(config);
        }

        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true);
                gameRef.current = null;
            }
        };
    }, []);

    return <div id="phaser-container" className="absolute inset-0 w-full h-full" />;
});
