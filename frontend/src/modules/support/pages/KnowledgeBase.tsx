import { useState } from 'react';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { SearchBar } from '../../../components/ui/SearchBar';
import { ViewToggle, ViewMode } from '../../../components/ui/ViewToggle';
import { PageHeader } from '../../../components/layout/PageHeader';
import { HeaderButton } from '../../../components/ui/HeaderButton';
import { CountBadge } from '../../../components/ui/CountBadge';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { DataTable } from '../../../components/ui/DataTable';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Modal } from '../../../components/ui/Modal';
import { useNotifications } from '../../../contexts/NotificationContext';

interface KnowledgeArticle {
  id: string; title: string; category: string; content: string; tags: string[]; updatedAt: string;
}

const mockArticles: KnowledgeArticle[] = [
  { id: 'KB-001', title: 'Cómo realizar un pedido', category: 'Ventas', content: 'Para realizar un pedido...', tags: ['pedido', 'compra'], updatedAt: '2024-01-15' },
  { id: 'KB-002', title: 'Política de devoluciones', category: 'Ventas', content: 'Nuestra política de devoluciones...', tags: ['devolución', 'reembolso'], updatedAt: '2024-01-10' },
  { id: 'KB-003', title: 'Métodos de pago aceptados', category: 'Pagos', content: 'Aceptamos los siguientes métodos...', tags: ['pago', 'tarjeta'], updatedAt: '2024-01-08' },
];

const CATEGORIES = ['Ventas', 'Pagos', 'Soporte', 'General'];

export const KnowledgeBase = () => {
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formContent, setFormContent] = useState('');

  const columns = [
    { key: 'title', header: 'Título' },
    { key: 'category', header: 'Categoría' },
    { key: 'content', header: 'Contenido', render: (v: string) => v.substring(0, 50) + '...' },
    { key: 'tags', header: 'Etiquetas', render: (v: string[]) => v.join(', ') },
    { key: 'updatedAt', header: 'Actualizado' },
    { key: 'actions', header: 'Acciones', className: 'text-center', render: () => (
      <div className="flex gap-2">
        <button className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all"><Edit className="w-4 h-4" /></button>
        <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
      </div>
    )},
  ];

  const filtered = mockArticles.filter(a =>
    (a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterCategory === 'all' || a.category === filterCategory)
  );

  return (
    <PageContainer>
      <PageHeader
        title="Base de Conocimiento"
        description="Contenido para respuestas automáticas del bot"
        icon={BookOpen}
        action={
          <div className="flex items-center gap-3">
            <CountBadge count={mockArticles.length} />
            <HeaderButton onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
              Nuevo Artículo
            </HeaderButton>
          </div>
        }
      />
      <PageBody>
        <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden p-6">
          <div className="flex items-center gap-3 mb-4">
            <SearchBar value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} placeholder="Buscar artículos..." className="flex-1" />
            <Dropdown
              value={filterCategory}
              onChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'Todas las categorías' },
                ...CATEGORIES.map(c => ({ value: c, label: c })),
              ]}
            />
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((article) => (
                <div key={article.id} className="group bg-slate-50 dark:bg-black/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 bg-accent-500/10 rounded-xl text-accent-500"><BookOpen className="w-5 h-5" /></div>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[10px] font-black uppercase tracking-wider">{article.category}</span>
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm mb-2">{article.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{article.content}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {article.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-accent-500/10 text-accent-500 rounded-full text-[10px] font-bold">#{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{article.updatedAt}</span>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-500/10 transition-all"><Edit className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
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
        title="Nuevo Artículo"
        icon={<BookOpen className="w-5 h-5 text-accent-500" />}
      >
        <form onSubmit={(e) => { e.preventDefault(); addNotification({ type: 'success', title: 'Artículo creado', message: `Se ha creado el artículo ${formTitle}` }); setShowCreateModal(false); }} className="space-y-4">
          <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Título del artículo" required className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
          <Dropdown
            value={formCategory}
            onChange={v => setFormCategory(v)}
            placeholder="Seleccionar categoría"
            options={[
              { value: 'Ventas', label: 'Ventas' },
              { value: 'Pagos', label: 'Pagos' },
              { value: 'Soporte', label: 'Soporte' },
              { value: 'General', label: 'General' },
            ]}
          />
          <textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Contenido del artículo" required rows={4} className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60 resize-none" />
          <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all shadow-md">Crear Artículo</button>
        </form>
      </Modal>
    </PageContainer>
  );
};
