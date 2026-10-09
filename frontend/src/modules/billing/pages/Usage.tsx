import { BarChart3, TrendingUp, MessageSquare, Globe } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { Card } from '../../../components/ui/Card';

export const Usage = () => {
  const stats = [
    { label: 'Mensajes Enviados', value: '12,450', limit: '15,000', percentage: 83, icon: MessageSquare },
    { label: 'Canales Activos', value: '3', limit: '5', percentage: 60, icon: Globe },
    { label: 'API Calls', value: '8,200', limit: '10,000', percentage: 82, icon: BarChart3 },
    { label: 'Storage', value: '2.4 GB', limit: '5 GB', percentage: 48, icon: TrendingUp },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Uso y Consumo"
        description="Contador de mensajes, canales activos y límites del plan"
      />
      <PageBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">de {stat.limit}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{stat.percentage}% utilizado</p>
              </Card>
            );
          })}
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Historial de Uso</h3>
          <div className="space-y-4">
            {[
              { period: 'Enero 2024', messages: 12450, channels: 3, api: 8200 },
              { period: 'Diciembre 2023', messages: 11320, channels: 3, api: 7500 },
              { period: 'Noviembre 2023', messages: 10890, channels: 2, api: 6800 },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{item.period}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.messages} mensajes • {item.channels} canales • {item.api} API calls
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PageBody>
    </PageContainer>
  );
};
