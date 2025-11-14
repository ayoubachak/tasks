import { useState, type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
  showAllView?: boolean;
  onToggleAllView?: () => void;
  onExitAllView?: () => void;
}

export function AppLayout({ children, showAllView, onToggleAllView, onExitAllView }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          showAllView={showAllView}
          onToggleAllView={onToggleAllView}
          onExitAllView={onExitAllView}
        />
      </div>
      
      {/* Mobile Sidebar Drawer */}
      <div className="md:hidden">
        <Sidebar 
          collapsed={false}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          showAllView={showAllView}
          onToggleAllView={onToggleAllView}
          onExitAllView={onExitAllView}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3 sm:p-4 md:p-6" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}

