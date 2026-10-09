import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { SearchBar } from '../../../components/ui/SearchBar';
import { ViewToggle, ViewMode } from '../../../components/ui/ViewToggle';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Modal } from '../../../components/ui/Modal';
import { KebabMenu } from '../../../components/ui/KebabMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useNotifications } from '../../../contexts/NotificationContext';
import { getBusinessHours, createBusinessHour, deleteBusinessHour } from '../../../services/api';
import { Loader } from '../../../components/ui/Loader';
import { HeaderButton } from '../../../components/ui/HeaderButton';
import { CountBadge } from '../../../components/ui/CountBadge';

interface BusinessHour {
  id: string; day: string; openTime: string; closeTime: string; autoResponse: string;
}

const mockHours: BusinessHour[] = [
  { id: 'BH-001', day: 'Lunes', openTime: '09:00', closeTime: '18:00', autoResponse: 'Gracias por contactarnos. Te responderemos en horario laboral.' },
  { id: 'BH-002', day: 'Martes', openTime: '09:00', closeTime: '18:00', autoResponse: 'Gracias por contactarnos. Te responderemos en horario laboral.' },
  { id: 'BH-003', day: 'Miércoles', openTime: '09:00', closeTime: '18:00', autoResponse: 'Gracias por contactarnos. Te responderemos en horario laboral.' },
  { id: 'BH-004', day: 'Jueves', openTime: '09:00', closeTime: '18:00', autoResponse: 'Gracias por contactarnos. Te responderemos en horario laboral.' },
  { id: 'BH-005', day: 'Viernes', openTime: '09:00', closeTime: '17:00', autoResponse: 'Gracias por contactarnos. Te responderemos en horario laboral.' },
  { id: 'BH-006', day: 'Sábado', openTime: '10:00', closeTime: '14:00', autoResponse: 'Gracias por contactarnos. Te responderemos el lunes.' },
  { id: 'BH-007', day: 'Domingo', openTime: '-', closeTime: '-', autoResponse: 'Cerrado. Te responderemos el lunes.' },
];

const mapHour = (row: any): BusinessHour => ({
  id: row.id,
  day: row.day,
  openTime: row.open_time,
  closeTime: row.close_time,
  autoResponse: row.auto_response || '',
});

export const BusinessHours = () => {
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAvail, setFilterAvail] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hours, setHours] = useState<BusinessHour[]>(mockHours);
  const [loading, setLoading] = useState(true);
  const [formDay, setFormDay] = useState('');
  const [formOpenTime, setFormOpenTime] = useState('');
  const [formCloseTime, setFormCloseTime] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BusinessHour | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getBusinessHours();
        if (!cancelled) setHours((Array.isArray(rows) ? rows : []).map(mapHour));
      } catch (err) {
        console.error('Failed to load business hours:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!formDay || !formOpenTime || !formCloseTime) return;
    try {
      const created = await createBusinessHour({ day: formDay, openTime: formOpenTime, closeTime: formCloseTime });
      setHours(prev => {
        const next = prev.filter(h => h.day !== formDay);
        return [...next, mapHour(created)];
      });
      addNotification({ type: 'success', title: 'Horario creado', message: `Se ha creado el horario para ${formDay}` });
      setShowCreateModal(false);
      setFormDay(''); setFormOpenTime(''); setFormCloseTime('');
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo crear el horario.' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const deleted = deleteTarget;
    setDeleteTarget(null);
    setHours(prev => prev.filter(h => h.id !== deleted.id));
    try {
      await deleteBusinessHour(deleted.id);
      addNotification({ type: 'success', title: 'Horario eliminado', message: `Horario de ${deleted.day} eliminado.` });
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo eliminar el horario.' });
    }
  };

  const filtered = hours.filter(h =>
    h.day.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterAvail === 'all' || (filterAvail === 'open' ? h.openTime !== '-' : h.openTime === '-'))
  );

  return (
    <PageContainer>
      <PageHeader
        title="Horarios de Atención"
        description="Configuración de horario laboral y respuestas automáticas"
        action={
          <div className="flex items-center gap-3">
            <CountBadge count={hours.length} />
            <HeaderButton onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
              Nuevo Horario
            </HeaderButton>
          </div>
        }
      />
      <PageBody>
        {loading && (
          <div className="mb-4 text-xs text-slate-400 flex items-center gap-2"><Loader size="xs" /> Cargando horarios...</div>
        )}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden p-6">
          <div className="flex items-center gap-3 mb-6">
            <SearchBar value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por día..." className="flex-1" />
            <Dropdown
              value={filterAvail}
              onChange={(v) => setFilterAvail(v)}
              options={[
                { value: 'all', label: 'Todos los días' },
                { value: 'open', label: 'Con horario' },
                { value: 'closed', label: 'Cerrado' },
              ]}
            />
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
              {filtered.map((hour) => (
                <div key={hour.id} className={`rounded-2xl p-4 border text-center transition-all ${hour.openTime === '-' ? 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10' : 'border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-black/30 hover:shadow-md'}`}>
                  <div className={`p-2 rounded-xl mx-auto w-fit mb-2 ${hour.openTime === '-' ? 'bg-red-100 dark:bg-red-900/20 text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500'}`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-xs mb-2">{hour.day}</h3>
                  {hour.openTime === '-' ? (
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">Cerrado</span>
                  ) : (
                    <>
                      <p className="text-[10px] font-black text-slate-500">{hour.openTime}</p>
                      <p className="text-[10px] text-slate-400">—</p>
                      <p className="text-[10px] font-black text-slate-500">{hour.closeTime}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((hour) => (
                <div key={hour.id} className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800/50 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${hour.openTime === '-' ? 'bg-red-100 dark:bg-red-900/20 text-red-400' : 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-500'}`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm">{hour.day}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {hour.openTime === '-' ? 'Cerrado' : `${hour.openTime} - ${hour.closeTime}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-slate-400 max-w-xs truncate hidden md:block">{hour.autoResponse}</p>
                    <KebabMenu actions={[
                      { label: 'Eliminar', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => setDeleteTarget(hour), variant: 'danger' },
                    ]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageBody>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo Horario"
        icon={<Clock className="w-5 h-5 text-accent-500" />}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
          <Dropdown
            value={formDay}
            onChange={v => setFormDay(v)}
            placeholder="Seleccionar día"
            options={[
              { value: 'Lunes', label: 'Lunes' },
              { value: 'Martes', label: 'Martes' },
              { value: 'Miércoles', label: 'Miércoles' },
              { value: 'Jueves', label: 'Jueves' },
              { value: 'Viernes', label: 'Viernes' },
              { value: 'Sábado', label: 'Sábado' },
              { value: 'Domingo', label: 'Domingo' },
            ]}
          />
          <div className="flex gap-3">
            <input type="time" value={formOpenTime} onChange={e => setFormOpenTime(e.target.value)} required className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white" />
            <input type="time" value={formCloseTime} onChange={e => setFormCloseTime(e.target.value)} required className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white" />
          </div>
          <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all shadow-md">Crear Horario</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar horario"
        message={`¿Eliminar el horario de ${deleteTarget?.day || ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </PageContainer>
  );
};
