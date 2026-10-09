import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { ChevronRight, MessageSquare, CheckSquare, Square } from 'lucide-react';
import { Loader } from './Loader';

export interface ResponsiveColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  mobilePriority?: 'high' | 'medium' | 'low'; // high: siempre visible, medium: visible en card, low: solo en desktop
}

export interface ResponsiveListProps<T> {
  data: T[];
  columns: ResponsiveColumn<T>[];
  loading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
  onRowSelect?: (row: T, selected: boolean) => void;
  selectedIds?: Set<string>;
  emptyMessage?: string;
  className?: string;
  getId?: (row: T) => string;
  actions?: (row: T) => Array<{
    icon?: React.ReactNode;
    label?: string;
    onClick?: (e: React.MouseEvent) => void;
    variant?: 'default' | 'danger';
    tooltip?: string;
    element?: React.ReactNode;
  }>;
}

export function ResponsiveList<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  onRowClick,
  onRowSelect,
  selectedIds,
  emptyMessage = 'No hay datos disponibles',
  className,
  getId = (row) => row.id || row._id || String(Math.random()),
  actions,
}: ResponsiveListProps<T>) {
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-switch to card view on mobile
      if (window.innerWidth < 768) {
        setViewMode('card');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getHighPriorityColumns = () => columns.filter(col => col.mobilePriority !== 'low');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="md" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400 p-8">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-slate-400" />
        </div>
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile Card View
  if (isMobile || viewMode === 'card') {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((row) => {
          const id = getId(row);
          const isSelected = selectedIds?.has(id);
          const isExpanded = expandedCards.has(id);
          const highPriorityCols = getHighPriorityColumns();

          return (
            <div
              key={id}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden transition-all duration-200",
                isSelected && "ring-2 ring-accent-500 border-accent-500",
                onRowClick && "cursor-pointer hover:shadow-md"
              )}
            >
              {/* Card Header - Always Visible */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Selection Checkbox */}
                  {onRowSelect && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRowSelect(row, !isSelected); }}
                      className="mt-1 p-1.5 rounded-lg transition-all flex-shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-accent-500" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  )}

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {highPriorityCols.slice(0, 2).map((col, index) => (
                      <div key={String(col.key)} className={index === 0 ? "" : "pt-2 border-t border-slate-100 dark:border-slate-700/30"}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          {col.header}
                        </p>
                        <div className={cn("text-sm text-slate-900 dark:text-white font-medium", col.className)}>
                          {col.render ? col.render(row[col.key as keyof T], row) : String(row[col.key as keyof T] ?? '')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCardExpand(id); }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform", isExpanded && "rotate-90")} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700/30">
                  <div className="pt-3 space-y-3">
                    {columns.filter(col => !highPriorityCols.slice(0, 2).includes(col)).map((col) => (
                      <div key={String(col.key)} className="flex items-start justify-between">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[100px]">
                          {col.header}
                        </p>
                        <div className={cn("text-sm text-slate-700 dark:text-slate-300 text-right flex-1 ml-4", col.className)}>
                          {col.render ? col.render(row[col.key as keyof T], row) : String(row[col.key as keyof T] ?? '')}
                        </div>
                      </div>
                    ))}

                    {/* Quick Actions */}
                    {actions && actions(row).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 mt-4 border-t border-slate-100 dark:border-slate-700/30">
                        {actions(row).map((action, idx) => (
                          action.element ? (
                            <React.Fragment key={idx}>{action.element}</React.Fragment>
                          ) : (
                            <button
                              key={idx}
                              onClick={(e) => { e.stopPropagation(); action.onClick?.(e); }}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                action.variant === 'danger'
                                  ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                              )}
                            >
                              {action.icon}
                              {action.label}
                            </button>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Mobile Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Página {pagination.currentPage} de {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {onRowSelect && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds?.size === data.length}
                    onChange={(e) => {
                      const allSelected = e.target.checked;
                      data.forEach(row => onRowSelect?.(row, allSelected));
                    }}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
              {actions && <th className="w-16 px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const id = getId(row);
              const isSelected = selectedIds?.has(id);

              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors',
                    index % 2 === 0 && 'bg-accent-50/30 dark:bg-accent-950/20',
                    isSelected && 'bg-accent-50/50 dark:bg-accent-950/30',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {onRowSelect && (
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); onRowSelect(row, !isSelected); }}
                        className="p-1 rounded-lg transition-all"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-accent-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn('px-4 py-3 text-sm text-slate-700 dark:text-slate-300', column.className)}
                    >
                      {column.render ? column.render(row[column.key as keyof T], row) : String(row[column.key as keyof T] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {actions(row).map((action, idx) => (
                          action.element ? (
                            <React.Fragment key={idx}>{action.element}</React.Fragment>
                          ) : (
                            <button
                              key={idx}
                              onClick={(e) => { e.stopPropagation(); action.onClick?.(e); }}
                              className={cn(
                                "p-1.5 rounded-lg transition-all",
                                action.variant === 'danger'
                                  ? "text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                                  : "text-slate-400 hover:text-accent-500 hover:bg-accent-500/10"
                              )}
                              title={action.tooltip}
                            >
                              {action.icon}
                            </button>
                          )
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Página {pagination.currentPage} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
