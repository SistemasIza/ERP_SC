import { useState } from 'react';
import { Plus, X, Save, Trash2, Upload, Image as ImageIcon, Video, Package } from 'lucide-react';
import { Dropdown } from '../../../components/ui/Dropdown';

interface CatalogItem {
  id: string;
  title: string;
  price: string;
  type: string;
  url: string;
  description: string;
  media_url: string;
  media_type?: string;
}

interface CatalogEditorProps {
  open: boolean;
  catalog: any;
  onSave: (catalog: any) => Promise<void>;
  onClose: () => void;
  onImageUpload: (itemId: string, file: File) => Promise<string | null>;
  loading?: boolean;
}

export const CatalogEditor = ({ open, catalog: initialCatalog, onSave, onClose, onImageUpload, loading }: CatalogEditorProps) => {
  const [catalog, setCatalog] = useState<any>(() => initialCatalog ? JSON.parse(JSON.stringify(initialCatalog)) : null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  if (!open || !catalog) return null;

  const handleAddItem = () => {
    setCatalog({
      ...catalog,
      items: [
        ...(catalog.items || []),
        { id: Date.now().toString(), title: '', price: '', type: 'image', url: '', description: '', media_url: '' }
      ]
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setCatalog({
      ...catalog,
      items: catalog.items.filter((item: any) => item.id !== itemId)
    });
  };

  const handleItemChange = (itemId: string, field: string, value: string) => {
    setCatalog({
      ...catalog,
      items: catalog.items.map((item: any) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    });
  };

  const handleImageUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(itemId);
    const url = await onImageUpload(itemId, file);
    if (url) handleItemChange(itemId, 'media_url', url);
    setUploadingImage(null);
  };

  return (
    <div className="absolute inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white dark:bg-dark-card shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-500 border-l border-gray-100 dark:border-white/5">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-dark-card">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{catalog?.id ? 'Editar Catálogo' : 'Nuevo Catálogo'}</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Configura los detalles e items</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-10 h-10 rounded-xl dark:bg-dark-card flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
              <X className="w-5 h-5" />
            </button>
            <button onClick={() => onSave(catalog)} disabled={loading} className="bg-accent-500 hover:bg-accent-600 text-black px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Nombre del catálogo</label>
              <input type="text" placeholder="Ej. Promociones Verano" value={catalog?.name || ''} onChange={e => setCatalog({ ...catalog, name: e.target.value })} className="w-full px-5 py-3.5 dark:bg-dark-card rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-accent-500 transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Descripción</label>
              <textarea rows={3} placeholder="Describe el contenido del catálogo..." value={catalog?.description || ''} onChange={e => setCatalog({ ...catalog, description: e.target.value })} className="w-full px-5 py-3.5 dark:bg-dark-card rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-accent-500 transition-colors resize-none" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Estado</label>
              <Dropdown
                value={catalog?.status || 'draft'}
                onChange={v => setCatalog({ ...catalog, status: v })}
                options={[
                  { value: 'draft', label: 'Borrador' },
                  { value: 'active', label: 'Activo' },
                ]}
              />
            </div>
          </div>

          <div className="h-px bg-gray-100 dark:bg-white/5" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Productos / Items</h3>
              <button onClick={handleAddItem} className="text-[10px] font-black text-accent-500 uppercase tracking-widest hover:text-accent-600 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Añadir Item
              </button>
            </div>

            <div className="space-y-4">
              {catalog?.items?.map((item: CatalogItem) => (
                <div key={item.id} className="p-4 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-2xl flex items-start gap-4 group hover:border-accent-500/50 transition-colors shadow-sm">
                  <div className="w-20 h-20 dark:bg-dark-card rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden border border-gray-100 dark:border-white/5 group/img cursor-pointer">
                    {item.media_url ? (
                      <img src={item.media_url} alt="product media" className="w-full h-full object-cover" />
                    ) : (
                      item.media_type === 'video' ? <Video className="w-6 h-6 text-gray-300" /> : <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer">
                      <Upload className="w-4 h-4 text-white mb-1" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">{uploadingImage === item.id ? 'Subiendo' : 'Subir'}</span>
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleImageUpload(item.id, e)} disabled={uploadingImage === item.id} />
                    </label>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <input type="text" value={item.title || ''} onChange={e => handleItemChange(item.id, 'title', e.target.value)} placeholder="Nombre del producto" className="w-full bg-transparent text-sm font-black text-gray-900 dark:text-white outline-none placeholder:text-gray-400" />
                      <button onClick={() => handleItemChange(item.id, 'media_type', (item.media_type || item.type) === 'image' ? 'video' : 'image')} className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-accent-500 whitespace-nowrap">
                        Es: {(item.media_type || item.type) === 'image' ? 'IMG' : 'VID'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={item.price || ''} onChange={e => handleItemChange(item.id, 'price', e.target.value)} placeholder="Precio ($0.00)" className="w-1/2 px-3 py-2 dark:bg-dark-card rounded-lg text-xs font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-accent-500 transition-colors" />
                      <input type="text" value={item.url || ''} onChange={e => handleItemChange(item.id, 'url', e.target.value)} placeholder="Enlace/URL (opcional)" className="w-1/2 px-3 py-2 dark:bg-dark-card rounded-lg text-xs font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-accent-500 transition-colors" />
                    </div>
                    <textarea rows={2} value={item.description || ''} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Descripción breve..." className="w-full px-3 py-2 dark:bg-dark-card rounded-lg text-xs font-bold text-gray-900 dark:text-white outline-none border border-transparent focus:border-accent-500 transition-colors resize-none" />
                  </div>
                  <button onClick={() => handleRemoveItem(item.id)} className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {(!catalog?.items || catalog.items.length === 0) && (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-gray-400">Este catálogo está vacío.</p>
                  <button onClick={handleAddItem} className="mt-3 text-[10px] font-black text-accent-500 uppercase tracking-widest hover:underline">
                    Agrega tu primer producto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
