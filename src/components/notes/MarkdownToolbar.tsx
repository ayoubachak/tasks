import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link,
  Image as ImageIcon,
  Code,
  Quote,
  Minus,
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
}

export function MarkdownToolbar({ onInsert, onImageUpload }: MarkdownToolbarProps) {
  const insertAtCursor = (before: string, after: string = '', placeholder?: string) => {
    onInsert(before, after, placeholder);
  };

  const ToolbarButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    shortcut 
  }: { 
    icon: React.ComponentType<{ className?: string }>; 
    label: string; 
    onClick: () => void;
    shortcut?: string;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClick}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label} {shortcut && <span className="text-xs text-muted-foreground">({shortcut})</span>}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="flex items-center gap-1 border-b bg-muted/50 p-2 flex-wrap">
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
      <Separator orientation="vertical" className="h-6" />
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
      <Separator orientation="vertical" className="h-6" />
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
        icon={Quote}
        label="Quote"
        onClick={() => insertAtCursor('> ', '', 'Quote')}
      />
      <Separator orientation="vertical" className="h-6" />
      <ToolbarButton
        icon={Link}
        label="Link"
        onClick={() => insertAtCursor('[', '](url)', 'link text')}
      />
      <ToolbarButton
        icon={Code}
        label="Code"
        onClick={() => insertAtCursor('`', '`', 'code')}
      />
      <ToolbarButton
        icon={ImageIcon}
        label="Image"
        onClick={onImageUpload}
      />
      <Separator orientation="vertical" className="h-6" />
      <ToolbarButton
        icon={Minus}
        label="Horizontal Rule"
        onClick={() => insertAtCursor('\n\n---\n\n', '')}
      />
    </div>
  );
}

