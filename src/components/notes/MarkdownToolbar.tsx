import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Link,
  Image as ImageIcon,
  Code,
  Quote,
  Minus,
  Table,
  Mic,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarkdownToolbarProps {
  onInsert: (before: string, after: string, placeholder?: string) => void;
  onImageUpload: () => void;
  onToggleAudio?: () => void;
  audioActive?: boolean;
}

export function MarkdownToolbar({ onInsert, onImageUpload, onToggleAudio, audioActive }: MarkdownToolbarProps) {
  const insertAtCursor = (before: string, after: string = '', placeholder?: string) => {
    onInsert(before, after, placeholder);
  };

  const ToolbarButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    shortcut,
    mobileHidden = false,
    className,
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    label: string; 
    onClick: () => void;
    shortcut?: string;
    mobileHidden?: boolean;
    className?: string;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-4 w-4 sm:h-8 sm:w-8 !p-0 flex-shrink-0',
              mobileHidden ? 'hidden sm:inline-flex' : 'inline-flex',
              className
            )}
            onClick={onClick}
          >
            <Icon className="h-2 w-2 sm:h-4 sm:w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs sm:text-sm">{label} {shortcut && <span className="text-xs text-muted-foreground">({shortcut})</span>}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="flex items-center gap-0.5 sm:gap-1 border-b bg-muted/50 !p-0 sm:p-2 flex-wrap min-h-[1.75rem] sm:min-h-[2.5rem]">
      <ToolbarButton
        icon={Bold}
        label="Bold"
        shortcut="Ctrl+B"
        onClick={() => insertAtCursor('**', '**', 'bold text')}
      />
      <ToolbarButton
        icon={Italic}
        label="Italic"
        shortcut="Ctrl+I"
        onClick={() => insertAtCursor('*', '*', 'italic text')}
      />
      <ToolbarButton
        icon={Strikethrough}
        label="Strikethrough"
        onClick={() => insertAtCursor('~~', '~~', 'strikethrough text')}
      />
      <Separator orientation="vertical" className="h-2.5 sm:h-6 flex-shrink-0" />
      <ToolbarButton
        icon={Heading1}
        label="Heading 1"
        onClick={() => insertAtCursor('# ', '', 'Heading 1')}
      />
      <ToolbarButton
        icon={Heading2}
        label="Heading 2"
        onClick={() => insertAtCursor('## ', '', 'Heading 2')}
      />
      <ToolbarButton
        icon={Heading3}
        label="Heading 3"
        onClick={() => insertAtCursor('### ', '', 'Heading 3')}
      />
      <Separator orientation="vertical" className="h-2.5 sm:h-6 flex-shrink-0" />
      <ToolbarButton
        icon={List}
        label="Bullet List"
        onClick={() => insertAtCursor('- ', '', 'List item')}
      />
      <ToolbarButton
        icon={ListOrdered}
        label="Numbered List"
        onClick={() => insertAtCursor('1. ', '', 'List item')}
      />
      <ToolbarButton
        icon={CheckSquare}
        label="Task List"
        onClick={() => insertAtCursor('- [ ] ', '', 'Task item')}
      />
      <ToolbarButton
        icon={Quote}
        label="Quote"
        onClick={() => insertAtCursor('> ', '', 'Quote')}
      />
      <Separator orientation="vertical" className="h-2.5 sm:h-6 flex-shrink-0" />
      <ToolbarButton
        icon={Link}
        label="Link"
        onClick={() => insertAtCursor('[', '](url)', 'link text')}
      />
      <ToolbarButton
        icon={Code}
        label="Inline Code"
        onClick={() => insertAtCursor('`', '`', 'code')}
      />
      <ToolbarButton
        icon={Code}
        label="Code Block"
        onClick={() => insertAtCursor('```\n', '\n```', 'code')}
      />
      <ToolbarButton
        icon={ImageIcon}
        label="Image"
        onClick={onImageUpload}
      />
      {onToggleAudio && (
        <ToolbarButton
          icon={Mic}
          label="Record Audio"
          onClick={onToggleAudio}
          className={audioActive ? 'bg-primary text-primary-foreground hover:bg-primary/90' : undefined}
        />
      )}
      <ToolbarButton
        icon={Table}
        label="Table"
        onClick={() => insertAtCursor('\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n', '', '')}
      />
      <Separator orientation="vertical" className="h-2.5 sm:h-6 flex-shrink-0" />
      <ToolbarButton
        icon={Minus}
        label="Horizontal Rule"
        onClick={() => insertAtCursor('\n\n---\n\n', '')}
      />
    </div>
  );
}

