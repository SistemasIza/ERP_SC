import { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { FlowBuilderContent } from '../components/FlowBuilderContent';
import { getFlows } from '../../../services/api';
import { AlertCircle } from 'lucide-react';
import { PageLoader } from '../../../components/layout/PageLoader';

export const FlowBuilder = () => {
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFirstFlow = async () => {
      try {
        setLoading(true);
        const flows = await getFlows();
        if (flows && flows.length > 0) {
          const mainFlow = flows.find((f: any) => f.isDefault) || flows[0];
          setFlow(mainFlow);
        } else {
          setError('No flows found');
        }
      } catch (err) {
        console.error('Error loading flows:', err);
        setError('Error al cargar los flujos');
      } finally {
        setLoading(false);
      }
    };
    loadFirstFlow();
  }, []);

  if (loading) {
    return <PageLoader sectionName="Constructor de Flujo" />;
  }

  if (error || !flow) {
    return (
      <div className="h-full flex items-center justify-center dark:bg-[#252525]">
        <div className="text-center space-y-4 p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-xl max-w-md">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-2">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {error === 'No flows found' ? 'Sin Flujos' : 'Error de Conexión'}
          </h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
            {error === 'No flows found'
              ? 'No hay flujos creados aún. Ve al Gestor de Flujos para crear tu primera automatización.'
              : 'Hubo un problema al conectar con el servidor. Revisa tu conexión.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-[1.02]"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="relative w-full h-full overflow-hidden">
        <FlowBuilderContent flowData={flow} />
      </div>
    </ReactFlowProvider>
  );
};

