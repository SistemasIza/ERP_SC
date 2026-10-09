import { useState } from 'react';
import {
  Plus, Search, Trash2, List, LayoutGrid, Bell, Check,
  CheckCircle, AlertTriangle, Info, XCircle, MailCheck, Eraser
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { HeaderButton } from '../../../components/ui/HeaderButton';
import { CountBadge } from '../../../components/ui/CountBadge';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { DataTable } from '../../../components/ui/DataTable';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Modal } from '../../../components/ui/Modal';
import { useNotifications, Notification } from '../../../contexts/NotificationContext';

const typeMeta: Record<string, { label: string; icon: any; className: string }> = {
  info: { label: 'Información', icon: Info, className: 'bg-blue-500/10 text-blue-500' },
  success: { label: 'Éxito', icon: CheckCircle, className: 'bg-emerald-500/10 text-emerald-500' },
  warning: { label: 'Advertencia', icon: AlertTriangle, className: 'bg-amber-500/10 text-amber-500' },
  error: { label: 'Error', icon: XCircle, className: 'bg-red-500/10 text-red-500' },
};

const formatTime = (date: Date) =>
  new Date(date).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });

export const Notifications = () => {
  const {
    notifications, addNotification, markAsRead, markAllAsRead,
    removeNotification, clearNotifications, unreadCount
  } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRead, setFilterRead] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState('info');

  const filtered = notifications.filter(n => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRead =
      filterRead === 'all' ||
      (filterRead === 'unread' && !n.read) ||
      (filterRead === 'read' && n.read);
    return matchesSearch && matchesRead;
  });

  const columns = [
    {
      key: 'title', header: 'Notificación',
      render: (value: string, row: Notification) => (
        <div className="flex items-center gap-2.5">
          <span className={`p-1.5 rounded-lg ${typeMeta[row.type]?.className || typeMeta.info.className}`}>
            {(() => { const Icon = typeMeta[row.type]?.icon || Info; return <Icon className="w-3.5 h-3.5" />; })()}
          </span>
          <div className="min-w-0">
            <p className={`text-sm truncate ${row.read ? 'text-slate-500 dark:text-slate-400' : 'font-black text-slate-900 dark:text-white'}`}>{value}</p>
            <p className="text-xs text-slate-400 truncate max-w-[280px]">{row.message}</p>
          </div>
        </div>
      )
    },
    { key: 'typeLabel', header: 'Tipo' },
    { key: 'timeLabel', header: 'Fecha' },
    {
      key: 'read', header: 'Estado',
      render: (value: boolean) => (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${value ? 'bg-slate-100 dark:bg-white/5 text-slate-500' : 'bg-accent-500/10 text-accent-500'}`}>
          {value ? 'Leída' : 'Nueva'}
        </span>
      )
    },
    {
      key: 'actions', header: 'Acciones', className: 'text-center',
      render: (_: any, row: Notification) => (
        <div className="flex gap-2 justify-center">
          {!row.read && (
            <button
              onClick={() => markAsRead(row.id)}
              title="Marcar como leída"
              className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => removeNotification(row.id)}
            title="Eliminar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ];

  const rows = filtered.map(n => ({
    ...n,
    typeLabel: typeMeta[n.type]?.label || n.type,
    timeLabel: formatTime(n.timestamp),
  }));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim()) return;
    addNotification({
      type: formType as Notification['type'],
      title: formTitle.trim(),
      message: formMessage.trim(),
    });
    setFormTitle('');
    setFormMessage('');
    setFormType('info');
    setShowCreateModal(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Notificaciones"
        description="Centro de alertas y avisos del sistema"
        icon={Bell}
        action={
          <div className="flex items-center gap-3">
            <CountBadge count={unreadCount} />
            {notifications.some(n => !n.read) && (
              <HeaderButton onClick={markAllAsRead} icon={<MailCheck className="w-4 h-4" />}>
                Marcar todas
              </HeaderButton>
            )}
            {notifications.length > 0 && (
              <HeaderButton onClick={clearNotifications} icon={<Eraser className="w-4 h-4" />}>
                Limpiar
              </HeaderButton>
            )}
            <HeaderButton onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
              Nueva Notificación
            </HeaderButton>
          </div>
        }
      />
      <PageBody>
        <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden p-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-accent-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar notificaciones..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 dark:bg-dark-card border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Dropdown
                value={filterRead}
                onChange={(v) => { setFilterRead(v); setCurrentPage(1); }}
                options={[
                  { value: 'all', label: 'Todos los estados' },
                  { value: 'unread', label: 'No leídas' },
                  { value: 'read', label: 'Leídas' },
                ]}
              />
              <div className="flex items-center dark:bg-dark-card rounded-xl p-1 border border-gray-200 dark:border-white/5">
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 shadow-sm text-accent-600 dark:text-accent-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Vista de Tabla"><List className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 shadow-sm text-accent-600 dark:text-accent-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Vista de Cuadrícula"><LayoutGrid className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No hay notificaciones</p>
                <p className="text-xs text-slate-400 mt-1">Las alertas del sistema aparecerán aquí</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((n) => {
                  const meta = typeMeta[n.type] || typeMeta.info;
                  const Icon = meta.icon;
                  return (
                    <div key={n.id} className="group bg-slate-50 dark:bg-black/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2.5 rounded-xl ${meta.className}`}><Icon className="w-5 h-5" /></div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${n.read ? 'bg-slate-100 dark:bg-white/5 text-slate-500' : 'bg-accent-500/10 text-accent-500'}`}>
                          {n.read ? 'Leída' : 'Nueva'}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm mb-1">{n.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mb-3">{meta.label} · {formatTime(n.timestamp)}</p>
                      <div className="flex items-center justify-end gap-1">
                        {!n.read && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            title="Marcar como leída"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeNotification(n.id)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              emptyMessage="No hay notificaciones para mostrar"
              pagination={{ currentPage, totalPages: Math.ceil(rows.length / 10) || 1, onPageChange: setCurrentPage }}
            />
          )}
        </div>
      </PageBody>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva Notificación"
        icon={<Bell className="w-5 h-5 text-accent-500" />}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Título" required className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
          <input type="text" value={formMessage} onChange={e => setFormMessage(e.target.value)} placeholder="Mensaje" required className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
          <Dropdown
            value={formType}
            onChange={v => setFormType(v)}
            placeholder="Seleccionar tipo"
            options={[
              { value: 'info', label: 'Información' },
              { value: 'success', label: 'Éxito' },
              { value: 'warning', label: 'Advertencia' },
              { value: 'error', label: 'Error' },
            ]}
          />
          <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all shadow-md">Crear Notificación</button>
        </form>
      </Modal>
    </PageContainer>
  );
};
