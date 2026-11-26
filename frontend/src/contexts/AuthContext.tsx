import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string;
}

interface Profile {
  id: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  organizationId: string | null;
  activeProfile: Profile | null;
  loading: boolean;
  login: (user: User, organizationId: string) => Promise<void>;
  logout: () => void;
  selectProfile: (profile: Profile) => void;
  clearProfile: () => void;
  switchOrganization: (organizationId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_KEY = 'sparkbot_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const { user: savedUser, organizationId: savedOrgId, activeProfile: savedProfile } = JSON.parse(savedSession);
        if (savedUser && savedUser.id) {
          setUser(savedUser);
          setOrganizationId(savedOrgId || savedUser.organization_id || null);
          if (savedProfile) setActiveProfile(savedProfile);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (e) {
        console.error('Failed to restore session', e);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (user: User, organizationId: string) => {
    setUser(user);
    setOrganizationId(organizationId);
    setActiveProfile(null);

    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user,
      organizationId,
      activeProfile: null
    }));
  };

  const logout = () => {
    setUser(null);
    setOrganizationId(null);
    setActiveProfile(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('sparktree_session');
    localStorage.removeItem('sparkbot_ai_providers');

    // replace evita que el botón Atrás vuelva a una ruta autenticada.
    window.location.replace('/login');
  };

  const selectProfile = (profile: Profile) => {
    setActiveProfile(profile);
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...parsed, activeProfile: profile }));
    }
  };

  const clearProfile = () => {
    setActiveProfile(null);
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...parsed, activeProfile: null }));
    }
  };

  const switchOrganization = (orgId: string) => {
    setOrganizationId(orgId);
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...parsed, organizationId: orgId }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, organizationId, activeProfile, loading, login, logout, selectProfile, clearProfile, switchOrganization }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
