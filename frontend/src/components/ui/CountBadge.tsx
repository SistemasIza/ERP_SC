interface CountBadgeProps {
  count: number;
  label?: string;
}

export const CountBadge: React.FC<CountBadgeProps> = ({ count, label = 'Total' }) => (
  <div className="bg-gray-50 dark:bg-dark-card px-4 h-10 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/5">
    <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">{label}: {count}</p>
  </div>
);
