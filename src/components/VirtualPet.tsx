import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { 
  Pet, 
  PetType, 
  PetMood, 
  PET_EMOJIS, 
  PET_TYPE_NAMES, 
  ACTION_COOLDOWNS,
  PetParticleEffect,
  DailyQuest,
  DAILY_QUEST_TEMPLATES,
  PET_ITEMS,
  PetItem,
  PET_ACHIEVEMENTS,
  PetAchievement
} from '../types';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';
import { 
  Heart, Zap, Sparkles, Utensils, Gamepad2, Droplets, Moon, Star, Loader2,
  Trophy, Gift, Target, Package, X, Play, Clock, Award, ChevronRight
} from 'lucide-react';

// Calculate time decay for pet stats
const calculateDecay = (lastUpdated: string): Partial<Pet> => {
  const now = new Date();
  const last = new Date(lastUpdated);
  const secondsPassed = Math.floor((now.getTime() - last.getTime()) / 1000);
  const decayAmount = Math.floor(secondsPassed / 300);
  
  return {
    hunger: Math.max(0, 100 - decayAmount),
    happiness: Math.max(0, 100 - decayAmount),
    cleanliness: Math.max(0, 100 - decayAmount),
    energy: Math.max(0, 100 - decayAmount),
  };
};

// Calculate mood based on stats
const calculateMood = (pet: Pet): PetMood => {
  const avgStats = (pet.hunger + pet.happiness + pet.cleanliness + pet.energy) / 4;
  
  if (pet.energy < 20) return 'sleeping';
  if (avgStats >= 80) return 'happy';
  if (avgStats >= 60) return 'content';
  if (avgStats >= 40) return 'neutral';
  if (avgStats >= 20) return 'sad';
  return 'upset';
};

// Get experience needed for next level
const getExpForLevel = (level: number): number => {
  return level * 100 + Math.floor(level * level * 10);
};

// Check if pet should level up
const checkLevelUp = (pet: Pet): { leveledUp: boolean; newLevel: number; newExp: number } => {
  const expNeeded = getExpForLevel(pet.level);
  if (pet.experience >= expNeeded) {
    return { leveledUp: true, newLevel: pet.level + 1, newExp: pet.experience - expNeeded };
  }
  return { leveledUp: false, newLevel: pet.level, newExp: pet.experience };
};

// Generate daily quests
const generateDailyQuests = (): DailyQuest[] => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  // Select 3 random quests
  const shuffled = [...DAILY_QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);
  
  return selected.map(q => ({
    ...q,
    progress: 0,
    completed: false,
    expiresAt: tomorrow.toISOString(),
  }));
};

// Check if daily quests need to be reset
const shouldResetDailyQuests = (lastReset?: string): boolean => {
  if (!lastReset) return true;
  const last = new Date(lastReset);
  const now = new Date();
  return now.getDate() !== last.getDate() || now.getMonth() !== last.getMonth();
};

// Particle effect component
const ParticleEffect: React.FC<{ effect: PetParticleEffect; onComplete: () => void }> = ({ effect, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  const icons: Record<string, string> = {
    hearts: '💕',
    stars: '⭐',
    sparkles: '✨',
    food: '🍎',
    energy: '⚡',
    confetti: '🎉',
  };
  
  return (
    <div 
      className="absolute text-2xl animate-pet-particle"
      style={{
        left: effect.x,
        top: effect.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {icons[effect.type] || '✨'}
    </div>
  );
};

// ===== MINIGAME COMPONENTS =====

// Tap Dash Game
interface TapGameProps {
  onComplete: (score: number) => void;
  onClose: () => void;
}

const TapGame: React.FC<TapGameProps> = ({ onComplete, onClose }) => {
  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  
  useEffect(() => {
    if (gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameOver]);
  
  const handleTap = () => {
    if (gameOver) return;
    setTaps(prev => prev + 1);
  };
  
  const handleComplete = () => {
    const exp = Math.floor(taps * 0.5);
    onComplete(taps);
  };
  
  const getGrade = () => {
    if (taps >= 50) return { grade: 'S', color: 'text-yellow-400' };
    if (taps >= 40) return { grade: 'A', color: 'text-green-400' };
    if (taps >= 30) return { grade: 'B', color: 'text-blue-400' };
    if (taps >= 20) return { grade: 'C', color: 'text-purple-400' };
    return { grade: 'D', color: 'text-gray-400' };
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl p-6 max-w-sm w-full text-center border-2 border-[var(--accent-main)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Tap Dash</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={24} />
          </button>
        </div>
        
        {!gameOver ? (
          <>
            <div className="text-6xl font-bold text-[var(--accent-main)] mb-4">{timeLeft}</div>
            <div className="text-4xl font-bold text-[var(--text-primary)] mb-6">{taps}</div>
            <button
              onClick={handleTap}
              className="w-full py-8 bg-[var(--accent-main)] hover:opacity-90 rounded-xl text-2xl font-bold text-white active:scale-95 transition-transform"
            >
              TAP! 👆
            </button>
          </>
        ) : (
          <div className="animate-fade-in">
            <div className={cn("text-6xl font-bold mb-4", getGrade().color)}>{getGrade().grade}</div>
            <div className="text-3xl font-bold text-[var(--text-primary)] mb-2">{taps} taps</div>
            <div className="text-[var(--accent-main)] font-medium mb-6">+{Math.floor(taps * 0.5)} XP</div>
            <button
              onClick={handleComplete}
              className="w-full py-3 bg-[var(--accent-main)] hover:opacity-90 rounded-xl font-bold text-white"
            >
              Collect Rewards
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Reaction Game
interface ReactionGameProps {
  onComplete: (score: number) => void;
  onClose: () => void;
}

const ReactionGame: React.FC<ReactionGameProps> = ({ onComplete, onClose }) => {
  const [gameState, setGameState] = useState<'waiting' | 'ready' | 'go' | 'finished'>('waiting');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [attempts, setAttempts] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const startGame = () => {
    setGameState('ready');
    setReactionTime(null);
    setAttempts(0);
    
    const delay = Math.random() * 2000 + 1500;
    timeoutRef.current = setTimeout(() => {
      setGameState('go');
      setStartTime(Date.now());
    }, delay);
  };
  
  const handleClick = () => {
    if (gameState === 'ready') {
      // Clicked too early
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setGameState('waiting');
      setAttempts(0);
    } else if (gameState === 'go') {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setAttempts(prev => prev + 1);
      
      if (!bestTime || time < bestTime) {
        setBestTime(time);
      }
      
      if (attempts >= 2) {
        setGameState('finished');
      } else {
        setGameState('ready');
        const delay = Math.random() * 1500 + 1000;
        timeoutRef.current = setTimeout(() => {
          setGameState('go');
          setStartTime(Date.now());
        }, delay);
      }
    } else if (gameState === 'waiting' || gameState === 'finished') {
      startGame();
    }
  };
  
  const handleComplete = () => {
    if (bestTime) {
      // Score is inverted - faster is better
      const score = Math.max(0, 1000 - bestTime);
      onComplete(score);
    } else {
      onComplete(0);
    }
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);
  
  const getMessage = () => {
    if (gameState === 'waiting') return 'Click to start!';
    if (gameState === 'ready') return 'Wait for it...';
    if (gameState === 'go') return 'CLICK NOW!';
    if (gameState === 'finished') return 'Game Over!';
    return '';
  };
  
  const getBgColor = () => {
    if (gameState === 'go') return 'bg-green-500';
    if (gameState === 'ready') return 'bg-yellow-500';
    return 'bg-[var(--bg-panel)]';
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl p-6 max-w-sm w-full text-center border-2 border-[var(--accent-main)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Quick Reflex</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={24} />
          </button>
        </div>
        
        <div className="mb-4 flex justify-between text-sm text-[var(--text-secondary)]">
          <span>Attempts: {attempts}/3</span>
          <span>Best: {bestTime ? `${bestTime}ms` : '-'}</span>
        </div>
        
        {reactionTime && (
          <div className="text-2xl font-bold text-[var(--text-primary)] mb-4">{reactionTime}ms</div>
        )}
        
        <button
          onClick={handleClick}
          className={cn(
            "w-full py-16 rounded-xl text-2xl font-bold text-white transition-all",
            getBgColor(),
            gameState === 'go' && "animate-pulse",
            (gameState === 'waiting' || gameState === 'finished') && "bg-[var(--accent-main)]"
          )}
        >
          {getMessage()}
        </button>
        
        {gameState === 'finished' && (
          <button
            onClick={handleComplete}
            className="w-full mt-4 py-3 bg-[var(--accent-main)] hover:opacity-90 rounded-xl font-bold text-white"
          >
            Collect {Math.max(0, Math.floor((1000 - (bestTime || 500)) / 10))} XP
          </button>
        )}
      </div>
    </div>
  );
};

// ===== MAIN VIRTUAL PET COMPONENT =====

const VirtualPet: React.FC = () => {
  const { user } = useAuth();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionCooldowns, setActionCooldowns] = useState<Record<string, number>>({});
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpAnimation, setLevelUpAnimation] = useState(false);
  const [particles, setParticles] = useState<PetParticleEffect[]>([]);
  const [activeTab, setActiveTab] = useState<'main' | 'minigames' | 'inventory' | 'quests' | 'achievements'>('main');
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([]);
  const [inventory, setInventory] = useState<PetItem[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showTapGame, setShowTapGame] = useState(false);
  const [showReactionGame, setShowReactionGame] = useState(false);
  const [showItemMenu, setShowItemMenu] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  
  // Creation state
  const [selectedType, setSelectedType] = useState<PetType>('blob');
  const [petName, setPetName] = useState('');

  // Load pet from Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    const petRef = doc(db, `users/${user.uid}/pet`, 'data');
    
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 10000);
    
    const unsubscribe = onSnapshot(petRef, (snap) => {
      clearTimeout(timeoutId);
      if (snap.exists()) {
        const data = snap.data() as any;
        // Apply decay
        const decayed = calculateDecay(data.lastUpdated);
        
        // Check daily quest reset
        const shouldReset = shouldResetDailyQuests(data.lastDailyReset);
        let quests = data.dailyQuests || [];
        if (shouldReset) {
          quests = generateDailyQuests();
        }
        
        setPet({ ...data, ...decayed });
        setDailyQuests(quests);
        setInventory(data.inventory || []);
        setAchievements(data.achievements || []);
      } else {
        setPet(null);
        setDailyQuests(generateDailyQuests());
      }
      setLoading(false);
    }, (error) => {
      clearTimeout(timeoutId);
      console.error('Error loading pet:', error);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [user]);

  // Cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setActionCooldowns(prev => {
        const next: Record<string, number> = {};
        let changed = false;
        Object.entries(prev).forEach(([key, value]) => {
          if (value > 0) {
            next[key] = value - 1;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Particle cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.filter(p => Date.now() - p.createdAt < 1000));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const savePet = useCallback(async (updatedPet: any) => {
    if (!user) return;
    const petRef = doc(db, `users/${user.uid}/pet`, 'data');
    await setDoc(petRef, { 
      ...updatedPet, 
      lastUpdated: new Date().toISOString(),
      dailyQuests,
      inventory,
      achievements
    }, { merge: true });
  }, [user, dailyQuests, inventory, achievements]);

  const addParticle = useCallback((type: PetParticleEffect['type']) => {
    const newParticle: PetParticleEffect = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 50 + Math.random() * 20,
      y: 30 + Math.random() * 20,
      createdAt: Date.now(),
    };
    setParticles(prev => [...prev, newParticle]);
  }, []);

  const updateQuestProgress = useCallback((type: string) => {
    setDailyQuests(prev => prev.map(quest => {
      if (quest.type === type && !quest.completed && quest.progress < quest.target) {
        const newProgress = quest.progress + 1;
        const completed = newProgress >= quest.target;
        return { ...quest, progress: newProgress, completed };
      }
      return quest;
    }));
  }, []);

  // Check if action is allowed (cooldown + daily limit)
  const canPerformAction = useCallback((action: string): { allowed: boolean; reason: string } => {
    const actionKey = action as keyof typeof ACTION_COOLDOWNS;
    
    // Check cooldown
    if (actionCooldowns[action] > 0) {
      return { allowed: false, reason: `On cooldown (${actionCooldowns[action]}s)` };
    }
    
    // Check stat limits
    if (!pet) return { allowed: false, reason: 'No pet loaded' };
    
    switch (action) {
      case 'feed':
        if (pet.hunger >= 100) return { allowed: false, reason: 'Pet is full!' };
        break;
      case 'play':
        if (pet.energy < 20) return { allowed: false, reason: 'Too tired to play!' };
        break;
      case 'clean':
        if (pet.cleanliness >= 100) return { allowed: false, reason: 'Already clean!' };
        break;
      case 'rest':
        if (pet.energy >= 100) return { allowed: false, reason: 'Not tired!' };
        break;
    }
    
    return { allowed: true, reason: '' };
  }, [actionCooldowns, pet]);

  const checkAchievements = useCallback(async (updatedPet: any) => {
    const newAchievements = [...achievements];
    let hasNew = false;
    
    // First action achievement
    if (updatedPet.totalActionsPerformed >= 1 && !newAchievements.includes('first_steps')) {
      newAchievements.push('first_steps');
      hasNew = true;
    }
    
    // Level achievements
    if (updatedPet.level >= 5 && !newAchievements.includes('level_5')) {
      newAchievements.push('level_5');
      hasNew = true;
    }
    if (updatedPet.level >= 10 && !newAchievements.includes('level_10')) {
      newAchievements.push('level_10');
      hasNew = true;
    }
    
    // Care taker achievement
    if (updatedPet.totalActionsPerformed >= 50 && !newAchievements.includes('care_taker')) {
      newAchievements.push('care_taker');
      hasNew = true;
    }
    
    // Perfect day achievement
    const allQuestsDone = dailyQuests.every(q => q.completed);
    if (allQuestsDone && !newAchievements.includes('perfect_day')) {
      newAchievements.push('perfect_day');
      hasNew = true;
    }
    
    if (hasNew) {
      setAchievements(newAchievements);
      addParticle('confetti');
      setTimeout(() => setActionFeedback('Achievement Unlocked!'), 500);
    }
  }, [achievements, dailyQuests, addParticle]);

  const handleAction = useCallback(async (action: keyof typeof ACTION_COOLDOWNS) => {
    if (!pet || actionCooldowns[action] > 0) return;

    let updatedPet = { ...pet } as any;
    let expGained = 0;
    let particleType: PetParticleEffect['type'] = 'sparkles';

    // Initialize extended fields if they don't exist
    if (!updatedPet.totalActionsPerformed) updatedPet.totalActionsPerformed = 0;
    if (!updatedPet.totalPlayTime) updatedPet.totalPlayTime = 0;
    if (!updatedPet.dailyQuests) updatedPet.dailyQuests = dailyQuests;

    switch (action) {
      case 'feed':
        updatedPet.hunger = Math.min(100, updatedPet.hunger + 30);
        expGained = 5;
        particleType = 'food';
        updateQuestProgress('feed');
        break;
      case 'play':
        updatedPet.happiness = Math.min(100, updatedPet.happiness + 25);
        updatedPet.energy = Math.max(0, updatedPet.energy - 15);
        expGained = 10;
        particleType = 'hearts';
        updateQuestProgress('play');
        break;
      case 'clean':
        updatedPet.cleanliness = Math.min(100, updatedPet.cleanliness + 40);
        expGained = 8;
        particleType = 'sparkles';
        updateQuestProgress('clean');
        break;
      case 'rest':
        updatedPet.energy = Math.min(100, updatedPet.energy + 50);
        expGained = 3;
        particleType = 'energy';
        updateQuestProgress('rest');
        break;
    }

    updatedPet.experience += expGained;
    updatedPet.totalActionsPerformed += 1;
    
    // Check for level up
    const levelInfo = checkLevelUp(updatedPet);
    if (levelInfo.leveledUp) {
      updatedPet.level = levelInfo.newLevel;
      updatedPet.experience = levelInfo.newExp;
      setShowLevelUp(true);
      setLevelUpAnimation(true);
      setTimeout(() => setLevelUpAnimation(false), 2000);
      addParticle('confetti');
    }

    // Add particle effect
    addParticle(particleType);
    
    // Show feedback
    setActionFeedback(`+${expGained} XP`);
    setTimeout(() => setActionFeedback(null), 1500);

    setPet(updatedPet);
    
    // Save with extended data
    await savePet({ ...updatedPet, dailyQuests, inventory, achievements });
    
    // Check achievements
    await checkAchievements(updatedPet);
    
    setActionCooldowns(prev => ({ ...prev, [action]: ACTION_COOLDOWNS[action] }));
  }, [pet, actionCooldowns, dailyQuests, inventory, achievements, savePet, addParticle, updateQuestProgress, checkAchievements]);

  const useItem = useCallback(async (item: PetItem) => {
    if (!pet) return;
    
    let updatedPet = { ...pet } as any;
    let expGained = 3;
    let particleType: PetParticleEffect['type'] = 'sparkles';
    let canUse = true;
    let blockedReason = '';
    
    if (item.statAffected === 'all') {
      // Check if all stats are already at max
      if (updatedPet.hunger >= 100 && updatedPet.happiness >= 100 && 
          updatedPet.cleanliness >= 100 && updatedPet.energy >= 100) {
        canUse = false;
        blockedReason = 'All stats are full!';
      } else {
        updatedPet.hunger = Math.min(100, updatedPet.hunger + item.effect);
        updatedPet.happiness = Math.min(100, updatedPet.happiness + item.effect);
        updatedPet.cleanliness = Math.min(100, updatedPet.cleanliness + item.effect);
        updatedPet.energy = Math.min(100, updatedPet.energy + item.effect);
        particleType = 'confetti';
      }
    } else {
      // Check if specific stat is already at max
      if (updatedPet[item.statAffected] >= 100) {
        canUse = false;
        const statName = item.statAffected.charAt(0).toUpperCase() + item.statAffected.slice(1);
        blockedReason = `${statName} is already full!`;
      } else {
        updatedPet[item.statAffected] = Math.min(100, updatedPet[item.statAffected] + item.effect);
        if (item.type === 'food') particleType = 'food';
        else if (item.type === 'toy') particleType = 'hearts';
        else if (item.type === 'bed') particleType = 'energy';
      }
    }
    
    if (!canUse) {
      setActionFeedback(blockedReason);
      setTimeout(() => setActionFeedback(null), 2000);
      return;
    }
    
    // Remove item from inventory
    const newInventory = [...inventory];
    const itemIndex = newInventory.findIndex(i => i.id === item.id);
    if (itemIndex >= 0) {
      newInventory[itemIndex].quantity -= 1;
      if (newInventory[itemIndex].quantity <= 0) {
        newInventory.splice(itemIndex, 1);
      }
    }
    setInventory(newInventory);
    
    updatedPet.experience += expGained;
    addParticle(particleType);
    setActionFeedback(`+${expGained} XP`);
    setTimeout(() => setActionFeedback(null), 1500);
    
    const levelInfo = checkLevelUp(updatedPet);
    if (levelInfo.leveledUp) {
      updatedPet.level = levelInfo.newLevel;
      updatedPet.experience = levelInfo.newExp;
      setShowLevelUp(true);
      setLevelUpAnimation(true);
      setTimeout(() => setLevelUpAnimation(false), 2000);
      addParticle('confetti');
    }
    
    setPet(updatedPet);
    await savePet({ ...updatedPet, dailyQuests, inventory: newInventory, achievements });
    setShowItemMenu(false);
  }, [pet, inventory, dailyQuests, achievements, savePet, addParticle]);

  const handleMinigameComplete = useCallback(async (score: number) => {
    if (!pet) return;
    
    const expGained = Math.floor(score / 10);
    
    let updatedPet = { ...pet } as any;
    updatedPet.experience += expGained;
    if (!updatedPet.totalPlayTime) updatedPet.totalPlayTime = 0;
    updatedPet.totalPlayTime += 30;
    
    const levelInfo = checkLevelUp(updatedPet);
    if (levelInfo.leveledUp) {
      updatedPet.level = levelInfo.newLevel;
      updatedPet.experience = levelInfo.newExp;
      setShowLevelUp(true);
      setLevelUpAnimation(true);
      setTimeout(() => setLevelUpAnimation(false), 2000);
    }
    
    // Award random item occasionally
    const itemChance = Math.random();
    if (itemChance > 0.7) {
      const itemKeys = Object.keys(PET_ITEMS);
      const randomKey = itemKeys[Math.floor(Math.random() * itemKeys.length)];
      const template = PET_ITEMS[randomKey];
      
      const existingItem = inventory.find(i => i.id === template.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        inventory.push({ ...template, quantity: 1 });
      }
      
      setActionFeedback(`+${expGained} XP & ${template.icon} ${template.name}!`);
    } else {
      setActionFeedback(`+${expGained} XP`);
    }
    setTimeout(() => setActionFeedback(null), 2000);
    
    updateQuestProgress('minigame');
    setPet(updatedPet);
    await savePet({ ...updatedPet, dailyQuests, inventory, achievements });
  }, [pet, dailyQuests, inventory, achievements, savePet, updateQuestProgress]);

  const handleCreatePet = async () => {
    if (!user || !petName.trim()) return;
    
    setCreating(true);
    const newPet: Pet = {
      id: 'pet',
      userId: user.uid,
      name: petName.trim(),
      type: selectedType,
      hunger: 80,
      happiness: 80,
      cleanliness: 80,
      energy: 80,
      level: 1,
      experience: 0,
      lastUpdated: new Date().toISOString(),
    };

    try {
      const petRef = doc(db, `users/${user.uid}/pet`, 'data');
      await setDoc(petRef, {
        ...newPet,
        dailyQuests: generateDailyQuests(),
        inventory: [],
        achievements: [],
        totalActionsPerformed: 0,
        totalPlayTime: 0,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/pet`);
    } finally {
      setCreating(false);
    }
  };

  // Calculate quest completion percentage
  const questProgress = dailyQuests.length > 0
    ? Math.round((dailyQuests.filter(q => q.completed).length / dailyQuests.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-main)]" />
      </div>
    );
  }

  // Pet creation screen
  if (!pet) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Adopt a Pet!</h1>
          <p className="text-[var(--text-secondary)]">Choose your new companion</p>
        </div>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {(Object.keys(PET_TYPE_NAMES) as PetType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                selectedType === type
                  ? "bg-[var(--accent-main)] text-white"
                  : "bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
              )}
            >
              <span className="text-2xl">{PET_EMOJIS[type].base}</span>
              <span className="text-xs">{PET_TYPE_NAMES[type]}</span>
            </button>
          ))}
        </div>

        <div className="bg-[var(--bg-panel)] rounded-2xl p-8 mb-6 text-center">
          <div className="text-6xl mb-4 animate-bounce">
            {PET_EMOJIS[selectedType].happy}
          </div>
          <p className="text-[var(--text-secondary)]">Your pet will look like this!</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Pet Name
          </label>
          <input
            type="text"
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            placeholder="Enter a name..."
            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-panel)] border border-[var(--bg-panel)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-main)]"
            maxLength={20}
          />
        </div>

        <button
          onClick={handleCreatePet}
          disabled={!petName.trim() || creating}
          className={cn(
            "w-full py-4 rounded-xl font-medium transition-all",
            petName.trim() && !creating
              ? "bg-[var(--accent-main)] text-white hover:opacity-90"
              : "bg-[var(--bg-panel)] text-[var(--text-muted)] cursor-not-allowed"
          )}
        >
          {creating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </span>
          ) : (
            'Adopt Pet 🐾'
          )}
        </button>
      </div>
    );
  }

  const mood = calculateMood(pet);
  const expProgress = (pet.experience / getExpForLevel(pet.level)) * 100;
  const totalStats = (pet.hunger + pet.happiness + pet.cleanliness + pet.energy) / 4;

  return (
    <div className="max-w-md mx-auto p-4">
      {/* Level Up Animation */}
      {levelUpAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-center animate-pulse">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-2xl font-bold text-white">Level Up!</div>
            <div className="text-lg text-white opacity-80">Level {pet.level}</div>
          </div>
        </div>
      )}

      {/* Action Feedback */}
      {actionFeedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-[var(--accent-main)] text-white px-6 py-3 rounded-full font-bold animate-bounce shadow-lg">
          {actionFeedback}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {[
          { id: 'main', label: 'Pet', icon: '🐾' },
          { id: 'minigames', label: 'Games', icon: '🎮' },
          { id: 'inventory', label: 'Items', icon: '🎁' },
          { id: 'quests', label: 'Quests', icon: '📋' },
          { id: 'achievements', label: 'Badges', icon: '🏆' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-all text-sm font-medium",
              activeTab === tab.id
                ? "bg-[var(--accent-main)] text-white"
                : "bg-[var(--bg-panel)] text-[var(--text-secondary)]"
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MAIN TAB */}
      {activeTab === 'main' && (
        <>
          <div className="relative bg-[var(--bg-panel)] rounded-2xl p-8 mb-6 text-center transition-all overflow-hidden">
            {/* Particle Effects Container */}
            <div className="absolute inset-0 pointer-events-none">
              {particles.map(p => (
                <ParticleEffect key={p.id} effect={p} onComplete={() => {}} />
              ))}
            </div>

            {showLevelUp && !levelUpAnimation && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full animate-bounce">
                Level Up!
              </div>
            )}
            
            <div className={cn(
              "text-8xl mb-4 transition-transform relative z-10",
              mood === 'happy' && "animate-bounce",
              mood === 'sleeping' && "animate-pulse",
              totalStats >= 80 && "animate-pet-happy",
              totalStats < 30 && "animate-pet-sad"
            )}>
              {mood === 'sleeping' 
                ? PET_EMOJIS[pet.type].sleeping 
                : mood === 'happy' || mood === 'content'
                  ? PET_EMOJIS[pet.type].happy
                  : PET_EMOJIS[pet.type].base
              }
            </div>
            
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{pet.name}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-[var(--text-secondary)]">Level {pet.level}</span>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                <span>XP</span>
                <span>{pet.experience}/{getExpForLevel(pet.level)}</span>
              </div>
              <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500"
                  style={{ width: `${expProgress}%` }}
                />
              </div>
            </div>

            <div className={cn(
              "inline-block mt-4 px-3 py-1 rounded-full text-sm font-medium",
              mood === 'happy' && "bg-green-500 text-white",
              mood === 'content' && "bg-lime-500 text-white",
              mood === 'neutral' && "bg-gray-500 text-white",
              mood === 'sad' && "bg-blue-500 text-white",
              mood === 'upset' && "bg-red-500 text-white",
              mood === 'sleeping' && "bg-indigo-500 text-white"
            )}>
              {mood === 'sleeping' ? '😴 Sleeping' : `Feeling ${mood}`}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-[var(--bg-panel)] rounded-2xl p-6 mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500"><Utensils size={18} /></div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-secondary)]">Hunger</span>
                  <span className="text-[var(--text-primary)] font-medium">{Math.round(pet.hunger)}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${pet.hunger}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500"><Heart size={18} /></div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-secondary)]">Happiness</span>
                  <span className="text-[var(--text-primary)] font-medium">{Math.round(pet.happiness)}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full transition-all duration-500" style={{ width: `${pet.happiness}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500"><Droplets size={18} /></div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-secondary)]">Cleanliness</span>
                  <span className="text-[var(--text-primary)] font-medium">{Math.round(pet.cleanliness)}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full transition-all duration-500" style={{ width: `${pet.cleanliness}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500"><Zap size={18} /></div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-secondary)]">Energy</span>
                  <span className="text-[var(--text-primary)] font-medium">{Math.round(pet.energy)}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${pet.energy}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Item Button */}
          {inventory.length > 0 && (
            <button
              onClick={() => setShowItemMenu(true)}
              className="w-full mb-4 py-3 bg-[var(--bg-panel)] border border-[var(--accent-main)] rounded-xl flex items-center justify-center gap-2 text-[var(--accent-main)] font-medium hover:bg-[var(--accent-main)] hover:bg-opacity-10 transition-all"
            >
              <Gift size={20} />
              Use Item ({inventory.length})
            </button>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                const check = canPerformAction('feed');
                if (!check.allowed) {
                  setActionFeedback(check.reason);
                  setTimeout(() => setActionFeedback(null), 2000);
                  return;
                }
                handleAction('feed');
              }}
              disabled={actionCooldowns.feed > 0 || pet.hunger >= 100}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                actionCooldowns.feed > 0 || pet.hunger >= 100
                  ? "opacity-50 cursor-not-allowed bg-[var(--bg-panel)]"
                  : "hover:bg-[var(--bg-panel)] active:scale-95 bg-[var(--bg-surface)] border border-[var(--bg-panel)]"
              )}
            >
              <div className="p-3 rounded-full bg-orange-500 bg-opacity-20 text-orange-500">
                <Utensils size={24} />
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">Feed</span>
              {actionCooldowns.feed > 0 && (
                <span className="text-xs text-[var(--text-muted)]">{actionCooldowns.feed}s</span>
              )}
            </button>
            <button
              onClick={() => {
                const check = canPerformAction('play');
                if (!check.allowed) {
                  setActionFeedback(check.reason);
                  setTimeout(() => setActionFeedback(null), 2000);
                  return;
                }
                handleAction('play');
              }}
              disabled={actionCooldowns.play > 0 || pet.energy < 20}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                actionCooldowns.play > 0 || pet.energy < 20
                  ? "opacity-50 cursor-not-allowed bg-[var(--bg-panel)]"
                  : "hover:bg-[var(--bg-panel)] active:scale-95 bg-[var(--bg-surface)] border border-[var(--bg-panel)]"
              )}
            >
              <div className="p-3 rounded-full bg-pink-500 bg-opacity-20 text-pink-500">
                <Gamepad2 size={24} />
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">Play</span>
              {actionCooldowns.play > 0 && (
                <span className="text-xs text-[var(--text-muted)]">{actionCooldowns.play}s</span>
              )}
            </button>
            <button
              onClick={() => {
                const check = canPerformAction('clean');
                if (!check.allowed) {
                  setActionFeedback(check.reason);
                  setTimeout(() => setActionFeedback(null), 2000);
                  return;
                }
                handleAction('clean');
              }}
              disabled={actionCooldowns.clean > 0 || pet.cleanliness >= 100}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                actionCooldowns.clean > 0 || pet.cleanliness >= 100
                  ? "opacity-50 cursor-not-allowed bg-[var(--bg-panel)]"
                  : "hover:bg-[var(--bg-panel)] active:scale-95 bg-[var(--bg-surface)] border border-[var(--bg-panel)]"
              )}
            >
              <div className="p-3 rounded-full bg-cyan-500 bg-opacity-20 text-cyan-500">
                <Droplets size={24} />
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">Clean</span>
              {actionCooldowns.clean > 0 && (
                <span className="text-xs text-[var(--text-muted)]">{actionCooldowns.clean}s</span>
              )}
            </button>
            <button
              onClick={() => {
                const check = canPerformAction('rest');
                if (!check.allowed) {
                  setActionFeedback(check.reason);
                  setTimeout(() => setActionFeedback(null), 2000);
                  return;
                }
                handleAction('rest');
              }}
              disabled={actionCooldowns.rest > 0 || pet.energy >= 100}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl transition-all",
                actionCooldowns.rest > 0 || pet.energy >= 100
                  ? "opacity-50 cursor-not-allowed bg-[var(--bg-panel)]"
                  : "hover:bg-[var(--bg-panel)] active:scale-95 bg-[var(--bg-surface)] border border-[var(--bg-panel)]"
              )}
            >
              <div className="p-3 rounded-full bg-yellow-500 bg-opacity-20 text-yellow-500">
                <Moon size={24} />
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)]">Rest</span>
              {actionCooldowns.rest > 0 && (
                <span className="text-xs text-[var(--text-muted)]">{actionCooldowns.rest}s</span>
              )}
            </button>
          </div>

          {/* Stats Warning */}
          {(pet.hunger < 20 || pet.happiness < 20 || pet.cleanliness < 20 || pet.energy < 20) && (
            <div className="mt-6 p-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-xl text-center">
              <p className="text-red-400 text-sm font-medium">
                ⚠️ Your pet needs attention! Take care of them soon.
              </p>
            </div>
          )}
        </>
      )}

      {/* MINIGAMES TAB */}
      {activeTab === 'minigames' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Minigames</h2>
            <p className="text-[var(--text-secondary)] text-sm">Play games to earn XP and items!</p>
          </div>

          <button
            onClick={() => setShowTapGame(true)}
            className="w-full p-6 bg-[var(--bg-panel)] rounded-2xl flex items-center gap-4 hover:bg-[var(--bg-surface)] transition-all group"
          >
            <div className="text-4xl">👆</div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-[var(--text-primary)]">Tap Dash</h3>
              <p className="text-sm text-[var(--text-secondary)]">Tap as fast as you can in 5 seconds!</p>
            </div>
            <ChevronRight className="text-[var(--text-muted)] group-hover:text-[var(--accent-main)]" />
          </button>

          <button
            onClick={() => setShowReactionGame(true)}
            className="w-full p-6 bg-[var(--bg-panel)] rounded-2xl flex items-center gap-4 hover:bg-[var(--bg-surface)] transition-all group"
          >
            <div className="text-4xl">⚡</div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-[var(--text-primary)]">Quick Reflex</h3>
              <p className="text-sm text-[var(--text-secondary)]">Test your reaction time!</p>
            </div>
            <ChevronRight className="text-[var(--text-muted)] group-hover:text-[var(--accent-main)]" />
          </button>
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Inventory</h2>
            <p className="text-[var(--text-secondary)] text-sm">{inventory.length} items</p>
          </div>

          {inventory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🎁</div>
              <p className="text-[var(--text-muted)]">No items yet!</p>
              <p className="text-sm text-[var(--text-muted)]">Play minigames to earn items</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {inventory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => useItem(item)}
                  className={cn(
                    "p-4 rounded-xl text-left transition-all hover:scale-105",
                    item.rarity === 'legendary' && "bg-yellow-900 bg-opacity-30 border border-yellow-500",
                    item.rarity === 'epic' && "bg-purple-900 bg-opacity-30 border border-purple-500",
                    item.rarity === 'rare' && "bg-blue-900 bg-opacity-30 border border-blue-500",
                    item.rarity === 'uncommon' && "bg-green-900 bg-opacity-30 border border-green-500",
                    item.rarity === 'common' && "bg-[var(--bg-panel)] border border-[var(--bg-surface)]"
                  )}
                >
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <div className="font-medium text-[var(--text-primary)] text-sm">{item.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">x{item.quantity}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUESTS TAB */}
      {activeTab === 'quests' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Daily Quests</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-32 h-2 bg-[var(--bg-panel)] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--accent-main)] transition-all duration-500" 
                  style={{ width: `${questProgress}%` }}
                />
              </div>
              <span className="text-sm text-[var(--text-muted)]">{questProgress}%</span>
            </div>
          </div>

          {dailyQuests.map((quest, index) => (
            <div
              key={index}
              className={cn(
                "p-4 rounded-xl transition-all",
                quest.completed 
                  ? "bg-green-900 bg-opacity-20 border border-green-500" 
                  : "bg-[var(--bg-panel)]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{quest.type === 'feed' ? '🍎' : quest.type === 'play' ? '🎮' : quest.type === 'clean' ? '✨' : quest.type === 'rest' ? '😴' : '🎯'}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[var(--text-primary)]">{quest.title}</h3>
                    {quest.completed && <span className="text-green-500">✓</span>}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{quest.description}</p>
                </div>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Progress: {quest.progress}/{quest.target}</span>
                <span className="text-[var(--accent-main)]">+10 XP</span>
              </div>
              <div className="mt-2 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    quest.completed ? "bg-green-500" : "bg-[var(--accent-main)]"
                  )}
                  style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ACHIEVEMENTS TAB */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Achievements</h2>
            <p className="text-[var(--text-secondary)] text-sm">{achievements.length}/{Object.keys(PET_ACHIEVEMENTS).length} unlocked</p>
          </div>

          {Object.values(PET_ACHIEVEMENTS).map((achievement) => {
            const isUnlocked = achievements.includes(achievement.id);
            return (
              <div
                key={achievement.id}
                className={cn(
                  "p-4 rounded-xl flex items-center gap-4 transition-all",
                  isUnlocked 
                    ? "bg-yellow-900 bg-opacity-20 border border-yellow-500" 
                    : "bg-[var(--bg-panel)] opacity-60"
                )}
              >
                <div className="text-3xl">{achievement.icon}</div>
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--text-primary)]">{achievement.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{achievement.description}</p>
                </div>
                {isUnlocked && (
                  <Award className="text-yellow-500" size={24} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Item Menu Modal */}
      {showItemMenu && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Use Item</h2>
              <button onClick={() => setShowItemMenu(false)} className="text-[var(--text-muted)]">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              {inventory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => useItem(item)}
                  className="w-full p-4 rounded-xl bg-[var(--bg-panel)] flex items-center gap-4 hover:bg-[var(--bg-surface)] transition-all"
                >
                  <div className="text-3xl">{item.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-[var(--text-primary)]">{item.name}</div>
                    <div className="text-sm text-[var(--text-secondary)]">x{item.quantity}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Minigame Overlays */}
      {showTapGame && (
        <TapGame 
          onComplete={(score) => {
            handleMinigameComplete(score);
            setShowTapGame(false);
          }} 
          onClose={() => setShowTapGame(false)} 
        />
      )}
      {showReactionGame && (
        <ReactionGame 
          onComplete={(score) => {
            handleMinigameComplete(score);
            setShowReactionGame(false);
          }} 
          onClose={() => setShowReactionGame(false)} 
        />
      )}
    </div>
  );
};

export default VirtualPet;