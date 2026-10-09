import { useState } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { SearchBar } from '../../../components/ui/SearchBar';
import { ViewToggle, ViewMode } from '../../../components/ui/ViewToggle';
import { PageHeader } from '../../../components/layout/PageHeader';
import { HeaderButton } from '../../../components/ui/HeaderButton';
import { CountBadge } from '../../../components/ui/CountBadge';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { DataTable } from '../../../components/ui/DataTable';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Modal } from '../../../components/ui/Modal';
import { useNotifications } from '../../../contexts/NotificationContext';

interface Agent {
  id: string; name: string; email: string;
  status: 'available' | 'busy' | 'offline';
  workload: number; conversations: number; avgResponseTime: string;
}

const mockAgents: Agent[] = [
  { id: 'AGT-001', name: 'María González', email: 'maria@empresa.com', status: 'available', workload: 25, conversations: 12, avgResponseTime: '2m 30s' },
  { id: 'AGT-002', name: 'Juan Pérez', email: 'juan@empresa.com', status: 'busy', workload: 85, conversations: 8, avgResponseTime: '3m 15s' },
  { id: 'AGT-003', name: 'Ana López', email: 'ana@empresa.com', status: 'offline', workload: 0, conversations: 15, avgResponseTime: '1m 45s' },
];

const STATUS_DOT: Record<string, string> = { available: 'bg-emerald-500', busy: 'bg-amber-500', offline: 'bg-slate-400' };

export const Agents = () => {
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('');

  const columns = [
    { key: 'name', header: 'Nombre' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Estado', render: (v: string) => <StatusBadge status={v} /> },
    { key: 'workload', header: 'Carga', render: (v: number) => `${v}%` },
    { key: 'conversations', header: 'Conversaciones' },
    { key: 'avgResponseTime', header: 'Tiempo Prom.' },
    { key: 'actions', header: 'Acciones', className: 'text-center', render: () => (
      <div className="flex gap-2">
        <button className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all"><Edit className="w-4 h-4" /></button>
        <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const filtered = mockAgents.filter(a =>
    (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || a.status === filterStatus)
  );

  return (
    <PageContainer>
      <PageHeader
        title="Agentes"
        description="Estado, carga de trabajo y métricas por agente"
        action={
          <div className="flex items-center gap-3">
            <CountBadge count={mockAgents.length} />
            <HeaderButton onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
              Nuevo Agente
            </HeaderButton>
          </div>
        }
      />
      <PageBody>
        <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden p-6">
          <div className="flex items-center gap-3 mb-4">
            <SearchBar value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Buscar agentes..." className="flex-1" />
            <Dropdown
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'available', label: 'Disponible' },
                { value: 'busy', label: 'Ocupado' },
                { value: 'offline', label: 'Desconectado' },
              ]}
            />
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((agent) => (
                <div key={agent.id} className="group bg-slate-50 dark:bg-black/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent-500/10 rounded-xl flex items-center justify-center text-accent-500 font-black text-sm">
                        {agent.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-sm">{agent.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{agent.email}</p>
                      </div>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 ${STATUS_DOT[agent.status]}`} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    {[['Carga', `${agent.workload}%`], ['Convs', String(agent.conversations)], ['Resp.', agent.avgResponseTime]].map(([label, val]) => (
                      <div key={label} className="bg-white dark:bg-black/40 rounded-xl py-2">
                        <p className="text-xs font-black text-slate-900 dark:text-white">{val}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all"><Edit className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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
        title="Nuevo Agente"
        icon={<Users className="w-5 h-5 text-accent-500" />}
      >
        <form onSubmit={(e) => { e.preventDefault(); addNotification({ type: 'success', title: 'Agente creado', message: `Se ha creado el agente ${formName}` }); setShowCreateModal(false); }} className="space-y-4">
          <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nombre del agente" required className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
          <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="Correo electrónico" required className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
          <Dropdown
            value={formRole}
            onChange={v => setFormRole(v)}
            placeholder="Seleccionar rol"
            options={[
              { value: 'agent', label: 'Agente' },
              { value: 'supervisor', label: 'Supervisor' },
              { value: 'admin', label: 'Administrador' },
            ]}
          />
          <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all shadow-md">Crear Agente</button>
        </form>
      </Modal>
    </PageContainer>
  );
};
