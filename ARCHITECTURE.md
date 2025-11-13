# Tasks Architecture Overview

This document explains how the Tasks & Notes application is organised today. It is written for technical contributors who want to understand how data flows through the system, how we persist state, and how the major modules fit together.

---

## 1. High-Level Runtime

- **Client type**: single-page application built with React + TypeScript + Vite.
- **State management**: Zustand stores scoped by domain (workspaces, tasks, notes, UI, media, sync).
- **UI kit**: shadcn/ui components + Tailwind classes + custom styles.
- **Persistence**: browser localStorage for primary state; optional Google Drive backup for off-device recovery.
- **Media handling**: `mediaStore` tracks all binary assets (images, audio, video) behind `media:` references that the Markdown editor/viewer can resolve.
- **Command palette**: Advanced command execution engine for bulk task/note creation with full attribute support (accessible via `Ctrl+/` or `Ctrl+K`).

```
User Interaction → React Components → Zustand actions/selectors
                 → Local stores (persist middleware) → Browser storage
                 → Optional Google Drive sync (via services/google/*)
                 → Command Palette (bulk operations via command parser/executor)
```

---

## 2. State & Data Domains

| Domain          | Store / Module                    | Notes                                                                 |
|-----------------|------------------------------------|-----------------------------------------------------------------------|
| Workspaces      | `workspaceStore`                   | Active workspace, list management, colour, metadata.                  |
| Tasks & Notes   | `taskStore`                        | Tasks, subtasks, standalone notes, board ordering, note folders.      |
| UI              | `uiStore`, `viewStore`, `selectionStore` | Sidebar collapsed state, current view/tab, selection model.     |
| Media           | `mediaStore`                       | Unified map of `mediaId → StoredMedia` (type, base64 data, metadata). |
| Sync            | `syncStore`                        | Connection state with Google Drive, last backup metadata.             |
| History         | `noteHistoryStore`, `noteFolderStore` | Version history and note folder tree.                             |

LocalStorage keys are versioned via Zustand `persist` middleware; media storage currently serialises to JSON with an aggressive cleanup strategy when approaching 5 MB.

---

## 3. Core Entities (current implementation)

```ts
Workspace {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

Task {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;   // Markdown with media references
  status: 'todo' | 'in-progress' | 'done' | 'archived';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  notes?: Note[];         // Attached notes
  createdAt: number;
  updatedAt: number;
}

Note {
  id: string;
  workspaceId: string;
  taskId?: string;        // Undefined for standalone notes
  title: string;
  content: string;        // Markdown
  folderId?: string;
  createdAt: number;
  updatedAt: number;
}

StoredMedia {
  id: string;
  type: 'image' | 'audio' | 'video' | 'photo';
  data: string;           // base64 data URI
  mimeType: string;
  filename: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  createdAt: number;
  lastUsedAt: number;
}
```

We deliberately map embedded assets to short references (`![alt](media:abc123)`) to keep Markdown content light and resilient when syncing/importing.

---

## 4. Persistence & Backup Flow

### Local storage
- Each Zustand domain persists under its own key: `workspace-storage`, `task-storage`, `media-storage`, etc.
- Writes are debounced inside stores to avoid thrashing when typing in notes.
- Media store triggers cleanup when JSON size approaches quota (~5 MB).

### Google Drive backup
1. User authenticates via OAuth 2.0 PKCE (no client secret embedded).
2. Tokens (access + refresh) are stored in browser storage under `google_auth_tokens`.
3. `syncService` uploads/export payloads as JSON file into an app-specific folder in Drive.
4. `BackupManager` and `ImportDialog` reuse the same schema to restore from Drive or manual uploads.

> Future work: move refresh tokens to a backend token broker for higher security.

---

## 5. Media Pipeline

- **Creation**: Markdown editor and audio recorder call `storeMedia` which:
  - Generates ID (`nanoid`), stores base64 payload, records dimensions/duration.
  - Returns `media:{id}` reference inserted into Markdown.
- **Rendering**: Markdown viewer intercepts image/audio placeholders and resolves them to `<img>` / `<audio>` / `<video>` elements.
- **Cleanup**: `collectUsedMediaIds` scans all Markdown content; unused media older than a retention window are pruned.

---

## 6. Folder & Module Layout (current)

```
src/
├── components/
│   ├── layout/          // App shell, sidebar, headers
│   ├── notes/           // MarkdownEditor, MarkdownViewer, toolbar, audio recorder
│   ├── task/            // TaskList, TaskBoard, TaskEditor modals
│   ├── import-export/   // Backup manager, import dialog
│   ├── shared/          // Error boundaries, skeletons, buttons, CommandPalette, etc.
│   └── ui/              // shadcn wrappers
├── stores/              // Zustand stores (workspace, task, media, etc.)
├── hooks/               // Reusable hooks (image paste, debounce, command palette)
├── lib/
│   ├── commands/        // Command parser & executor for bulk operations
│   ├── export/          // Data collector, JSON exporter
│   ├── import/          // JSON importer & helpers
│   ├── markdown/        // Reference utilities (image -> media)
│   └── storage/         // Local storage helpers, adapters
├── services/
│   └── google/          // auth.ts (PKCE flow), drive.ts (upload/download)
├── types/               // Shared TypeScript types
├── constants/           // Static configuration, keyboard shortcuts
└── App.tsx              // Entry point, providers, OAuth bootstrap
```

Static assets, mockups, and README screenshots live under `media/`.

---

## 7. Build & Tooling

- **Build**: Vite + esbuild bundler. `npm run build:gh-pages` prepares a static bundle for GitHub Pages.
- **Linting**: TypeScript compiler and ESLint (run via IDE or `npm run lint` when enabled).
- **Testing**: Manual focus today; automated test harness to be introduced.
- **Deployment**: Static hosting (GitHub Pages). Users maintain `.env.local` with `VITE_GOOGLE_CLIENT_ID`.

---

## 8. Command Palette & Bulk Operations

The command palette (`Ctrl+/` or `Ctrl+K`) provides a powerful interface for bulk task and note creation:

### Features
- **Dual Mode**: Search mode for navigation and Command mode for bulk operations
- **Workspace Context**: Always shows the active workspace clearly
- **Multi-line Execution**: Paste and execute multiple commands at once
- **Full Attribute Support**: All task attributes can be set via commands (status, priority, tags, dates, recurrence, etc.)
- **Execution Results**: Detailed feedback showing what was created and any errors
- **Command Syntax**:
  - `task "Title" [options]` - Create a task with optional attributes
  - `note "Title" "Content"` - Create a standalone note
  - Simple task titles (without "task" prefix) are also supported

### Command Options
- `status`: todo|in-progress|blocked|done|archived
- `priority`: none|low|medium|high|urgent
- `tags`: comma-separated list
- `labels`: comma-separated list
- `due`: YYYY-MM-DD or YYYY-MM-DD HH:mm
- `start`: YYYY-MM-DD or YYYY-MM-DD HH:mm
- `reminder`: YYYY-MM-DD or YYYY-MM-DD HH:mm
- `description`: "Description text"
- `progress`: 0-100
- `estimated`: minutes
- `actual`: minutes
- `recurrence`: pattern:interval[:endDate]

### Implementation
- **Parser** (`lib/commands/commandParser.ts`): Parses command strings into structured commands
- **Executor** (`lib/commands/commandExecutor.ts`): Executes parsed commands and returns results
- **UI** (`components/shared/CommandPalette.tsx`): Dual-mode interface with search and command execution

---

## 9. Known Gaps / Future Enhancements

- Backend token broker for Google OAuth tokens to reduce exposure.
- IndexedDB/OPFS store for large media collections.
- Automated test suite (unit + E2E) and Cypress/Playwright harness.
- Collaborative features (presence, multi-user state, server reconciliation).
- Advanced analytics pipeline and snapshotting for large workspaces.

---

This architecture reflects the current implementation as of Phase 7. It is meant to evolve; contributors are encouraged to add Architecture Decision Records (ADRs) when shipping material changes to data flows or persistence strategies.
# TODO App Architecture - Enterprise-Grade Frontend Application

## 🏗️ System Architecture Overview

### Core Principles
- **Modularity**: Every feature is a self-contained module
- **Scalability**: Handle thousands of tasks without performance degradation
- **Extensibility**: Plugin-like architecture for future features
- **Performance**: Optimistic updates, virtualization, lazy loading
- **Data Integrity**: Versioning, migrations, validation
- **User Experience**: Keyboard shortcuts, drag & drop, animations

---

## 📊 Data Model Architecture

### Core Entities

```typescript
// Workspace/Project System
Workspace {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  createdAt: timestamp
  updatedAt: timestamp
  settings: WorkspaceSettings
  archived: boolean
}

// Task System with Rich Metadata
Task {
  id: string
  workspaceId: string
  parentTaskId?: string (for nested tasks)
  
  // Basic Info
  title: string
  description: string (Markdown)
  status: TaskStatus (todo | in-progress | blocked | done | archived)
  
  // Organization
  priority: Priority (none | low | medium | high | urgent)
  tags: Tag[]
  labels: Label[]
  assignee?: string (for future multi-user)
  
  // Time Management
  dueDate?: timestamp
  startDate?: timestamp
  estimatedTime?: number (minutes)
  actualTime?: number (minutes)
  reminderDate?: timestamp
  
  // Recurrence
  recurrence?: RecurrenceRule {
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
    interval: number
    endDate?: timestamp
    daysOfWeek?: number[]
    dayOfMonth?: number
  }
  
  // Dependencies
  dependencies: string[] (task IDs that must be completed first)
  blockedBy: string[] (task IDs blocking this task)
  
  // Progress Tracking
  progress: number (0-100)
  completedAt?: timestamp
  
  // Rich Content
  notes: Note[] (multiple notes with history)
  attachments: Attachment[]
  comments: Comment[]
  checklists: Checklist[]
  
  // Subtasks (nested structure)
  subtasks: Subtask[]
  
  // Metadata
  createdAt: timestamp
  updatedAt: timestamp
  createdBy?: string
  templateId?: string (if created from template)
  
  // Custom Fields (extensible)
  customFields: Record<string, any>
}

// Nested Subtask Structure
Subtask {
  id: string
  taskId: string
  parentSubtaskId?: string (allows nesting)
  
  title: string
  description?: string
  completed: boolean
  order: number
  
  // Can have own subtasks (recursive)
  subtasks?: Subtask[]
  
  createdAt: timestamp
  completedAt?: timestamp
}

// Rich Notes System
Note {
  id: string
  taskId: string
  
  content: string (Markdown with embedded media)
  version: number
  previousVersionId?: string (for history)
  
  // Embedded Media
  images: ImageData[]
  files: FileData[]
  links: LinkPreview[]
  
  // Metadata
  createdAt: timestamp
  updatedAt: timestamp
  pinned: boolean
  tags: string[]
}

// Image/File Storage
ImageData {
  id: string
  data: string (base64)
  thumbnail?: string (compressed thumbnail)
  mimeType: string
  filename: string
  size: number (bytes)
  width?: number
  height?: number
  alt?: string
  createdAt: timestamp
}

FileData {
  id: string
  data: string (base64 or blob URL)
  mimeType: string
  filename: string
  size: number
  type: 'image' | 'document' | 'video' | 'audio' | 'other'
  createdAt: timestamp
}

// Checklist System
Checklist {
  id: string
  taskId: string
  title: string
  items: ChecklistItem[]
  order: number
}

ChecklistItem {
  id: string
  checklistId: string
  text: string
  completed: boolean
  order: number
  dueDate?: timestamp
}

// Tag & Label System
Tag {
  id: string
  name: string
  color: string
  workspaceId?: string (workspace-specific or global)
  createdAt: timestamp
}

Label {
  id: string
  name: string
  color: string
  icon?: string
  workspaceId?: string
  createdAt: timestamp
}

// Template System
TaskTemplate {
  id: string
  name: string
  description: string
  workspaceId?: string
  
  // Template structure mirrors Task but with placeholders
  taskStructure: Partial<Task>
  
  createdAt: timestamp
  usageCount: number
}

// Comment System
Comment {
  id: string
  taskId: string
  parentCommentId?: string (for threading)
  
  content: string (Markdown)
  author?: string
  createdAt: timestamp
  editedAt?: timestamp
  reactions?: Reaction[]
}

// Filter & View System
SavedView {
  id: string
  name: string
  workspaceId?: string
  
  filters: Filter[]
  sortBy: SortOption
  groupBy?: GroupOption
  viewType: ViewType
  
  createdAt: timestamp
}

Filter {
  field: string
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn'
  value: any
}

// Statistics & Analytics
TaskStats {
  workspaceId?: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  tasksByPriority: Record<Priority, number>
  tasksByTag: Record<string, number>
  completionRate: number
  averageCompletionTime: number
  streakDays: number
  lastUpdated: timestamp
}
```

---

## 🗂️ Folder Structure

```
src/
├── app/                          # App-level configuration
│   ├── providers.tsx            # Context providers
│   └── router.tsx               # Routing (if needed)
│
├── components/                  # React components
│   ├── ui/                      # shadcn base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── select.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── popover.tsx
│   │   ├── tooltip.tsx
│   │   ├── badge.tsx
│   │   ├── separator.tsx
│   │   ├── scroll-area.tsx
│   │   ├── tabs.tsx
│   │   ├── calendar.tsx
│   │   ├── command.tsx          # Command palette
│   │   ├── sheet.tsx            # Sidebar
│   │   ├── toast.tsx
│   │   ├── slider.tsx
│   │   ├── switch.tsx
│   │   ├── context-menu.tsx
│   │   └── ...
│   │
│   ├── layout/                  # Layout components
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── CommandPalette.tsx
│   │
│   ├── workspace/               # Workspace management
│   │   ├── WorkspaceList.tsx
│   │   ├── WorkspaceCard.tsx
│   │   ├── WorkspaceEditor.tsx
│   │   └── WorkspaceSwitcher.tsx
│   │
│   ├── task/                    # Task components
│   │   ├── TaskList.tsx
│   │   ├── TaskItem.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskEditor.tsx
│   │   ├── TaskDetail.tsx
│   │   ├── TaskQuickAdd.tsx
│   │   ├── TaskActions.tsx
│   │   └── TaskDragHandle.tsx
│   │
│   ├── subtask/                 # Subtask components
│   │   ├── SubtaskList.tsx
│   │   ├── SubtaskItem.tsx
│   │   ├── SubtaskEditor.tsx
│   │   └── SubtaskTree.tsx      # Nested subtask tree
│   │
│   ├── notes/                   # Notes system
│   │   ├── MarkdownEditor.tsx
│   │   ├── MarkdownViewer.tsx
│   │   ├── NoteHistory.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── LinkPreview.tsx
│   │   └── MarkdownToolbar.tsx
│   │
│   ├── checklist/               # Checklist components
│   │   ├── ChecklistList.tsx
│   │   ├── ChecklistItem.tsx
│   │   └── ChecklistEditor.tsx
│   │
│   ├── tags/                    # Tag management
│   │   ├── TagList.tsx
│   │   ├── TagEditor.tsx
│   │   ├── TagPicker.tsx
│   │   └── TagBadge.tsx
│   │
│   ├── filters/                 # Filtering & sorting
│   │   ├── FilterBar.tsx
│   │   ├── FilterBuilder.tsx
│   │   ├── SortMenu.tsx
│   │   └── SavedViews.tsx
│   │
│   ├── views/                   # Different view modes
│   │   ├── ListView.tsx
│   │   ├── BoardView.tsx        # Kanban board
│   │   ├── CalendarView.tsx
│   │   ├── TimelineView.tsx
│   │   ├── GanttView.tsx
│   │   └── TableView.tsx
│   │
│   ├── import-export/           # Data management
│   │   ├── ImportDialog.tsx
│   │   ├── ExportDialog.tsx
│   │   ├── BackupManager.tsx
│   │   └── MigrationTool.tsx
│   │
│   ├── analytics/               # Statistics & insights
│   │   ├── StatsDashboard.tsx
│   │   ├── ProductivityChart.tsx
│   │   ├── CompletionRate.tsx
│   │   └── TimeTracking.tsx
│   │
│   ├── templates/              # Task templates
│   │   ├── TemplateList.tsx
│   │   ├── TemplateEditor.tsx
│   │   └── TemplatePicker.tsx
│   │
│   └── shared/                 # Shared components
│       ├── DragDropProvider.tsx
│       ├── KeyboardShortcuts.tsx
│       ├── SearchBar.tsx
│       ├── EmptyState.tsx
│       └── LoadingState.tsx
│
├── stores/                      # Zustand stores
│   ├── workspaceStore.ts
│   ├── taskStore.ts
│   ├── tagStore.ts
│   ├── templateStore.ts
│   ├── viewStore.ts
│   ├── uiStore.ts
│   └── index.ts                # Store exports
│
├── hooks/                       # Custom React hooks
│   ├── useLocalStorage.ts
│   ├── useDebounce.ts
│   ├── useKeyboardShortcut.ts
│   ├── useDragAndDrop.ts
│   ├── useImagePaste.ts
│   ├── useMarkdown.ts
│   ├── useTaskFilters.ts
│   ├── useTaskSearch.ts
│   ├── useVirtualization.ts
│   ├── useInfiniteScroll.ts
│   ├── useRecurrence.ts
│   ├── useDependencies.ts
│   └── useAnalytics.ts
│
├── lib/                         # Utility libraries
│   ├── utils.ts
│   ├── storage/
│   │   ├── localStorage.ts
│   │   ├── storageAdapter.ts
│   │   ├── migration.ts
│   │   └── compression.ts
│   ├── markdown/
│   │   ├── parser.ts
│   │   ├── renderer.ts
│   │   ├── plugins.ts
│   │   └── imageHandler.ts
│   ├── date/
│   │   ├── formatters.ts
│   │   ├── recurrence.ts
│   │   └── timezone.ts
│   ├── search/
│   │   ├── fullTextSearch.ts
│   │   └── filters.ts
│   ├── export/
│   │   ├── json.ts
│   │   ├── csv.ts
│   │   ├── markdown.ts
│   │   └── pdf.ts (optional)
│   ├── import/
│   │   ├── json.ts
│   │   ├── csv.ts
│   │   └── todoist.ts (example)
│   └── validation/
│       └── schemas.ts           # Zod schemas
│
├── types/                       # TypeScript types
│   ├── task.ts
│   ├── workspace.ts
│   ├── note.ts
│   ├── filter.ts
│   └── index.ts
│
├── services/                    # Business logic services
│   ├── taskService.ts
│   ├── workspaceService.ts
│   ├── searchService.ts
│   ├── analyticsService.ts
│   └── exportService.ts
│
├── constants/                   # App constants
│   ├── shortcuts.ts
│   ├── priorities.ts
│   ├── statuses.ts
│   └── config.ts
│
└── styles/                     # Global styles
    ├── animations.css
    └── themes.css
```

---

## 🎯 Feature Set

### Core Features
1. **Multi-Workspace System**
   - Create unlimited workspaces/projects
   - Workspace-specific tags, labels, templates
   - Quick workspace switching
   - Workspace archiving

2. **Advanced Task Management**
   - Nested tasks (tasks can have parent tasks)
   - Task dependencies (blocking/blocked by)
   - Task templates
   - Bulk operations (select multiple, batch edit)
   - Task archiving
   - Task duplication
   - Task linking (reference other tasks)

3. **Rich Subtask System**
   - Unlimited nesting levels
   - Progress calculation from subtasks
   - Individual subtask notes
   - Subtask dependencies
   - Drag & drop reordering

4. **Priority & Status System**
   - 5-level priority (none, low, medium, high, urgent)
   - Custom statuses (todo, in-progress, blocked, done, archived)
   - Visual indicators (colors, icons)

5. **Tag & Label System**
   - Unlimited tags per task
   - Tag colors and icons
   - Tag filtering
   - Tag autocomplete
   - Workspace-specific or global tags

6. **Time Management**
   - Due dates with time
   - Start dates
   - Recurring tasks (daily, weekly, monthly, yearly, custom)
   - Reminders
   - Time tracking (estimated vs actual)
   - Calendar integration

7. **Rich Notes System**
   - Full Markdown support
   - Multiple notes per task
   - Note versioning/history
   - Image paste & upload (base64)
   - File attachments
   - Link previews
   - Code syntax highlighting
   - Tables, lists, checkboxes
   - Math equations (optional)
   - Note templates

8. **Checklist System**
   - Multiple checklists per task
   - Nested checklist items
   - Progress tracking
   - Due dates on items

9. **Multiple View Modes**
   - **List View**: Traditional list with filters
   - **Board View**: Kanban-style columns
   - **Calendar View**: Month/week/day views
   - **Timeline View**: Gantt-style timeline
   - **Table View**: Spreadsheet-like view
   - **Focus View**: Single task focus mode

10. **Advanced Filtering & Sorting**
    - Multi-criteria filters
    - Saved filter presets
    - Quick filters (today, overdue, this week)
    - Custom sort options
    - Group by (status, priority, tag, assignee, date)
    - Search with full-text search

11. **Drag & Drop**
    - Reorder tasks
    - Move between workspaces
    - Change status in board view
    - Reorder subtasks
    - Drag images into notes

12. **Keyboard Shortcuts**
    - Global shortcuts (Cmd+K for command palette)
    - Task creation shortcuts
    - Navigation shortcuts
    - Bulk selection shortcuts
    - Customizable shortcuts

13. **Command Palette**
    - Quick task creation
    - Quick navigation
    - Quick actions
    - Search everything

14. **Import/Export**
    - Export to JSON (full data)
    - Export to CSV
    - Export to Markdown
    - Import from JSON
    - Import from CSV
    - Import from other TODO apps (Todoist, etc.)
    - Scheduled backups
    - Data migration between versions

15. **Analytics & Insights**
    - Completion rate
    - Tasks by priority/status
    - Productivity trends
    - Time tracking stats
    - Streak tracking
    - Custom reports

16. **Templates**
    - Task templates
    - Note templates
    - Workspace templates
    - Template library

17. **UI/UX Features**
    - Dark/light theme toggle
    - Customizable colors
    - Animations & transitions
    - Responsive design
    - Mobile-friendly
    - Accessibility (ARIA labels, keyboard nav)
    - Empty states
    - Loading states
    - Error handling

18. **Performance Optimizations**
    - Virtual scrolling for long lists
    - Lazy loading
    - Debounced search
    - Optimistic updates
    - IndexedDB for large data (optional)
    - Data compression
    - Memoization

---

## 🔧 Technical Stack

### Core
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling

### Additional Libraries
- **nanoid** - ID generation
- **date-fns** - Date manipulation
- **zod** - Schema validation
- **react-markdown** - Markdown rendering
- **remark-gfm** - GitHub Flavored Markdown
- **react-syntax-highlighter** - Code highlighting
- **react-beautiful-dnd** or **@dnd-kit** - Drag & drop
- **react-virtual** - Virtual scrolling
- **cmdk** - Command palette
- **fuse.js** - Fuzzy search
- **pako** - Compression (optional)

---

## 💾 Storage Architecture

### LocalStorage Strategy
1. **Data Partitioning**
   - Separate keys for workspaces, tasks, tags, etc.
   - Versioned storage keys for migrations
   - Compressed storage for large data

2. **Storage Limits**
   - Monitor localStorage size
   - Warn when approaching limits
   - Offer IndexedDB migration option

3. **Data Versioning**
   - Schema version in storage
   - Migration system for updates
   - Backup before migration

4. **Performance**
   - Debounced writes
   - Batch updates
   - Selective loading (load workspace tasks on demand)

---

## 🎨 UI/UX Design Principles

1. **Consistency**: Unified design language
2. **Feedback**: Clear visual feedback for all actions
3. **Efficiency**: Keyboard shortcuts for power users
4. **Clarity**: Clear hierarchy and visual organization
5. **Flexibility**: Customizable views and layouts
6. **Performance**: Smooth animations, no jank
7. **Accessibility**: WCAG compliant

---

## 🚀 Implementation Phases

### Phase 1: Foundation
- Project setup
- Core data models
- Basic storage system
- shadcn components installation
- Basic task CRUD

### Phase 2: Core Features
- Workspace system
- Task management (CRUD, status, priority)
- Subtasks (single level)
- Basic notes (Markdown)
- Tags & labels

### Phase 3: Advanced Features
- Nested subtasks
- Task dependencies
- Recurring tasks
- Multiple notes with history
- Image paste in notes
- Checklists

### Phase 4: Views & Navigation
- List view
- Board view
- Calendar view
- Filtering & sorting
- Search

### Phase 5: Power Features
- Drag & drop
- Keyboard shortcuts
- Command palette
- Templates
- Bulk operations

### Phase 6: Data Management
- Import/export
- Backup system
- Migration system
- Analytics

### Phase 7: Polish
- Animations
- Performance optimization
- Accessibility
- Mobile responsiveness
- Error handling

---

## 📝 Next Steps

1. Review and approve architecture
2. Set up project structure
3. Install dependencies
4. Implement Phase 1
5. Iterate through phases

---

This architecture provides a solid foundation for a world-class TODO application that can scale and evolve over time.

