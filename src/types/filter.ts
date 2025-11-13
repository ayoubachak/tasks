export type ViewType = 'list' | 'board' | 'calendar' | 'analytics';

export type SortField = 'created' | 'updated' | 'dueDate' | 'priority' | 'title' | 'status';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
}

export type FilterOperator = 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn' | 'isNull' | 'isNotNull';

export interface Filter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface QuickFilter {
  id: string;
  label: string;
  filters: Filter[];
}

export interface SavedView {
  id: string;
  name: string;
  workspaceId?: string;
  filters: Filter[];
  sortBy: SortOption;
  groupBy?: 'status' | 'priority' | 'tag' | 'dueDate' | 'none';
  viewType: ViewType;
  createdAt: number;
}

