import { DataMenu } from '@/components/import-export/DataMenu';
import { SyncButton } from '@/components/sync/SyncButton';
import { Settings } from '@/components/settings/Settings';
import { AppLogo } from '@/components/shared/AppLogo';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {

  return (
    <header className="border-b bg-background sticky top-0 z-40" role="banner">
      <div className="flex h-14 md:h-16 items-center justify-between px-3 sm:px-4 md:px-6 gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={onMobileMenuToggle}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <AppLogo size="md" className="md:hidden" />
          <AppLogo size="lg" className="hidden md:flex" />
        </div>
        
        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          <SyncButton />
          <DataMenu />
          <Settings />
        </div>

        {/* Mobile actions - dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <div className="w-full">
                <SyncButton />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <div className="w-full">
                <DataMenu />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
              }}
              className="p-0"
            >
              <Settings />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

