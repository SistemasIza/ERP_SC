import { PageHeader } from '../../../components/layout/PageHeader';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { UserCheck, Bot, ArrowRight, Headphones } from 'lucide-react';

export const Support = () => {
  const modules = [
    {
      title: 'Agentes',
      description: 'Estado, carga de trabajo y métricas por agente',
      icon: UserCheck,
      path: '/agents',
      color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Base de Conocimiento',
      description: 'Contenido para respuestas automáticas del bot',
      icon: Bot,
      path: '/knowledge-base',
      color: 'bg-accent-500/10 text-accent-600 dark:text-accent-400',
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Atención"
        description="Gestión de agentes y base de conocimiento"
        icon={Headphones}
      />
      <PageBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="p-6">
                  <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {module.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {module.description}
                  </p>
                  <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Acceder
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </PageBody>
    </PageContainer>
  );
};
