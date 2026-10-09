import { DollarSign, TrendingUp, TrendingDown, Users, Building2, Activity } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { Card } from '../../../components/ui/Card';

export const BusinessMetrics = () => {
  const metrics = [
    { label: 'MRR', value: '$12,450', change: '+12.5%', positive: true, icon: DollarSign },
    { label: 'Churn Rate', value: '2.3%', change: '-0.5%', positive: true, icon: TrendingDown },
    { label: 'Cuentas Activas', value: '156', change: '+8', positive: true, icon: Users },
    { label: 'Cuentas Inactivas', value: '12', change: '-2', positive: true, icon: Building2 },
    { label: 'Nuevas Suscripciones', value: '24', change: '+4', positive: true, icon: TrendingUp },
    { label: 'Tasa de Conversión', value: '3.8%', change: '+0.3%', positive: true, icon: Activity },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Métricas del Negocio"
        description="MRR, churn, cuentas activas/inactivas"
      />
      <PageBody>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{metric.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {metric.positive ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${metric.positive ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">vs mes anterior</span>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Ingresos por Plan</h3>
            <div className="space-y-4">
              {[
                { plan: 'Enterprise', revenue: '$7,960', percentage: 64 },
                { plan: 'Professional', revenue: '$3,160', percentage: 25 },
                { plan: 'Starter', revenue: '$1,330', percentage: 11 },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{item.plan}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{item.revenue}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Empresas por Ingresos</h3>
            <div className="space-y-4">
              {[
                { name: 'Empresa XYZ', mrr: '$199', plan: 'Enterprise' },
                { name: 'Empresa ABC', mrr: '$79', plan: 'Professional' },
                { name: 'Empresa 456', mrr: '$79', plan: 'Professional' },
                { name: 'Empresa 789', mrr: '$29', plan: 'Starter' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.plan}</p>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">{item.mrr}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageBody>
    </PageContainer>
  );
};
