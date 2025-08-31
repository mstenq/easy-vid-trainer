import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Initialize immediately to prevent flash
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return savedTheme === 'dark' || (!savedTheme && prefersDark);
    }
    return false;
  });

  useEffect(() => {
    // Apply theme immediately on mount
    updateTheme(isDark);
  }, []);

  const updateTheme = (dark: boolean) => {
    // Apply to document element so it affects portals/modals too
    const root = document.documentElement;
    const rootElement = document.getElementById('root');
    
    if (dark) {
      root.classList.add('dark');
      rootElement?.classList.add('dark');
    } else {
      root.classList.remove('dark');
      rootElement?.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    updateTheme(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="h-9 w-9 p-0"
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-all text-white" />
      ) : (
        <Moon className="h-4 w-4 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}