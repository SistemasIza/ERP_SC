import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { cn } from '../../../utils/cn';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number; // e.g., 18 for +18%
    label: string; // e.g., 'vs ayer'
    direction: 'up' | 'down' | 'neutral';
  };
  sparkline?: number[]; // simplified data for a mini chart
  delay?: number; // for staggered animations
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, trend, sparkline, delay = 0 }) => {
  const isPositive = trend?.direction === 'up';
  const isNegative = trend?.direction === 'down';
  const isNeutral = trend?.direction === 'neutral';

  return (
    <DashboardCard
      title={title}
      icon={icon}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="h-full"
    >
      <div className="flex items-end justify-between">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {value}
          </h2>
          
          {trend && (
            <div className="flex items-center gap-2">
              <span className={cn(
                "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
                isPositive && "text-emerald-600 bg-emerald-500/10",
                isNegative && "text-red-600 bg-red-500/10",
                isNeutral && "text-slate-500 bg-slate-500/10"
              )}>
                {isPositive && <TrendingUp className="w-3 h-3" />}
                {isNegative && <TrendingDown className="w-3 h-3" />}
                {isNeutral && <Minus className="w-3 h-3" />}
                {trend.value > 0 && '+'}{trend.value}%
              </span>
              <span className="text-xs font-medium text-slate-400">
                {trend.label}
              </span>
            </div>
          )}
        </div>

        {/* Minimal Sparkline representation using pure CSS blocks as requested (▁▂▃▄▅▆▇█) */}
        {sparkline && sparkline.length > 0 && (
          <div className="flex items-end gap-1 h-8 opacity-40 group-hover:opacity-100 transition-opacity">
            {sparkline.map((val, i) => {
              const max = Math.max(...sparkline);
              const height = max === 0 ? 0 : (val / max) * 100;
              return (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 rounded-t-sm transition-all duration-500",
                    isPositive ? "bg-emerald-500" : isNegative ? "bg-red-500" : "bg-accent-500"
                  )}
                  style={{ height: `${Math.max(10, height)}%` }}
                />
              );
            })}
          </div>
        )}
      </div>
    </DashboardCard>
  );
};
