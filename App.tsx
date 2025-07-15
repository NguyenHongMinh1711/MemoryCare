
import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/auth/AuthGuard';
import { useAuth } from './contexts/AuthContext';
import HomePage from './pages/HomePage';
import MemoryLogPage from './pages/MemoryLogPage';
import ActivityPlannerPage from './pages/ActivityPlannerPage';
import LocationServicesPage from './pages/LocationServicesPage';
import Button from './components/common/Button';
import { HomeIcon, BookOpenIcon, CalendarIcon, MapPinIcon, UserCircleIcon } from './constants';

const AppContent: React.FC = () => {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const navItems = [
    { path: '/', label: 'Home', icon: <HomeIcon className="w-6 h-6 mr-2" /> },
    { path: '/memory-log', label: 'Memory Log', icon: <BookOpenIcon className="w-6 h-6 mr-2" /> },
    { path: '/activity-planner', label: 'Planner', icon: <CalendarIcon className="w-6 h-6 mr-2" /> },
    { path: '/location', label: 'Location', icon: <MapPinIcon className="w-6 h-6 mr-2" /> },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-sky-50">
      <header className="bg-sky-600 text-white p-6 shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">MemoryCare</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <UserCircleIcon className="w-6 h-6" />
              <span className="text-sm">
                {profile?.full_name} ({profile?.role})
              </span>
            </div>
            <Button onClick={handleSignOut} variant="ghost" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav className="bg-sky-500 text-white w-full md:w-64 p-4 md:p-6 space-y-4 md:sticky md:top-0 md:h-screen">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center text-lg p-3 rounded-lg transition-colors duration-200 ease-in-out hover:bg-sky-700 ${
                location.pathname === item.path ? 'bg-sky-700 font-semibold' : 'hover:bg-opacity-75'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/memory-log" element={<MemoryLogPage />} />
            <Route path="/activity-planner" element={<ActivityPlannerPage />} />
            <Route path="/location" element={<LocationServicesPage />} />
          </Routes>
        </main>
      </div>
       <footer className="bg-sky-600 text-white p-4 text-center text-sm">
        MemoryCare &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthGuard>
        <AppContent />
      </AuthGuard>
    </AuthProvider>
  );
};

export default App;