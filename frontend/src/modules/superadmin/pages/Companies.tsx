import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, CreditCard, AlertTriangle,
  CheckCircle, Clock, Bell, Eye, Crown, TrendingUp, Send, LogIn
} from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ResponsiveList, ResponsiveColumn } from '../../../components/ui/ResponsiveList';
import { SearchBar } from '../../../components/ui/SearchBar';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { useNotifications } from '../../../contexts/NotificationContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getOrganizations, updateOrganizationPayment, updateOrganizationNotification } from '../../../services/api';

interface Company {
  id: string;
  name: string;
  plan: string;
  payment_status: string;
  userCount: number;
  created_at: string;
  admin_notification?: string | null;
  show_overdue_popup?: boolean;
}

export const Companies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [planFilter, setPlanFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const { addNotification } = useNotifications();
  const { switchOrganization } = useAuth();
  const navigate = useNavigate();

  const handleEnterCompany = (org: Company) => {
    switchOrganization(org.id);
    navigate('/');
    addNotification({ type: 'success', title: 'Accediendo', message: `Entrando a ${org.name} como Super Admin` });
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await getOrganizations();
      setCompanies(Array.isArray(data) ? data : []);
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudieron cargar las empresas' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const stats = {
    total: companies.length,
    active: companies.filter(c => c.payment_status === 'paid' || !c.payment_status).length,
    overdue: companies.filter(c => c.payment_status === 'overdue').length,
    pending: companies.filter(c => c.payment_status === 'pending').length,
    mrr: companies.reduce((sum, c) => {
      const planMrr: Record<string, number> = { free: 0, starter: 29, basic: 29, pro: 99, professional: 99, enterprise: 299 };
      return sum + (planMrr[c.plan?.toLowerCase()] || 0);
    }, 0),
  };

  const filtered = companies.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'all' || c.plan?.toLowerCase() === planFilter;
    const matchesPayment = paymentFilter === 'all' || c.payment_status === paymentFilter;
    return matchesSearch && matchesPlan && matchesPayment;
  });

  const handlePaymentStatus = async (company: Company, status: string) => {
    try {
      await updateOrganizationPayment(company.id, status);
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, payment_status: status } : c));
      addNotification({ type: 'success', title: 'Actualizado', message: `Estado de pago de ${company.name} cambiado a ${status}` });
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo actualizar el estado de pago' });
    }
  };

  const handleSendNotification = async () => {
    if (!selectedCompany || !notificationMsg.trim()) return;
    try {
      await updateOrganizationNotification(selectedCompany.id, notificationMsg, showPopup);
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, admin_notification: notificationMsg, show_overdue_popup: showPopup } : c));
      addNotification({ type: 'success', title: 'Notificación enviada', message: `Mensaje enviado a ${selectedCompany.name}` });
      setShowNotifyModal(false);
      setNotificationMsg('');
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo enviar la notificación' });
    }
  };

  const planLabel = (plan: string) => {
    const labels: Record<string, string> = { free: 'Free', starter: 'Starter', basic: 'Básico', pro: 'Pro', professional: 'Professional', enterprise: 'Enterprise' };
    return labels[plan?.toLowerCase()] || plan || 'Free';
  };

  const planVariant = (plan: string) => {
    const p = plan?.toLowerCase();
    if (p === 'enterprise') return 'info' as const;
    if (p === 'pro' || p === 'professional') return 'success' as const;
    if (p === 'starter' || p === 'basic') return 'warning' as const;
    return 'default' as const;
  };

  const paymentStatusColor = (status: string) => {
    if (status === 'paid') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    if (status === 'pending') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    if (status === 'overdue') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    return 'bg-slate-100 text-slate-500 dark:bg-slate-800';
  };

  const responsiveColumns: ResponsiveColumn<Company>[] = [
    {
      key: 'name',
      header: 'Empresa',
      mobilePriority: 'high',
      render: (_: any, org: Company) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent-500/10 flex items-center justify-center font-black text-accent-600 dark:text-accent-400 text-sm">
            {org.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm">{org.name}</div>
            <div className="text-[10px] text-slate-400 font-medium">{org.id?.slice(0, 8)}</div>
          </div>
        </div>
      )
    },
    {
      key: 'plan',
      header: 'Plan',
      mobilePriority: 'high',
      render: (_: any, org: Company) => (
        <Badge variant={planVariant(org.plan)} size="xs" shape="rounded" icon={<Crown className="w-2.5 h-2.5" />}>
          {planLabel(org.plan)}
        </Badge>
      )
    },
    {
      key: 'payment_status',
      header: 'Pago',
      mobilePriority: 'medium',
      render: (_: any, org: Company) => {
        const status = org.payment_status || 'unknown';
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${paymentStatusColor(status)}`}>
            {status === 'paid' && <CheckCircle className="w-2.5 h-2.5" />}
            {status === 'pending' && <Clock className="w-2.5 h-2.5" />}
            {status === 'overdue' && <AlertTriangle className="w-2.5 h-2.5" />}
            {status === 'paid' ? 'Pagado' : status === 'pending' ? 'Pendiente' : status === 'overdue' ? 'Vencido' : 'Sin estado'}
          </span>
        );
      }
    },
    {
      key: 'userCount',
      header: 'Usuarios',
      mobilePriority: 'medium',
      render: (v: number) => (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold text-sm">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          {v || 0}
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Creado',
      mobilePriority: 'low',
      render: (v: string) => (
        <span className="text-xs text-slate-500 font-medium">{v ? new Date(v).toLocaleDateString() : '-'}</span>
      )
    }
  ];

  const filterBtns = [
    { key: 'all', label: 'Todos' },
    { key: 'free', label: 'Free' },
    { key: 'starter', label: 'Starter' },
    { key: 'basic', label: 'Básico' },
    { key: 'pro', label: 'Pro' },
    { key: 'professional', label: 'Professional' },
    { key: 'enterprise', label: 'Enterprise' },
  ];

  const paymentFilterBtns = [
    { key: 'all', label: 'Todos' },
    { key: 'paid', label: 'Pagado' },
    { key: 'pending', label: 'Pendiente' },
    { key: 'overdue', label: 'Vencido' },
  ];

  const getPlanPrice = (plan?: string) => {
    const prices: Record<string, number> = { free: 0, starter: 29, basic: 29, pro: 99, professional: 99, enterprise: 299 };
    return prices[plan?.toLowerCase() || 'free'] || 0;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Gestión de Empresas"
        description="Panel de administración de empresas, planes y pagos"
      />
      <PageBody>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Empresas</p>
              <Building2 className="w-4 h-4 text-accent-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activas</p>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-500">{stats.active}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencidas</p>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-red-500">{stats.overdue}</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MRR Total</p>
              <TrendingUp className="w-4 h-4 text-accent-500" />
            </div>
            <p className="text-2xl font-black text-accent-500">${stats.mrr}</p>
          </div>
        </div>

        <Card>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <SearchBar
              placeholder="Buscar empresas..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Plan:</span>
              {filterBtns.map(btn => (
                <button key={btn.key} onClick={() => setPlanFilter(btn.key)} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  planFilter === btn.key ? 'bg-slate-900 dark:bg-white text-white dark:text-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>{btn.label}</button>
              ))}
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mx-1">Pago:</span>
              {paymentFilterBtns.map(btn => (
                <button key={btn.key} onClick={() => setPaymentFilter(btn.key)} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  paymentFilter === btn.key ? 'bg-slate-900 dark:bg-white text-white dark:text-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}>{btn.label}</button>
              ))}
            </div>
          </div>

          <ResponsiveList
            data={filtered}
            columns={responsiveColumns}
            loading={loading}
            onRowClick={(org) => setSelectedCompany(org)}
            getId={(org) => org.id}
            actions={(org) => [
              { icon: <LogIn className="w-4 h-4" />, label: 'Entrar como empresa', onClick: () => handleEnterCompany(org), tooltip: 'Entrar como empresa' },
              { icon: <Eye className="w-4 h-4" />, label: 'Ver detalle', onClick: () => setSelectedCompany(org), tooltip: 'Ver detalle' },
              { icon: <Bell className="w-4 h-4" />, label: 'Enviar notificación', onClick: () => { setSelectedCompany(org); setNotificationMsg(org.admin_notification || ''); setShowPopup(org.show_overdue_popup || false); setShowNotifyModal(true); }, tooltip: 'Enviar notificación' },
            ]}
            pagination={{ currentPage, totalPages: Math.ceil(filtered.length / 10), onPageChange: setCurrentPage }}
          />
        </Card>
      </PageBody>

      {/* Company Detail Modal */}
      <Modal open={!!selectedCompany && !showNotifyModal} onClose={() => setSelectedCompany(null)} title={selectedCompany?.name || ''} size="md">
        {selectedCompany && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
              <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center font-black text-accent-600 dark:text-accent-400 text-lg">
                {selectedCompany.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white">{selectedCompany.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{selectedCompany.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan</p>
                <Badge variant={planVariant(selectedCompany.plan)} size="sm" shape="rounded" icon={<Crown className="w-3 h-3" />}>
                  {planLabel(selectedCompany.plan)}
                </Badge>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">${getPlanPrice(selectedCompany.plan)}/mes</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Pago</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${paymentStatusColor(selectedCompany.payment_status)}`}>
                  {selectedCompany.payment_status === 'paid' ? 'Pagado' : selectedCompany.payment_status === 'pending' ? 'Pendiente' : selectedCompany.payment_status === 'overdue' ? 'Vencido' : 'Sin estado'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Usuarios</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{selectedCompany.userCount || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Creado</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedCompany.created_at ? new Date(selectedCompany.created_at).toLocaleDateString() : '-'}</p>
              </div>
            </div>

            {selectedCompany.admin_notification && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Bell className="w-3 h-3" /> Notificación activa
                </p>
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{selectedCompany.admin_notification}</p>
                {selectedCompany.show_overdue_popup && (
                  <p className="text-[9px] font-black text-amber-500 mt-1 uppercase tracking-wider">Mostrar popup al iniciar sesión</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" leftIcon={<Bell className="w-4 h-4" />} onClick={() => { setNotificationMsg(selectedCompany.admin_notification || ''); setShowPopup(selectedCompany.show_overdue_popup || false); setShowNotifyModal(true); }} className="flex-1">
                Enviar Notificación
              </Button>
              <Button variant={selectedCompany.payment_status === 'overdue' ? 'danger' : 'outline'} size="sm" leftIcon={<CreditCard className="w-4 h-4" />} onClick={() => handlePaymentStatus(selectedCompany, selectedCompany.payment_status === 'paid' ? 'overdue' : 'paid')} className="flex-1">
                {selectedCompany.payment_status === 'paid' ? 'Marcar Vencido' : 'Marcar Pagado'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Send Notification Modal */}
      <Modal
        open={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        title="Enviar Notificación"
        subtitle={selectedCompany?.name || ''}
        icon={<Bell className="w-5 h-5 text-accent-500" />}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mensaje</p>
            <textarea
              value={notificationMsg}
              onChange={(e) => setNotificationMsg(e.target.value)}
              placeholder="Escribe el mensaje para la empresa..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-none"
            />
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showPopup}
              onChange={(e) => setShowPopup(e.target.checked)}
              className="w-4 h-4 rounded accent-accent-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Mostrar popup al iniciar sesión</p>
              <p className="text-[9px] text-slate-400">La empresa verá este mensaje como un popup cuando accedan al sistema</p>
            </div>
          </label>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNotifyModal(false)} className="flex-1">Cancelar</Button>
            <Button variant="primary" size="sm" leftIcon={<Send className="w-4 h-4" />} onClick={handleSendNotification} disabled={!notificationMsg.trim()} className="flex-1">
              Enviar
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};
