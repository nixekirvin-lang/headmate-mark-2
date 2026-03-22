/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { SystemProvider } from './SystemContext';
import Layout from './Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load heavy components for code splitting
const AuthPage = lazy(() => import('./components/AuthPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const AlterManager = lazy(() => import('./components/AlterManager'));
const Diary = lazy(() => import('./components/Diary'));
const SwitchTracker = lazy(() => import('./components/SwitchTracker'));
const InternalChat = lazy(() => import('./components/InternalChat'));
const SocialFeed = lazy(() => import('./components/SocialFeed'));
const Resources = lazy(() => import('./components/Resources'));
const Settings = lazy(() => import('./components/Settings'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const FriendsList = lazy(() => import('./components/FriendsList'));
const Notifications = lazy(() => import('./components/Notifications'));
const About = lazy(() => import('./components/About'));

const LoadingFallback: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  // Handle profile ID from URL - works with direct URL access and navigation
  React.useEffect(() => {
    const path = location.pathname;
    // Handle /profile/:id and /userprofile/:id routes
    if (path.startsWith('/profile/') || path.startsWith('/userprofile/')) {
      const profileId = path.includes('/profile/') 
        ? path.split('/profile/')[1] 
        : path.split('/userprofile/')[1];
      if (profileId && profileId !== 'null' && profileId !== 'undefined') {
        setViewProfileId(profileId);
        setActiveTab('profile');
      }
    } else if (path === '/' || path === '') {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  // Update URL when viewProfileId changes programmatically
  React.useEffect(() => {
    if (viewProfileId && activeTab === 'profile') {
      navigate(`/profile/${viewProfileId}`, { replace: true });
    } else if (activeTab !== 'profile' && location.pathname.startsWith('/profile/')) {
      navigate('/', { replace: true });
    }
  }, [viewProfileId, activeTab, navigate]);

  React.useEffect(() => {
    // Listen for navigation events from components
    const handleSetTab = (e: any) => {
      setActiveTab(e.detail);
    };
    const handleSetViewProfile = (e: any) => {
      setViewProfileId(e.detail);
      setActiveTab('profile');
    };
    window.addEventListener('setTab', handleSetTab);
    window.addEventListener('setViewProfile', handleSetViewProfile);
    return () => {
      window.removeEventListener('setTab', handleSetTab);
      window.removeEventListener('setViewProfile', handleSetViewProfile);
    };
  }, []);

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AuthPage />
      </Suspense>
    );
  }

  const handleViewProfile = (uid: string) => {
    setViewProfileId(uid);
    setActiveTab('profile');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'profile') {
      setViewProfileId(null);
    }
  };

  const isSinglet = profile?.isSinglet;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'alters': return isSinglet ? <Dashboard /> : <AlterManager />;
      case 'diary': return <Diary />;
      case 'switches': return isSinglet ? <Dashboard /> : <SwitchTracker />;
      case 'chat': return isSinglet ? <Dashboard /> : <InternalChat />;
      case 'discord': 
        // Discord opens in new tab via Layout, stay on dashboard
        return <Dashboard />;
      case 'notifications': return <Notifications />;
      case 'friends': return <FriendsList onViewProfile={handleViewProfile} />;
      case 'profile': return <ProfilePage userId={viewProfileId || user.uid} onAuthorClick={handleViewProfile} />;
      case 'resources': return <Resources />;
      case 'settings': return <Settings />;
      case 'about': return <About />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange}>
      <Suspense fallback={<LoadingFallback />}>
        {renderContent()}
      </Suspense>
    </Layout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SystemProvider>
            <ThemeProvider>
              <Routes>
                <Route path="/*" element={<AppContent />} />
              </Routes>
            </ThemeProvider>
          </SystemProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
