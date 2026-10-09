import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatCard = ({ title, value, icon: Icon, color = 'accent', trend }: StatCardProps) => {
  const colorMap: Record<string, { blob: string; bg: string; icon: string; trendIcon: string }> = {
    accent: {
      blob: 'bg-accent-500/10',
      bg: 'from-accent-50 to-accent-100 dark:from-accent-900/40 dark:to-accent-900/20',
      icon: 'text-accent-600 dark:text-accent-400',
      trendIcon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    },
    blue: {
      blob: 'bg-blue-500/10',
      bg: 'from-blue-50 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      trendIcon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    },
    emerald: {
      blob: 'bg-emerald-500/10',
      bg: 'from-emerald-50 to-green-100 dark:from-emerald-900/40 dark:to-green-900/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      trendIcon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    },
    violet: {
      blob: 'bg-violet-500/10',
      bg: 'from-violet-50 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/20',
      icon: 'text-violet-600 dark:text-violet-400',
      trendIcon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    },
    amber: {
      blob: 'bg-amber-500/10',
      bg: 'from-amber-50 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/20',
      icon: 'text-amber-600 dark:text-amber-400',
      trendIcon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    },
  };

  const c = colorMap[color] || colorMap.accent;

  return (
    <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-800/50 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute -right-8 -top-8 w-24 h-24 ${c.blob} dark:${c.blob.replace('/10', '/20')} rounded-full blur-2xl group-hover:opacity-80 transition-all duration-300`}></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase mb-2">{title}</p>
          <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white drop-shadow-sm">{value}</h3>
          
          {trend && (
            <div className={`flex items-center gap-1.5 mt-3 text-sm font-medium ${trend.isPositive ? c.trendIcon : 'text-secondary-600 dark:text-secondary-400 bg-secondary-50 dark:bg-secondary-900/20'} px-2.5 py-1 rounded-full w-fit`}>
              <span className="text-xs">{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1 font-normal text-xs">vs mes anterior</span>
            </div>
          )}
        </div>
        <div className={`p-4 bg-gradient-to-br ${c.bg} rounded-2xl shadow-inner border border-white/50 dark:border-white/5`}>
          <Icon className={`w-7 h-7 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
};
