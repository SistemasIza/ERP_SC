import { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, Tag } from 'lucide-react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { DataTable } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Modal } from '../../../components/ui/Modal';
import { KebabMenu } from '../../../components/ui/KebabMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Loader } from '../../../components/ui/Loader';
import { useNotifications } from '../../../contexts/NotificationContext';
import { HeaderButton } from '../../../components/ui/HeaderButton';
import { CountBadge } from '../../../components/ui/CountBadge';
import { getPromotions, createPromotion, deletePromotion } from '../../../services/api';
import { SearchBar } from '../../../components/ui/SearchBar';
import { ViewToggle, ViewMode } from '../../../components/ui/ViewToggle';

interface Promotion {
  id: string; code: string; discount: number; type: 'percentage' | 'fixed';
  minPurchase: number; usageLimit: number; used: number;
  status: 'active' | 'inactive'; expiresAt: string;
}

const mockPromotions: Promotion[] = [
  { id: 'PROM-001', code: 'VERANO20', discount: 20, type: 'percentage', minPurchase: 100, usageLimit: 100, used: 45, status: 'active', expiresAt: '2024-03-31' },
  { id: 'PROM-002', code: 'FIESTA10', discount: 10, type: 'fixed', minPurchase: 50, usageLimit: 50, used: 50, status: 'inactive', expiresAt: '2024-02-28' },
  { id: 'PROM-003', code: 'NUEVO15', discount: 15, type: 'percentage', minPurchase: 75, usageLimit: 200, used: 12, status: 'active', expiresAt: '2024-04-30' },
];

const mapPromotion = (row: any): Promotion => ({
  id: row.id,
  code: row.code,
  discount: Number(row.discount || 0),
  type: row.type,
  minPurchase: Number(row.min_purchase || 0),
  usageLimit: Number(row.usage_limit || 0),
  used: Number(row.used || 0),
  status: row.status,
  expiresAt: row.expires_at || '',
});

export const Promotions = () => {
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newExpiresAt, setNewExpiresAt] = useState<dayjs.Dayjs | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>(mockPromotions);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getPromotions();
        if (!cancelled) setPromotions((Array.isArray(rows) ? rows : []).map(mapPromotion));
      } catch (err) {
        console.error('Failed to load promotions:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const promo = deleteTarget;
    setDeleteTarget(null);
    setPromotions(prev => prev.filter(p => p.id !== promo.id));
    try {
      await deletePromotion(promo.id);
      addNotification({ type: 'success', title: 'Promoción eliminada', message: `Se ha eliminado la promoción ${promo.code}` });
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo eliminar la promoción.' });
    }
  };

  const handleDuplicate = async (promo: Promotion) => {
    try {
      const created = await createPromotion({
        code: `${promo.code}-Copia`,
        discount: promo.discount,
        type: promo.type,
        minPurchase: promo.minPurchase,
        usageLimit: promo.usageLimit,
        used: 0,
        status: 'active',
        expiresAt: promo.expiresAt || null,
      });
      setPromotions(prev => [mapPromotion(created), ...prev]);
      addNotification({ type: 'success', title: 'Promoción duplicada', message: `Se ha duplicado ${promo.code}` });
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo duplicar la promoción.' });
    }
  };

  const handleCreate = async (code: string, discount: string, expiresAt: string) => {
    try {
      const created = await createPromotion({
        code,
        discount: Number(discount) || 0,
        type: 'percentage',
        minPurchase: 0,
        usageLimit: 0,
        used: 0,
        status: 'active',
        expiresAt: expiresAt || null,
      });
      setPromotions(prev => [mapPromotion(created), ...prev]);
      addNotification({ type: 'success', title: 'Promoción creada', message: `Se ha creado la promoción ${code}` });
      setShowCreateModal(false);
      setNewExpiresAt(null);
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo crear la promoción.' });
    }
  };

  const columns = [
    { key: 'code', header: 'Código' },
    { key: 'discount', header: 'Descuento', render: (v: number, row: Promotion) => `${v}${row.type === 'percentage' ? '%' : '$'}` },
    { key: 'minPurchase', header: 'Compra Mín.', render: (v: number) => `$${v}` },
    { key: 'usage', header: 'Uso', render: (_v: unknown, row: Promotion) => `${row.used}/${row.usageLimit}` },
    { key: 'status', header: 'Estado', render: (v: string) => <StatusBadge status={v} /> },
    { key: 'expiresAt', header: 'Expira' },
    { key: 'actions', header: '', className: 'w-12', render: (_v: unknown, row: Promotion) => (
      <KebabMenu actions={[
        { label: 'Duplicar', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => handleDuplicate(row) },
        { label: 'Eliminar', icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => { setDeleteTarget(row); }, variant: 'danger' },
      ]} />
    )},
  ];

  const filtered = promotions.filter(p =>
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === 'all' || p.status === filterStatus)
  );

  return (
    <PageContainer>
      <PageHeader
        title="Promociones"
        description="Gestiona cupones y descuentos vinculados al catálogo"
        action={
          <div className="flex items-center gap-3">
            <CountBadge count={promotions.length} />
            <HeaderButton onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
              Nueva Promoción
            </HeaderButton>
          </div>
        }
      />
      <PageBody>
        {loading && (
          <div className="mb-4 text-xs text-slate-400 flex items-center gap-2"><Loader size="xs" /> Cargando promociones...</div>
        )}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden p-6">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <SearchBar value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Buscar por código..." />
            <div className="flex items-center gap-2 shrink-0">
              <Dropdown
                value={filterStatus}
                onChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}
                options={[
                  { value: 'all', label: 'Todos los Estados' },
                  { value: 'active', label: 'Activo' },
                  { value: 'inactive', label: 'Inactivo' },
                ]}
              />
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((promo) => (
                <div key={promo.id} className="group bg-slate-50 dark:bg-black/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-accent-500/10 rounded-xl text-accent-500"><Tag className="w-5 h-5" /></div>
                    <StatusBadge status={promo.status} />
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-lg mb-1 tracking-widest font-mono">{promo.code}</h3>
                  <p className="text-2xl font-black text-accent-500 mb-3">
                    {promo.discount}{promo.type === 'percentage' ? '%' : '$'} <span className="text-xs font-normal text-slate-400">descuento</span>
                  </p>
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Compra mín.</span>
                      <span className="font-bold text-slate-900 dark:text-white">${promo.minPurchase}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Usos</span>
                      <span className="font-bold text-slate-900 dark:text-white">{promo.used}/{promo.usageLimit}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Expira</span>
                      <span className="font-bold text-slate-900 dark:text-white">{promo.expiresAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleDuplicate(promo)} className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all"><Copy className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteTarget(promo)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DataTable data={filtered} columns={columns}
              pagination={{ currentPage, totalPages: Math.ceil(filtered.length / 10) || 1, onPageChange: setCurrentPage }}
            />
          )}
        </div>
      </PageBody>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva Promoción"
        icon={<Tag className="w-5 h-5 text-accent-500" />}
      >
        <form onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const name = (form.elements.namedItem('name') as HTMLInputElement).value; const discount = (form.elements.namedItem('discount') as HTMLInputElement).value; const expiresAt = newExpiresAt?.format('YYYY-MM-DD') || ''; handleCreate(name, discount, expiresAt); }} className="space-y-4">
          <input type="text" name="name" placeholder="Nombre de la promoción" required className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
          <input type="number" name="discount" placeholder="Porcentaje de descuento" required className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
          <DatePicker
            value={newExpiresAt}
            onChange={(v) => setNewExpiresAt(v)}
            slotProps={{ textField: { size: 'small', required: true } }}
            sx={{
              width: '100%',
              '& .MuiInputBase-root': { borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid #e2e8f0' }
            }}
          />
          <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all shadow-md">Crear Promoción</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar promoción"
        message={`¿Eliminar "${deleteTarget?.code || ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </PageContainer>
  );
};
