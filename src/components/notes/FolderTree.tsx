import { useState } from 'react';
import { useNoteFolderStore, useWorkspaceStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, FolderOpen, ChevronRight, ChevronDown, Plus, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { NoteFolder } from '@/types';

interface FolderTreeProps {
  selectedFolderId: string | undefined;
  onSelectFolder: (folderId: string | undefined) => void;
  onCreateFolder: (parentFolderId?: string) => void;
  onEditFolder: (folderId: string) => void;
}

interface FolderItemProps {
  folder: NoteFolder & { children?: NoteFolder[] };
  level: number;
  selectedFolderId: string | undefined;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onSelect: (folderId: string) => void;
  onEdit: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onCreateChild: (parentFolderId: string) => void;
}

function FolderItem({
  folder,
  level,
  selectedFolderId,
  expandedFolders,
  onToggleExpand,
  onSelect,
  onEdit,
  onDelete,
  onCreateChild,
}: FolderItemProps) {
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer group hover:bg-accent',
          isSelected && 'bg-accent'
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(folder.id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="w-5" />
        )}
        {isExpanded ? (
          <FolderOpen className={cn('h-4 w-4', folder.color && `text-[${folder.color}]`)} />
        ) : (
          <Folder className={cn('h-4 w-4', folder.color && `text-[${folder.color}]`)} />
        )}
        <span className="flex-1 text-sm truncate">{folder.name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCreateChild(folder.id)}>
              <Plus className="mr-2 h-4 w-4" />
              New Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(folder.id)}>
              <Edit2 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (confirm(`Are you sure you want to delete "${folder.name}" and all its contents?`)) {
                  onDelete(folder.id);
                }
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
}: FolderTreeProps) {
  const { getActiveWorkspace } = useWorkspaceStore();
  const { getFolderTree, deleteFolder } = useNoteFolderStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const activeWorkspace = getActiveWorkspace();

  const folders = activeWorkspace ? getFolderTree(activeWorkspace.id) : [];

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleDeleteFolder = (folderId: string) => {
    deleteFolder(folderId);
    // If deleted folder was selected, go to root
    if (selectedFolderId === folderId) {
      onSelectFolder(undefined);
    }
  };

  return (
    <div className="flex flex-col h-full border-r bg-muted/30">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">Folders</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onCreateFolder()}
          title="New Folder"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2">
          <div
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent',
              selectedFolderId === undefined && 'bg-accent'
            )}
            onClick={() => onSelectFolder(undefined)}
          >
            <Folder className="h-4 w-4" />
            <span className="text-sm font-medium">All Notes</span>
          </div>
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={handleToggleExpand}
              onSelect={onSelectFolder}
              onEdit={onEditFolder}
              onDelete={handleDeleteFolder}
              onCreateChild={onCreateFolder}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

