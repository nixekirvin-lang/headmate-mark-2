import React, { useState } from 'react';
import { Gamepad2, Music, Puzzle, Palette, Coffee, Brain, Zap } from 'lucide-react';

interface Game {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  url: string;
  category: 'relaxing' | 'puzzle' | 'creative' | 'music' | 'casual';
  color: string;
}

const games: Game[] = [
  // Puzzle Games
  {
    id: 'wordle',
    name: 'Wordle',
    description: 'Daily word puzzle game',
    icon: Puzzle,
    url: 'https://www.nytimes.com/games/wordle',
    category: 'puzzle',
    color: '#10b981'
  },
  {
    id: 'connections',
    name: 'Connections',
    description: 'Group words by category',
    icon: Puzzle,
    url: 'https://www.nytimes.com/games/connections', 
    category: 'puzzle',
    color: '#f59e0b'
  },
  {
    id: 'strands',
    name: 'Strands',
    description: 'Find hidden words in letter grid',
    icon: Puzzle,
    url: 'https://www.nytimes.com/games/strands',
    category: 'puzzle',
    color: '#8b5cf6'
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    description: 'Classic logic puzzle',
    icon: Puzzle,
    url: 'https://minesweeperonline.com/',
    category: 'puzzle',
    color: '#6b7280'
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Number puzzle challenge',
    icon: Puzzle,
    url: 'https://sudoku.com/',
    category: 'puzzle',
    color: '#3b82f6'
  },
  // Casual Games
  {
    id: 'cookieclicker',
    name: 'Cookie Clicker',
    description: 'Satisfying idle clicker game',
    icon: Gamepad2,
    url: 'https://cookieclicker.com/',
    category: 'casual',
    color: '#8b5cf6'
  },
  {
    id: 'pacman',
    name: 'Pac-Man',
    description: 'Classic arcade game',
    icon: Gamepad2,
    url: 'https://www.google.com/pacman/',
    category: 'casual',
    color: '#fbbf24'
  },
  {
    id: 'tetris',
    name: 'Tetris',
    description: 'Classic block-stacking game',
    icon: Gamepad2,
    url: 'https://tetris.com/play-tetris',
    category: 'casual',
    color: '#ef4444'
  },
  {
    id: 'chess',
    name: 'Chess',
    description: 'Play chess against AI',
    icon: Gamepad2,
    url: 'https://chess.com/',
    category: 'casual',
    color: '#1e293b'
  },
  {
    id: 'checkers',
    name: 'Checkers',
    description: 'Classic board game',
    icon: Gamepad2,
    url: 'https://gametable.org/games/checkers/',
    category: 'casual',
    color: '#dc2626'
  },
  {
    id: 'solitaire',
    name: 'Solitaire',
    description: 'Classic card game',
    icon: Gamepad2,
    url: 'https://solitaire.com/',
    category: 'casual',
    color: '#dc2626'
  },
  {
    id: 'snake',
    name: 'Snake',
    description: 'Classic snake game',
    icon: Gamepad2,
    url: 'https://snake.io/',
    category: 'casual',
    color: '#22c55e'
  },
  // Creative Games
  {
    id: 'skribbl',
    name: 'Skribbl.io',
    description: 'Drawing and guessing game',
    icon: Palette,
    url: 'https://skribbl.io/',
    category: 'creative',
    color: '#14b8a6'
  },
  {
    id: 'garticphone',
    name: 'Gartic Phone',
    description: 'Draw and guess chain game',
    icon: Palette,
    url: 'https://garticphone.com/',
    category: 'creative',
    color: '#f97316'
  },
  {
    id: 'ponytown',
    name: 'Pony Town',
    description: 'Multiplayer social game with customizable characters',
    icon: Palette,
    url: 'https://pony.town/',
    category: 'creative',
    color: '#ec4899'
  },
  // Relaxing
  {
    id: 'mynoise',
    name: 'myNoise',
    description: 'Custom ambient sound generator',
    icon: Music,
    url: 'https://mynoise.net/',
    category: 'relaxing',
    color: '#7c3aed'
  },
  // Music
  {
    id: 'lofigirl',
    name: 'Lofi Girl',
    description: 'Beats to relax/study to',
    icon: Music,
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    category: 'music',
    color: '#f472b6'
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'Music for every mood',
    icon: Music,
    url: 'https://open.spotify.com/',
    category: 'music',
    color: '#1db954'
  }
];

const categories = [
  { id: 'relaxing', label: 'Relaxing', icon: Coffee, color: '#7c3aed' },
  { id: 'puzzle', label: 'Puzzles', icon: Puzzle, color: '#10b981' },
  { id: 'creative', label: 'Creative', icon: Palette, color: '#ec4899' },
  { id: 'music', label: 'Music', icon: Music, color: '#f59e0b' },
  { id: 'casual', label: 'Casual', icon: Gamepad2, color: '#3b82f6' },
];

const Minigames: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredGames = selectedCategory 
    ? games.filter(g => g.category === selectedCategory)
    : games;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Minigames</h2>
        <p className="text-[var(--text-secondary)]">Take a break and play these browser-based games.</p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            !selectedCategory 
              ? 'bg-[var(--accent-main)] text-white shadow-lg shadow-[var(--accent-glow)]' 
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]'
          }`}
        >
          All Games
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
              selectedCategory === cat.id 
                ? 'text-white shadow-lg' 
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]'
            }`}
            style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
          >
            <cat.icon size={16} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGames.map(game => (
          <a
            key={game.id}
            href={game.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="bg-[var(--bg-surface)] rounded-3xl p-6 border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-all hover:shadow-lg hover:shadow-[var(--accent-glow)]">
              <div className="flex items-start gap-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${game.color}20` }}
                >
                  <span style={{ color: game.color }}>
                    <game.icon size={28} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-main)] transition-colors">
                    {game.name}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mt-1">
                    {game.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span 
                  className="text-xs font-bold uppercase px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${game.color}20`, color: game.color }}
                >
                  {game.category}
                </span>
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 group-hover:text-[var(--accent-main)]">
                  Play 
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default Minigames;
