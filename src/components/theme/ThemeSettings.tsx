import { useState } from 'react';
import { useThemeStore, type Theme } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Sun, Monitor, Trash2, Plus } from 'lucide-react';
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

  const [customThemeName, setCustomThemeName] = useState('');

  const currentThemeData = getCurrentTheme();
  // Separate predefined and custom themes
  const predefinedThemes = themes.filter((t) => !t.isCustom);
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
    <div className="w-full">
      <Tabs defaultValue="mode" className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-3 h-auto flex-shrink-0">
            <TabsTrigger value="mode" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Mode</TabsTrigger>
            <TabsTrigger value="themes" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Themes</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs sm:text-sm py-2 px-2 sm:px-4">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="mode" className="space-y-4 mt-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Color Mode</Label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Button
                  variant={mode === 'light' ? 'default' : 'outline'}
                  onClick={() => setMode('light')}
                  className="flex flex-col items-center gap-1 sm:gap-2 h-auto py-3 sm:py-4 text-xs sm:text-sm"
                >
                  <Sun className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Light</span>
                </Button>
                <Button
                  variant={mode === 'dark' ? 'default' : 'outline'}
                  onClick={() => setMode('dark')}
                  className="flex flex-col items-center gap-1 sm:gap-2 h-auto py-3 sm:py-4 text-xs sm:text-sm"
                >
                  <Moon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Dark</span>
                </Button>
                <Button
                  variant={mode === 'system' ? 'default' : 'outline'}
                  onClick={() => setMode('system')}
                  className="flex flex-col items-center gap-1 sm:gap-2 h-auto py-3 sm:py-4 text-xs sm:text-sm"
                >
                  <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>System</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="themes" className="space-y-4 mt-4 flex-1 overflow-y-auto">
            <div className="space-y-4">
              {predefinedThemes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Predefined Themes</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {predefinedThemes.map((theme) => (
                      <div
                        key={theme.id}
                        onClick={() => setTheme(theme.id)}
                        className={cn(
                          'relative p-3 sm:p-4 rounded-lg border-2 transition-all text-left cursor-pointer',
                          currentTheme === theme.id
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-xs sm:text-sm">{theme.name}</span>
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {customThemes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Custom Themes</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {customThemes.map((theme) => (
                  <div
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    className={cn(
                      'relative p-3 sm:p-4 rounded-lg border-2 transition-all text-left cursor-pointer',
                      currentTheme === theme.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-xs sm:text-sm">{theme.name}</span>
                      {theme.isCustom && (
                        <button
                          type="button"
                          className="h-6 w-6 rounded-md hover:bg-destructive/10 flex items-center justify-center transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomTheme(theme.id);
                          }}
                          aria-label={`Delete ${theme.name} theme`}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
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
                  </div>
                    ))}
                  </div>
                </div>
              )}
              
              {predefinedThemes.length === 0 && customThemes.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No themes available
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4 flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm sm:text-base">Create Custom Theme</Label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Input
                    placeholder="Theme name"
                    value={customThemeName}
                    onChange={(e) => setCustomThemeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateCustomTheme();
                      }
                    }}
                    className="text-sm sm:text-base"
                  />
                  <Button onClick={handleCreateCustomTheme} className="text-xs sm:text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </div>

              {currentThemeData && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm sm:text-base">Edit Current Theme Colors</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto p-2">
                      {colorFields.map((field) => {
                        const value = currentThemeData.colors[field.key];
                        return (
                          <div key={field.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <Label htmlFor={field.key} className="text-xs sm:text-sm flex-1">
                                {field.label}
                              </Label>
                              <div
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-border flex-shrink-0"
                                style={{ backgroundColor: value }}
                              />
                            </div>
                            <Input
                              id={field.key}
                              type="text"
                              value={value}
                              onChange={(e) => handleColorChange(field.key, e.target.value)}
                              className="text-xs sm:text-sm font-mono"
                            />
                            {field.description && (
                              <p className="text-xs text-muted-foreground hidden sm:block">{field.description}</p>
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
    </div>
  );
}

