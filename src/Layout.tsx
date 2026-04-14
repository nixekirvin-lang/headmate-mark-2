import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { LogOut, Users, MessageSquare, Book, Activity, Settings, Home, Info, ShieldAlert, User, Heart, Bell, HelpCircle, Gamepad2, Menu, X, Palmtree, Palette } from 'lucide-react';
import Logo from './components/Logo';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { cn } from './lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  href?: string;
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const unread = snap.docs.filter(d => !d.data().isRead);
      setUnreadCount(unread.length);
    });
    return unsub;
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    ...(!profile?.isSinglet ? [
      { id: 'alters', label: 'Alters', icon: Users },
      { id: 'switches', label: 'Front History', icon: Activity },
      { id: 'chat', label: 'Internal Chat', icon: MessageSquare },
    ] : []),
    { id: 'canvas', label: 'Canvas', icon: Palette },
    { id: 'diary', label: 'Diary', icon: Book },
    { id: 'minigames', label: 'Minigames', icon: Gamepad2 },
    { id: 'pet', label: 'Pet', icon: Palmtree },
    { id: 'discord', label: 'Discord', icon: Users, href: 'https://discord.gg/nxd4eNG3Rj' },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'friends', label: 'Friends', icon: Heart },
    { id: 'resources', label: 'Resources', icon: Info },
    { id: 'about', label: 'About', icon: HelpCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Mobile/Laptop Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)] border-b border-[var(--bg-panel)] px-4 py-3 flex items-center justify-between safe-area-pt">
        <Logo size="small" />
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-[var(--bg-panel)] text-[var(--text-primary)]"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "sidebar w-64 bg-[var(--bg-surface)] border-r border-[var(--bg-panel)] flex flex-col fixed lg:relative inset-0 z-40 pt-16 lg:pt-0 transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center gap-3 hidden lg:flex">
          <Logo size="small" />
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMobileMenuOpen(false);
                if (item.href) {
                  window.open(item.href, '_blank');
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all relative",
                activeTab === item.id
                  ? "bg-[var(--accent-main)] text-white shadow-lg shadow-[var(--accent-glow)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel)]"
              )}
            >
              <item.icon size={20} />
              <span className="truncate">{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--bg-panel)]">
          {user && (
            <div className="flex items-center justify-end px-4 py-2">
              <button
                onClick={handleLogout}
                className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 pt-20 lg:pt-6">
        <div className="max-w-4xl lg:max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Panic Button */}
      <button
        onClick={() => window.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}
        className="fixed bottom-6 right-6 w-12 h-12 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-all z-50"
        title="Panic Button"
      >
        <ShieldAlert size={24} />
      </button>
    </div>
  );
};

export default Layout;
