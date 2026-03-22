import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { LogOut, Users, MessageSquare, Book, Activity, Settings, Home, Info, ShieldAlert, User, Heart, Bell } from 'lucide-react';
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
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
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
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    ...(!profile?.isSinglet ? [
      { id: 'alters', label: 'Alters', icon: Users },
      { id: 'switches', label: 'Switches', icon: Activity },
      { id: 'chat', label: 'Internal Chat', icon: MessageSquare },
    ] : []),
    { id: 'diary', label: 'Diary', icon: Book },
    { id: 'discord', label: 'Discord', icon: Users, href: 'https://discord.gg/nxd4eNG3Rj' },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'friends', label: 'Friends', icon: Heart },
    { id: 'resources', label: 'Resources', icon: Info },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg-main)] text-[var(--text-primary)]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[var(--bg-surface)] border-b md:border-r border-[var(--bg-panel)] flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <Logo size="small" />
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
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
              {item.label}
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
            <div className="flex items-center gap-3 px-4 py-2">
              <button 
                onClick={() => {
                  navigate(`/profile/${user.uid}`);
                }}
                className="flex-1 flex items-center gap-3 text-left hover:bg-[var(--bg-panel)] p-2 rounded-xl transition-all"
              >
                <img
                  src={profile?.avatarUrl || `https://ui-avatars.com/api/?name=${profile?.displayName || profile?.systemName || 'User'}`}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full border border-[var(--bg-panel)] object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{profile?.displayName || profile?.systemName || 'User'}</p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">@{profile?.username || 'user'}</p>
                </div>
              </button>
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
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
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
