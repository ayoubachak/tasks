import { useState } from 'react';
import { useThemeStore, type Theme, type ThemeMode } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Palette, Moon, Sun, Monitor, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

export function ThemeSettings() {
  const {
    currentTheme,
    themes,
    mode,
    setMode,
    setTheme,
    addTheme,
    updateTheme,
    deleteTheme,
    getCurrentTheme,
  } = useThemeStore();

  const [open, setOpen] = useState(false);
  const [customThemeName, setCustomThemeName] = useState('');

  const currentThemeData = getCurrentTheme();
  const customThemes = themes.filter((t) => t.isCustom);

  const handleCreateCustomTheme = () => {
    if (!customThemeName.trim()) {
      toast.error('Theme name required', 'Please enter a name for your custom theme');
      return;
    }

    const baseTheme = currentThemeData || themes[0];
    const newTheme: Theme = {
      id: `custom-${Date.now()}`,
      name: customThemeName.trim(),
      mode: mode,
      colors: { ...baseTheme.colors },
      isCustom: true,
    };

    addTheme(newTheme);
    setTheme(newTheme.id);
    setCustomThemeName('');
    toast.success('Theme created', `Custom theme "${newTheme.name}" has been created`);
  };

  const handleDeleteCustomTheme = (themeId: string) => {
    deleteTheme(themeId);
    if (currentTheme === themeId) {
      setTheme('dark');
    }
    toast.success('Theme deleted', 'Custom theme has been removed');
  };

  const handleColorChange = (key: keyof Theme['colors'], value: string) => {
    if (!currentThemeData) return;

    const updated = {
      ...currentThemeData,
      colors: {
        ...currentThemeData.colors,
        [key]: value,
      },
    };

    updateTheme(currentTheme, updated);
    applyThemeColors(updated.colors);
  };

  const applyThemeColors = (colors: Theme['colors']) => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
    });
  };

  const colorFields: Array<{ key: keyof Theme['colors']; label: string; description?: string }> = [
    { key: 'background', label: 'Background', description: 'Main background color' },
    { key: 'foreground', label: 'Foreground', description: 'Main text color' },
    { key: 'card', label: 'Card', description: 'Card background' },
    { key: 'cardForeground', label: 'Card Text', description: 'Card text color' },
    { key: 'primary', label: 'Primary', description: 'Primary brand color' },
    { key: 'primaryForeground', label: 'Primary Text', description: 'Text on primary' },
    { key: 'secondary', label: 'Secondary', description: 'Secondary color' },
    { key: 'secondaryForeground', label: 'Secondary Text', description: 'Text on secondary' },
    { key: 'accent', label: 'Accent', description: 'Accent color' },
    { key: 'accentForeground', label: 'Accent Text', description: 'Text on accent' },
    { key: 'muted', label: 'Muted', description: 'Muted background' },
    { key: 'mutedForeground', label: 'Muted Text', description: 'Muted text' },
    { key: 'destructive', label: 'Destructive', description: 'Error/danger color' },
    { key: 'border', label: 'Border', description: 'Border color' },
    { key: 'input', label: 'Input', description: 'Input background' },
    { key: 'ring', label: 'Ring', description: 'Focus ring color' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Theme settings" aria-label="Theme settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Settings
          </DialogTitle>
          <DialogDescription>
            Customize your app's appearance with themes and color palettes
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="mode" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mode">Mode</TabsTrigger>
            <TabsTrigger value="themes">Themes</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="mode" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Color Mode</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={mode === 'light' ? 'default' : 'outline'}
                  onClick={() => setMode('light')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Sun className="h-5 w-5" />
                  <span>Light</span>
                </Button>
                <Button
                  variant={mode === 'dark' ? 'default' : 'outline'}
                  onClick={() => setMode('dark')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Moon className="h-5 w-5" />
                  <span>Dark</span>
                </Button>
                <Button
                  variant={mode === 'system' ? 'default' : 'outline'}
                  onClick={() => setMode('system')}
                  className="flex flex-col items-center gap-2 h-auto py-4"
                >
                  <Monitor className="h-5 w-5" />
                  <span>System</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="themes" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select Theme</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={cn(
                      'relative p-4 rounded-lg border-2 transition-all text-left',
                      currentTheme === theme.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{theme.name}</span>
                      {theme.isCustom && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomTheme(theme.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: theme.colors.primary }}
                      />
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: theme.colors.secondary }}
                      />
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: theme.colors.destructive }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Create Custom Theme</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Theme name"
                    value={customThemeName}
                    onChange={(e) => setCustomThemeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCustomTheme();
                      }
                    }}
                  />
                  <Button onClick={handleCreateCustomTheme}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>

              {currentThemeData && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Edit Current Theme Colors</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2">
                      {colorFields.map((field) => {
                        const value = currentThemeData.colors[field.key];
                        return (
                          <div key={field.key} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={field.key} className="text-xs">
                                {field.label}
                              </Label>
                              <div
                                className="w-6 h-6 rounded border border-border"
                                style={{ backgroundColor: value }}
                              />
                            </div>
                            <Input
                              id={field.key}
                              type="text"
                              value={value}
                              onChange={(e) => handleColorChange(field.key, e.target.value)}
                              className="text-xs font-mono"
                            />
                            {field.description && (
                              <p className="text-xs text-muted-foreground">{field.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

