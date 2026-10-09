import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, MessageSquare, BarChart3,
  MessageCircle, CreditCard, TrendingUp, QrCode, Store,
  ChevronLeft, ChevronRight, ShieldAlert, BadgeInfo, ChevronDown,
  ShoppingBag, Tag,
  Bot, Bell, CreditCard as PaymentIcon,
  Activity, Globe, DollarSign, Database,
  Plus, Minus,
  Megaphone, Cloud
} from 'lucide-react';
import { SiDialogflow } from 'react-icons/si';
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from 'react-icons/fa';

interface SubMenuItem {
  label: string;
  path: string;
  icon?: any;
  subItems?: SubMenuItem[];
}

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  subItems?: SubMenuItem[];
}

interface SidebarGroup {
  id: string;
  name: string;
  icon: any;
  roles?: string[];
  items: MenuItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    id: 'principal',
    name: 'Principal',
    icon: LayoutDashboard,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: MessageSquare, label: 'Conversaciones', path: '/conversations' },
    ]
  },
  {
    id: 'crm',
    name: 'CRM & Clientes',
    icon: Users,
    items: [
      { icon: Users, label: 'Clientes', path: '/clients' },
      { icon: TrendingUp, label: 'Potenciales', path: '/leads' },
      { icon: Bell, label: 'Recordatorios', path: '/reminders' },
    ]
  },
  {
    id: 'sales',
    name: 'Ventas & Comercial',
    icon: ShoppingBag,
    items: [
      { icon: Store, label: 'Catálogos', path: '/catalogs' },
      { icon: Tag, label: 'Promociones', path: '/promotions' },
      { icon: Megaphone, label: 'Campañas', path: '/campaigns' },
    ]
  },
  {
    id: 'automation',
    name: 'IA & Automatización',
    icon: Bot,
    items: [
      { icon: SiDialogflow, label: 'Constructor de Bots', path: '/flow-manager' },
      { icon: Cloud, label: 'Templates WhatsApp', path: '/whatsapp-templates' },
    ]
  },
  {
    id: 'channels',
    name: 'Canales & Integraciones',
    icon: QrCode,
    items: [
      {
        icon: QrCode,
        label: 'Conexiones',
        path: '/connections',
        subItems: [
          {
            label: 'WhatsApp',
            path: '/whatsapp-qr',
            icon: FaWhatsapp,
            subItems: [
              { label: 'Conexiones', path: '/whatsapp-qr' },
              { label: 'Gestionar', path: '/multi-whatsapp' },
            ],
          },
          { label: 'Instagram', path: '/instagram-config', icon: FaInstagram },
          { label: 'Messenger', path: '/facebook-config', icon: FaFacebookMessenger },
        ],
      },
      { icon: Bell, label: 'Notificaciones', path: '/notifications' },
    ]
  },
  {
    id: 'admin',
    name: 'Administración & Equipo',
    icon: ShieldAlert,
    items: [
      { icon: BadgeInfo, label: 'Equipo', path: '/admin/staff' },
      { icon: BarChart3, label: 'Analíticas', path: '/analytics' },
    ]
  },
  {
    id: 'billing',
    name: 'Facturación & Planes',
    icon: PaymentIcon,
    items: [
      {
        icon: PaymentIcon,
        label: 'Facturación',
        path: '/billing',
        subItems: [
          { label: 'Planes y Suscripciones', path: '/billing/plans', icon: CreditCard },
          { label: 'Pagos', path: '/billing/payments', icon: DollarSign },
          { label: 'Uso/Consumo', path: '/billing/usage', icon: Database },
        ],
      },
    ]
  },
  {
    id: 'superadmin',
    name: 'Super Admin',
    icon: Globe,
    roles: ['super_admin'],
    items: [
      { icon: Globe, label: 'Todas las Empresas', path: '/superadmin/companies' },
      { icon: DollarSign, label: 'Métricas del Negocio', path: '/superadmin/business-metrics' },
      { icon: Activity, label: 'Logs del Sistema', path: '/superadmin/system-logs' },
    ]
  }
];

interface SidebarProps {
  onCollapsedChange?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar = ({ onCollapsedChange, isMobileOpen, onMobileClose }: SidebarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['/connections', '/whatsapp-qr']));
  
  // Estado para los grupos abiertos (acordeón)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['principal', 'crm', 'sales', 'automation', 'channels', 'admin', 'billing', 'superadmin']));

  // Filtrar grupos e ítems visibles según el rol del usuario
  const getVisibleGroups = (): SidebarGroup[] => {
    const role = user?.role || 'empresa';
    return sidebarGroups
      .filter(group => !group.roles || group.roles.includes(role))
      .map(group => {
        const filteredItems = group.items.filter(item => {
          if (role === 'agent') {
            return ['/conversations', '/clients', '/knowledge-base'].includes(item.path);
          }
          if (role === 'staff') {
            return ['/', '/conversations', '/clients', '/knowledge-base', '/notifications'].includes(item.path);
          }
          return true;
        });
        return { ...group, items: filteredItems };
      })
      .filter(group => group.items.length > 0);
  };

  const visibleGroups = getVisibleGroups();

  // Auto-expander el grupo correspondiente a la ruta actual
  useEffect(() => {
    const currentPath = location.pathname;
    visibleGroups.forEach(group => {
      const containsActivePath = group.items.some(item => {
        if (item.path === currentPath) return true;
        if (item.subItems) {
          return item.subItems.some(sub => sub.path === currentPath || sub.subItems?.some(n => n.path === currentPath));
        }
        return false;
      });
      if (containsActivePath) {
        setOpenGroups(prev => new Set([...prev, group.id]));
      }
    });
  }, [location.pathname]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
    onCollapsedChange?.(next);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (prev.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const isPathOrChildActive = (item: MenuItem): boolean => {
    if (location.pathname === item.path) return true;
    if (item.subItems) {
      return item.subItems.some(sub => {
        if (location.pathname === sub.path) return true;
        if (sub.subItems) return sub.subItems.some(n => location.pathname === n.path);
        return false;
      });
    }
    return false;
  };

  const sidebarContent = (mobile: boolean) => (
    <>
      {/* ===== BRANDING / TITLE ===== */}
      <div
        className={`
          flex items-center gap-3 px-4
          bg-gradient-to-b from-slate-50/80 to-transparent dark:from-white/[0.02] to-transparent
          ${collapsed && !mobile ? 'justify-center h-16' : 'h-[72px]'}
        `}
      >
        <div className="flex-shrink-0 w-9 h-9 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center shadow-md shadow-slate-900/10 dark:shadow-white/5">
          <MessageCircle className="w-4 h-4 text-white dark:text-black" strokeWidth={2.5} />
        </div>
        {(!collapsed || mobile) && (
          <div className="overflow-hidden flex-1 min-w-0">
            <h1 className="text-sm font-black text-slate-900 dark:text-white leading-none tracking-tight whitespace-nowrap">
              Grupos SC
            </h1>
            <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] whitespace-nowrap mt-1">
              Admin Suite
            </p>
          </div>
        )}
        {mobile && onMobileClose && (
          <button onClick={onMobileClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Separate divider */}
      <div className="mx-3 h-px bg-gradient-to-r from-slate-200/0 via-slate-200 dark:via-slate-700/50 to-slate-200/0" />

      {/* ===== NAVIGATION (GRUPOS UNIFICADOS) ===== */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-3">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const isGroupOpen = openGroups.has(group.id);
          const isGroupActive = group.items.some(item => isPathOrChildActive(item));
          const sideCollapsed = collapsed && !mobile;

          return (
            <div key={group.id} className="space-y-1 pt-1">
              {/* Encabezado del Grupo */}
              {!sideCollapsed ? (
                <div>
                  <div className="mx-2 mb-1.5 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800/80 to-transparent" />
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full group/btn flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isGroupActive
                        ? 'bg-accent-500/10 text-slate-900 dark:text-white border border-accent-500/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                        isGroupActive
                          ? 'bg-accent-500 text-black shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover/btn:text-slate-600 dark:group-hover/btn:text-slate-200'
                      }`}>
                        <GroupIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[8.5px] font-extrabold uppercase tracking-wider truncate">{group.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500">
                        {group.items.length}
                      </span>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                        isGroupOpen
                          ? 'bg-accent-500/20 text-accent-500 font-bold'
                          : 'text-slate-400 group-hover/btn:text-slate-600 dark:group-hover/btn:text-slate-200'
                      }`}>
                        {isGroupOpen ? <Minus className="w-3 h-3 stroke-[2.5]" /> : <Plus className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                /* Encabezado en modo colapsado */
                <div className="relative group/header flex justify-center py-1">
                  <div className={`p-1.5 rounded-lg transition-colors ${isGroupActive ? 'bg-accent-500/20 text-accent-400' : 'text-slate-400 hover:text-white'}`}>
                    <GroupIcon className="w-4 h-4" />
                  </div>
                  <div className="pointer-events-none group-hover/header:pointer-events-auto absolute left-full ml-3 top-0 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl p-2.5 w-48 border border-slate-700 opacity-0 group-hover/header:opacity-100 transition-all duration-200 z-50">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent-400 mb-1.5 border-b border-slate-700 pb-1 flex items-center gap-1.5">
                      <GroupIcon className="w-3 h-3" />
                      {group.name}
                    </p>
                    <div className="space-y-1">
                      {group.items.map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center gap-2 px-2 py-1 rounded text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/60 transition-colors"
                        >
                          <item.icon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ítems del Grupo */}
              {(isGroupOpen || sideCollapsed) && (
                <div className={`${sideCollapsed ? 'space-y-1' : 'pl-1 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 ml-2 mt-0.5'}`}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const hasSubItems = !!item.subItems?.length;
                    const isExpanded = expandedItems.has(item.path);

                    return (
                      <div key={item.path}>
                        <Link
                          to={item.path}
                          title={sideCollapsed ? item.label : undefined}
                          onClick={e => {
                            if (hasSubItems && !sideCollapsed) {
                              e.preventDefault();
                              toggleExpanded(item.path);
                            }
                            if (mobile && onMobileClose && !hasSubItems) onMobileClose();
                          }}
                          className={`
                            group relative flex items-center gap-2.5 rounded-lg transition-all duration-200
                            ${sideCollapsed ? 'justify-center py-2' : 'px-2 py-1.5'}
                            ${isActive
                              ? 'bg-slate-100 dark:bg-accent-500/10 text-slate-900 dark:text-accent-300 font-semibold shadow-sm'
                              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-accent-300 font-medium'
                            }
                          `}
                        >
                          {isActive && !sideCollapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-slate-900 dark:bg-accent-400 rounded-r-full" />
                          )}

                          <Icon
                            className={`shrink-0 transition-all duration-200 ${sideCollapsed ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${isActive ? 'opacity-100 dark:text-accent-300' : 'opacity-60 group-hover:opacity-100'}`}
                            strokeWidth={isActive ? 2.5 : 2}
                          />

                          {!sideCollapsed && (
                            <>
                              <span className="text-[11.5px] truncate flex-1 leading-none">{item.label}</span>
                              {hasSubItems && (
                                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              )}
                            </>
                          )}

                          {sideCollapsed && (
                            <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
                              {item.label}
                              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-white" />
                            </div>
                          )}
                        </Link>

                        {!sideCollapsed && hasSubItems && isExpanded && (
                          <div className="mt-0.5 ml-4 pl-2.5 border-l border-slate-200 dark:border-white/10 space-y-0.5">
                            {item.subItems?.map((sub) => {
                              const SubIcon = sub.icon;
                              const subHasItems = !!sub.subItems?.length;
                              const isSubExpanded = expandedItems.has(sub.path);
                              const isSubActive = location.pathname === sub.path;

                              if (subHasItems) {
                                return (
                                  <div key={sub.path}>
                                    <button
                                      onClick={() => toggleExpanded(sub.path)}
                                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 ${isSubActive
                                        ? 'text-slate-900 dark:text-accent-300 font-semibold bg-slate-100 dark:bg-accent-500/10'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-accent-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'
                                        }`}
                                    >
                                      {SubIcon && <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
                                      <span className="flex-1 text-left">{sub.label}</span>
                                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isSubExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isSubExpanded && (
                                      <div className="ml-4 pl-2.5 border-l border-slate-200 dark:border-white/10 space-y-0.5 mt-0.5">
                                        {sub.subItems?.map((nested) => {
                                          const isNestedActive = location.pathname === nested.path;
                                          return (
                                            <Link
                                              key={nested.path}
                                              to={nested.path}
                                              onClick={() => { if (mobile && onMobileClose) onMobileClose(); }}
                                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 ${isNestedActive
                                                ? 'text-slate-900 dark:text-accent-300 font-semibold bg-slate-100 dark:bg-accent-500/10'
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-accent-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'
                                                }`}
                                            >
                                              <span>{nested.label}</span>
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              return (
                                <Link
                                  key={sub.path}
                                  to={sub.path}
                                  onClick={() => { if (mobile && onMobileClose) onMobileClose(); }}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 ${isSubActive
                                    ? 'text-slate-900 dark:text-accent-300 font-semibold bg-slate-100 dark:bg-accent-500/10'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-accent-300 hover:bg-slate-50 dark:hover:bg-white/5 font-medium'
                                    }`}
                                >
                                  {SubIcon && <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
                                  <span>{sub.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ===== FOOTER / COLLAPSE ===== */}
      <div className="border-t border-[#E5E7EB] dark:border-[#333333] px-2 py-2.5 space-y-1">
        {(!collapsed || mobile) && user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-1">
            <div className="w-7 h-7 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-500 text-[10px] font-black shrink-0">
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate leading-tight">
                {user.email || 'Usuario'}
              </p>
              <p className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate leading-tight mt-0.5">
                {user.role || 'user'}
              </p>
            </div>
          </div>
        )}
        {!mobile && (
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-accent-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-200 ${collapsed ? '' : 'flex-row-reverse'}`}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[10px] font-semibold">Colapsar</span>
              </>
            )}
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex md:flex-col relative transition-all duration-300 ease-in-out
          bg-white dark:bg-[#1a1a1a]
          border-r border-[#E5E7EB] dark:border-[#333333]
          ${collapsed ? 'w-[68px]' : 'w-[240px]'}
        `}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            onClick={onMobileClose}
          />
          <aside
            className="fixed left-0 top-0 bottom-0 z-50 md:hidden flex flex-col
              w-[280px] bg-white dark:bg-[#1a1a1a]
              border-r border-[#E5E7EB] dark:border-[#333333]
              animate-in slide-in-from-left duration-300"
          >
            {sidebarContent(true)}
          </aside>
        </>
      )}
    </>
  );
};
