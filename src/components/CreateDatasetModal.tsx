import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Folder, Sparkles } from 'lucide-react';

interface CreateDatasetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDataset: (name: string) => void;
}

export function CreateDatasetModal({ open, onOpenChange, onCreateDataset }: CreateDatasetModalProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onCreateDataset(name.trim());
      setName('');
    } catch (error) {
      console.error('Failed to create dataset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="relative mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center">
              <Folder className="h-8 w-8 text-primary" />
            </div>
            <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="space-y-2">
            <DialogTitle className="text-xl">Create New Dataset</DialogTitle>
            <DialogDescription className="text-base">
              Give your dataset a memorable name to help organize your video training data.
            </DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-medium">
              Dataset Name
            </Label>
            <Input
              id="name"
              data-testid="dataset-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Training Dataset 1"
              autoFocus
              className="h-12 text-base"
            />
          </div>
          <DialogFooter className="gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              data-testid="create-dataset-submit"
              disabled={!name.trim() || isLoading}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isLoading ? 'Creating...' : 'Create Dataset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
