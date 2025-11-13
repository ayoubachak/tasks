import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Settings as SettingsIcon, Palette } from 'lucide-react';
import { ThemeSettings } from '@/components/theme/ThemeSettings';

export function Settings() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={true}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          title="Settings" 
          aria-label="Settings"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="w-full sm:w-auto sm:justify-center"
        >
          <SettingsIcon className="h-4 w-4 mr-2 sm:mr-0" />
          <span className="sm:hidden">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] p-4 sm:p-6 flex flex-col"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <SettingsIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            Settings
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Manage your application settings and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="theme">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  <span>Theme & Appearance</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ThemeSettings />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  );
}

