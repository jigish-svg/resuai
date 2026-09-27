'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import BrandLogo from '@/components/brand/BrandLogo';

const GRID = 20;
const CELL = 22;
const TICK_MS = 130;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pt = { x: number; y: number };

function rnd(max: number) {
  return Math.floor(Math.random() * max);
}

function randFood(snake: Pt[]): Pt {
  let pt: Pt;
  do {
    pt = { x: rnd(GRID), y: rnd(GRID) };
  } while (snake.some((s) => s.x === pt.x && s.y === pt.y));
  return pt;
}

const INITIAL_SNAKE: Pt[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

export default function OfflineGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<Pt[]>(INITIAL_SNAKE.map((p) => ({ ...p })));
  const dirRef = useRef<Dir>('RIGHT');
  const nextDirRef = useRef<Dir>('RIGHT');
  const foodRef = useRef<Pt>(randFood(INITIAL_SNAKE));
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const snake = snakeRef.current;
    const food = foodRef.current;

    // Background
    ctx.fillStyle = '#EEF8F6';
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);

    // Grid dots
    ctx.fillStyle = 'rgba(72,132,90,0.08)';
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        ctx.beginPath();
        ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Food
    ctx.fillStyle = '#80240F';
    ctx.beginPath();
    ctx.roundRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6, 4);
    ctx.fill();

    // Snake
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#48845A' : `rgba(72,132,90,${0.9 - i * 0.02})`;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL + 2, seg.y * CELL + 2, CELL - 4, CELL - 4, isHead ? 6 : 3);
      ctx.fill();
    });
  }, []);

  const tick = useCallback(() => {
    if (gameOverRef.current) return;

    const snake = snakeRef.current;
    dirRef.current = nextDirRef.current;
    const head = snake[0];

    let nx = head.x;
    let ny = head.y;
    if (dirRef.current === 'UP') ny--;
    if (dirRef.current === 'DOWN') ny++;
    if (dirRef.current === 'LEFT') nx--;
    if (dirRef.current === 'RIGHT') nx++;

    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || snake.some((s) => s.x === nx && s.y === ny)) {
      gameOverRef.current = true;
      setGameOver(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const newSnake = [{ x: nx, y: ny }, ...snake];
    const food = foodRef.current;

    if (nx === food.x && ny === food.y) {
      scoreRef.current += 10;
      setScore(scoreRef.current);
      foodRef.current = randFood(newSnake);
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
    draw();
  }, [draw]);

  const startGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE.map((p) => ({ ...p }));
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    foodRef.current = randFood(INITIAL_SNAKE);
    scoreRef.current = 0;
    gameOverRef.current = false;
    setScore(0);
    setGameOver(false);
    setStarted(true);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, TICK_MS);
    draw();
  }, [tick, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!started) { startGame(); return; }
      const map: Record<string, Dir> = {
        ArrowUp: 'UP', w: 'UP', W: 'UP',
        ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
        ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
        ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
      };
      const d = map[e.key];
      if (!d) return;
      const opposites: Record<Dir, Dir> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
      if (d !== opposites[dirRef.current]) nextDirRef.current = d;
      e.preventDefault();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started, startGame]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Touch controls
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (!started) { startGame(); return; }
    if (Math.abs(dx) > Math.abs(dy)) {
      const d = dx > 0 ? 'RIGHT' : 'LEFT';
      if (d !== (dirRef.current === 'RIGHT' ? 'LEFT' : 'RIGHT')) nextDirRef.current = d;
    } else {
      const d = dy > 0 ? 'DOWN' : 'UP';
      if (d !== (dirRef.current === 'DOWN' ? 'UP' : 'DOWN')) nextDirRef.current = d;
    }
    touchStart.current = null;
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-8 px-4 select-none">
      <div className="flex flex-col items-center gap-2">
        <BrandLogo />
        <p className="text-sm text-brand-brandy font-medium mt-2">You&apos;re offline</p>
        <p className="text-xs text-ink-muted">Play while you wait for the connection to restore.</p>
      </div>

      <div
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={GRID * CELL}
          height={GRID * CELL}
          className="rounded-xl border border-ink/10 shadow-sm cursor-pointer"
          onClick={() => { if (!started || gameOver) startGame(); }}
        />

        {/* Overlay: start screen */}
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-bg/80 rounded-xl backdrop-blur-sm">
            <p className="text-2xl font-bold text-ink mb-2">Snake</p>
            <p className="text-sm text-ink-soft mb-6">Eat the red — avoid the walls.</p>
            <button
              onClick={startGame}
              className="bg-brand-sea-green hover:bg-opacity-90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-colors"
            >
              Start game
            </button>
            <p className="text-xs text-ink-muted mt-4">WASD or Arrow keys · Swipe on mobile</p>
          </div>
        )}

        {/* Overlay: game over */}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-bg/80 rounded-xl backdrop-blur-sm">
            <p className="text-2xl font-bold text-ink mb-1">Game Over</p>
            <p className="text-sm text-ink-soft mb-2">Score: <span className="font-bold text-ink">{score}</span></p>
            <button
              onClick={startGame}
              className="bg-brand-sea-green hover:bg-opacity-90 text-white px-8 py-3 rounded-lg font-semibold text-sm transition-colors mt-4"
            >
              Play again
            </button>
          </div>
        )}
      </div>

      {/* Score */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-brand-sea-green" />
          <span className="text-ink-soft">Snake</span>
        </div>
        <div className="text-ink font-semibold tabular-nums">Score: {score}</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-brand-brandy" />
          <span className="text-ink-soft">Food</span>
        </div>
      </div>

      <p className="text-xs text-ink-muted">
        This page shows when GetJobFit.in is unreachable.{' '}
        <button onClick={() => window.location.reload()} className="underline hover:text-ink">
          Try reconnecting
        </button>
      </p>
    </div>
  );
}
