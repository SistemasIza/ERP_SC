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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const savedSession = localStorage.getItem('sparkbot_session');
    if (savedSession) {
      try {
        const { user: savedUser, organizationId: savedOrgId, activeProfile: savedProfile } = JSON.parse(savedSession);
        if (savedUser && savedUser.id) {
          setUser(savedUser);
          setOrganizationId(savedOrgId || savedUser.organization_id || null);
          if (savedProfile) setActiveProfile(savedProfile);
        } else {
          localStorage.removeItem('sparkbot_session');
        }
      } catch (e) {
        console.error('Failed to restore session', e);
        localStorage.removeItem('sparktree_session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (user: User, organizationId: string) => {
    setUser(user);
    setOrganizationId(organizationId);

    localStorage.setItem('sparkbot_session', JSON.stringify({ 
      user, 
      organizationId,
      activeProfile: null
    }));
  };

  const logout = () => {
    console.log('Logging out...');
    setUser(null);
    setOrganizationId(null);
    setActiveProfile(null);
    localStorage.removeItem('sparktree_session');
    
    // Forzar la redirección al login
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  };

  const selectProfile = (profile: Profile) => {
    setActiveProfile(profile);
    const savedSession = localStorage.getItem('sparkbot_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      localStorage.setItem('sparkbot_session', JSON.stringify({ ...parsed, activeProfile: profile }));
    }
  };

  const clearProfile = () => {
    setActiveProfile(null);
    const savedSession = localStorage.getItem('sparkbot_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      localStorage.setItem('sparkbot_session', JSON.stringify({ ...parsed, activeProfile: null }));
    }
  };

  const switchOrganization = (orgId: string) => {
    setOrganizationId(orgId);
    const savedSession = localStorage.getItem('sparktree_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      localStorage.setItem('sparktree_session', JSON.stringify({ ...parsed, organizationId: orgId }));
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
