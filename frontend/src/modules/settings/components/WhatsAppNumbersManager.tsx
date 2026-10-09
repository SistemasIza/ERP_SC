import { useState } from 'react';
import { useWhatsApp } from '../../../contexts/WhatsAppContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { Plus, Trash2, Smartphone, QrCode, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Loader } from '../../../components/ui/Loader';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';

export const WhatsAppNumbersManager = () => {
  const { addNumber, removeNumber, getNumbersByOrganization, canAddMoreNumbers, loading } = useWhatsApp();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const organizationNumbers = user ? getNumbersByOrganization(user.organization_id) : [];
  const canAdd = user ? canAddMoreNumbers(user.organization_id) : false;

  const handleAddNumber = async () => {
    if (!newPhoneNumber || !newDisplayName) return;
    
    setIsAdding(true);
    try {
      await addNumber(newPhoneNumber, newDisplayName);
      addNotification({ type: 'success', title: 'Número agregado', message: `${newDisplayName} fue agregado correctamente.` });
      setNewPhoneNumber('');
      setNewDisplayName('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding number:', error);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo agregar el número.' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteNumber = async () => {
    if (!deleteTarget) return;
    try {
      await removeNumber(deleteTarget.id);
      addNotification({ type: 'success', title: 'Número eliminado', message: `${deleteTarget.name} fue eliminado correctamente.` });
    } catch (error) {
      console.error('Error removing number:', error);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo eliminar el número.' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-accent-500" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'connecting':
        return <Clock className="w-4 h-4 text-amber-500 animate-spin" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'disconnected':
        return 'Desconectado';
      case 'connecting':
        return 'Conectando...';
      default:
        return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteNumber}
        title="Eliminar número"
        message={`¿Deseas eliminar ${deleteTarget?.name || ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">Números de WhatsApp</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Gestiona los números de WhatsApp autorizados para tu empresa
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={!canAdd}
          className={`px-4 py-2 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${
            canAdd
              ? 'bg-black text-white dark:bg-accent-500 dark:text-black hover:scale-105 active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" />
          {organizationNumbers.length === 0 ? 'Agregar Número' : 'Agregar Segundo'}
        </button>
      </div>

      {/* Límite de números */}
      <div className={`p-4 rounded-xl border ${
        canAdd 
          ? 'bg-accent-500/10 dark:bg-accent-500/10 border-accent-500/20 dark:border-accent-500/20' 
          : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
      }`}>
        <div className="flex items-center gap-3">
          <Smartphone className={`w-5 h-5 ${canAdd ? 'text-accent-500 dark:text-accent-400' : 'text-amber-600 dark:text-amber-400'}`} />
          <div className="flex-1">
            <p className={`text-sm font-black ${canAdd ? 'text-accent-600 dark:text-accent-400' : 'text-amber-900 dark:text-amber-100'}`}>
              {organizationNumbers.length}/2 números autorizados
            </p>
            <p className={`text-xs ${canAdd ? 'text-accent-600 dark:text-accent-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {canAdd 
                ? `Puedes agregar ${2 - organizationNumbers.length} número(s) más` 
                : 'Has alcanzado el límite máximo de números autorizados'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Formulario para agregar número */}
      {showAddForm && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-black text-gray-900 dark:text-white mb-4">Agregar Nuevo Número</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Número de Teléfono
              </label>
              <input
                type="tel"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder="+5491112345678"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre para Mostrar
              </label>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Número Principal"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddNumber}
                disabled={isAdding || !newPhoneNumber || !newDisplayName}
                className="px-6 py-3 bg-black text-white dark:bg-accent-500 dark:text-black rounded-xl font-black hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isAdding ? 'Agregando...' : 'Agregar Número'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewPhoneNumber('');
                  setNewDisplayName('');
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-black hover:bg-gray-300 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de números */}
      <div className="space-y-3">
        {organizationNumbers.length === 0 ? (
          <div className="text-center py-12">
            <Smartphone className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              No tienes números de WhatsApp configurados
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Agrega tu primer número para empezar a usar el chatbot
            </p>
          </div>
        ) : (
          organizationNumbers.map((number) => (
            <div
              key={number.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-accent-500/10 dark:bg-accent-500/10 rounded-xl">
                    <Smartphone className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{number.displayName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{number.phoneNumber}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(number.status)}
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {getStatusText(number.status)}
                      </span>
                      {number.lastConnected && (
                        <span className="text-xs text-gray-400">
                          • Conectado: {new Date(number.lastConnected).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {number.status === 'disconnected' && (
                    <button className="p-2 text-accent-600 hover:bg-accent-50 dark:text-accent-400 dark:hover:bg-accent-500/10 rounded-xl transition-colors">
                      <QrCode className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget({ id: number.id, name: number.displayName })}
                    className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
