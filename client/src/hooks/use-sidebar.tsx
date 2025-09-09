import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { useIsMobile } from './use-mobile';

type SidebarContextType = {
  collapsed: boolean;
  toggleSidebar: () => void;
  setSidebarState: (collapsed: boolean) => void;
};

export const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(isMobile);
  
  // Update sidebar state on mobile changes
  useEffect(() => {
    setCollapsed(isMobile);
  }, [isMobile]);
  
  const toggleSidebar = () => {
    setCollapsed((prev: boolean) => !prev);
  };
  
  const setSidebarState = (newState: boolean) => {
    setCollapsed(newState);
  };
  
  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar, setSidebarState }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
