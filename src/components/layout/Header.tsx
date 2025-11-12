import { CheckSquare } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Tasks</h1>
        </div>
      </div>
    </header>
  );
}

