import { useState, useEffect } from 'react';
import { Kanban, Plus, DollarSign, Edit, Trash2, Building2, Goal } from 'lucide-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { getCrmPipeline, createCrmDeal, updateCrmDeal, deleteCrmDeal, getCrmClients } from '../../../services/api';
import { PageHeader } from '../../../components/layout/PageHeader';
import { HeaderButton } from '../../../components/ui/HeaderButton';
import { CountBadge } from '../../../components/ui/CountBadge';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { Modal } from '../../../components/ui/Modal';
import { Dropdown } from '../../../components/ui/Dropdown';
import { useNotifications } from '../../../contexts/NotificationContext';

export const Pipeline = () => {
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    value: 0,
    stage: 'prospecting',
    probability: 10,
    expected_close_date: '',
    notes: ''
  });
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pipelineData, clientsData] = await Promise.all([
        getCrmPipeline(),
        getCrmClients()
      ]);
      setPipeline(pipelineData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDeal) {
        await updateCrmDeal(editingDeal.id, formData);
        addNotification({ type: 'success', title: 'Deal actualizado', message: `"${formData.name}" fue actualizado correctamente.` });
      } else {
        await createCrmDeal(formData);
        addNotification({ type: 'success', title: 'Deal creado', message: `"${formData.name}" fue agregado al pipeline.` });
      }
      setShowModal(false);
      setEditingDeal(null);
      setFormData({ client_id: '', name: '', value: 0, stage: 'prospecting', probability: 10, expected_close_date: '', notes: '' });
      fetchData();
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo guardar el deal.' });
      console.error('Error saving deal:', error);
    }
  };

  const handleEdit = (deal: any) => {
    setEditingDeal(deal);
    setFormData({
      client_id: deal.client_id,
      name: deal.name,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      expected_close_date: deal.expected_close_date || '',
      notes: deal.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Â¿EstÃ¡s seguro de eliminar este deal?')) {
      try {
        await deleteCrmDeal(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting deal:', error);
      }
    }
  };

  const handleMoveDeal = async (dealId: string, newStage: string) => {
    try {
      await updateCrmDeal(dealId, { stage: newStage });
      fetchData();
    } catch (error) {
      console.error('Error moving deal:', error);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageBody scrollable={true}>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Cargando pipeline...</div>
          </div>
        </PageBody>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Pipeline"
        highlight="Kanban de Ventas"
        description="Gestiona tus deals y pipeline de ventas en tiempo real."
        icon={Kanban}
        action={
          <div className="flex items-center gap-3">
            <CountBadge count={pipeline.reduce((a: any, s: any) => a + (s.deals?.length || 0), 0)} />
            <HeaderButton onClick={() => setShowModal(true)} icon={<Plus className="w-4 h-4" />}>
              Nuevo Deal
            </HeaderButton>
          </div>
        }
      />

      <PageBody scrollable={true}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipeline.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-80 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="font-bold text-gray-900 dark:text-white">{stage.name}</h3>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                  {stage.deals.length}
                </span>
              </div>

              <div className="space-y-3">
                {stage.deals.map((deal: any) => (
                  <div
                    key={deal.id}
                    className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                    draggable
                    onDragEnd={() => {
                      // Handle drag and drop
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">{deal.name}</h4>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(deal)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Edit className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(deal.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {deal.crm_clients && (
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {deal.crm_clients.company || deal.crm_clients.name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-accent-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          ${deal.value?.toLocaleString() || 0}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{deal.probability}%</span>
                    </div>

                    {deal.expected_close_date && (
                      <div className="text-xs text-gray-500">
                        Cierre: {new Date(deal.expected_close_date).toLocaleDateString('es-ES')}
                      </div>
                    )}

                    {/* Stage selector */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Dropdown
                        value={deal.stage}
                        onChange={(v) => handleMoveDeal(deal.id, v)}
                        options={[
                          { value: 'prospecting', label: 'Prospectación' },
                          { value: 'qualification', label: 'Calificación' },
                          { value: 'proposal', label: 'Propuesta' },
                          { value: 'negotiation', label: 'Negociación' },
                          { value: 'closed_won', label: 'Ganado' },
                          { value: 'closed_lost', label: 'Perdido' },
                        ]}
                      />
                    </div>
                  </div>
                ))}

                {stage.deals.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No hay deals en esta etapa
                  </div>
                )}
              </div>

              {/* Stage total */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total etapa:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ${stage.deals.reduce((sum: number, deal: any) => sum + (deal.value || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        <Modal
          open={showModal}
          onClose={() => { setShowModal(false); setEditingDeal(null); setFormData({ client_id: '', name: '', value: 0, stage: 'prospecting', probability: 10, expected_close_date: '', notes: '' }); }}
          title={editingDeal ? 'Editar Deal' : 'Nuevo Deal'}
          icon={<div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg"><Goal className="w-5 h-5 text-black" /></div>}
          footer={
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowModal(false); setEditingDeal(null); setFormData({ client_id: '', name: '', value: 0, stage: 'prospecting', probability: 10, expected_close_date: '', notes: '' }); }}
                className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                Cancelar
              </button>
              <button type="submit" form="deal-form"
                className="flex-1 h-11 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-black rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md">
                {editingDeal ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          }
        >
          <form id="deal-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cliente <span className="text-red-400">*</span></label>
              <Dropdown
                value={formData.client_id}
                onChange={(v) => setFormData({ ...formData, client_id: v })}
                placeholder="Seleccionar cliente"
                options={clients.map(client => ({ value: client.id, label: `${client.name}${client.company ? ` (${client.company})` : ''}` }))}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre del Deal <span className="text-red-400">*</span></label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-10 px-3.5 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Valor ($)</label>
              <input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                className="w-full h-10 px-3.5 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Etapa</label>
              <Dropdown
                value={formData.stage}
                onChange={(v) => setFormData({ ...formData, stage: v })}
                options={[
                  { value: 'prospecting', label: 'Prospectación' },
                  { value: 'qualification', label: 'Calificación' },
                  { value: 'proposal', label: 'Propuesta' },
                  { value: 'negotiation', label: 'Negociación' },
                  { value: 'closed_won', label: 'Ganado' },
                  { value: 'closed_lost', label: 'Perdido' }
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Probabilidad (%)</label>
                <input type="number" min="0" max="100" value={formData.probability} onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                  className="w-full h-10 px-3.5 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha cierre</label>
                <DatePicker
                  value={formData.expected_close_date ? dayjs(formData.expected_close_date) : null}
                  onChange={(v) => setFormData({ ...formData, expected_close_date: v?.format('YYYY-MM-DD') || '' })}
                  slotProps={{ textField: { size: 'small', sx: { '& .MuiInputBase-root': { height: '40px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #e2e8f0', fontSize: '14px' } } } }}
                  sx={{ width: '100%' }}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notas</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all resize-none" />
            </div>
          </form>
        </Modal>
      </PageBody>
    </PageContainer>
  );
};

