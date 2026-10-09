import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useRef } from 'react';

interface PageHeaderContextType {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  setPageHeader: (title: string, subtitle?: string, actions?: ReactNode) => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export const usePageHeader = () => {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider');
  }
  return context;
};

interface PageHeaderProviderProps {
  children: ReactNode;
}

export const PageHeaderProvider = ({ children }: PageHeaderProviderProps) => {
  const [title, setTitle] = useState('Dashboard');
  const [subtitle, setSubtitle] = useState<string>('');
  const [actions, setActions] = useState<ReactNode>(null);
  
  // Usar refs para evitar comparaciones problemáticas
  const titleRef = useRef(title);
  const subtitleRef = useRef(subtitle);
  const actionsRef = useRef(actions);

  const setPageHeader = useCallback((newTitle: string, newSubtitle?: string, newActions?: ReactNode) => {
    // Solo actualizar si los valores realmente cambiaron
    if (newTitle !== titleRef.current || newSubtitle !== subtitleRef.current || newActions !== actionsRef.current) {
      titleRef.current = newTitle;
      subtitleRef.current = newSubtitle || '';
      actionsRef.current = newActions;
      
      setTitle(newTitle);
      setSubtitle(newSubtitle || '');
      setActions(newActions || null);
    }
  }, []);

  const contextValue = useMemo(() => ({
    title,
    subtitle,
    actions,
    setPageHeader
  }), [title, subtitle, actions, setPageHeader]);

  return (
    <PageHeaderContext.Provider value={contextValue}>
      {children}
    </PageHeaderContext.Provider>
  );
};
