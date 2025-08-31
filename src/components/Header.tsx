import { ThemeToggle } from '@/components/ThemeToggle';
import { Video, Sparkles } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Video className="h-8 w-8 text-primary" />
                <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Easy Vid Trainer
                </h1>
                {title && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-1 h-4 bg-primary/20 rounded-full" />
                    <span className="text-sm text-muted-foreground">{title}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {children}
            <ThemeToggle />
          </div>
        </div>
        
        {subtitle && (
          <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
