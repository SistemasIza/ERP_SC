import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, QrCode, Smartphone, CheckCircle } from 'lucide-react';
import { Loader } from '../../../components/ui/Loader';

interface QRCodeDisplayProps {
  qrValue: string | null;
  status: 'loading' | 'qr_ready' | 'connecting' | 'connected' | 'expired';
  onRefresh: () => void;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ qrValue, status, onRefresh }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-dark-card rounded-[3rem] border border-gray-100 dark:border-gray-800/50 shadow-2xl relative overflow-hidden group">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50" />
      <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary-500/10 blur-[80px] rounded-full group-hover:bg-primary-500/20 transition-all duration-700" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center space-y-8">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20">
            <QrCode className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">Vinculación Rápida</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Escanea el Código <span className="text-primary-600">QR</span></h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
            Abre WhatsApp en tu teléfono, ve a Dispositivos Vinculados y escanea este código para conectar SparkBot.
          </p>
        </div>

        <div className="relative p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700/50 group/qr transition-transform duration-500 hover:scale-[1.02]">
          {/* QR Container */}
          <div className={`relative aspect-square w-64 overflow-hidden rounded-2xl flex items-center justify-center ${status === 'loading' || status === 'expired' ? 'bg-slate-50 dark:bg-slate-800/50' : 'bg-white'}`}>
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-3 animate-pulse">
                <Loader size="md" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Generando...</span>
              </div>
            )}

            {status === 'qr_ready' && qrValue && (
              <QRCodeSVG
                value={qrValue}
                size={256}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/vite.svg", // Placeholder or bot icon
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            )}

            {status === 'connecting' && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-500 rounded-full blur-xl opacity-20 animate-ping" />
                  <Smartphone className="w-12 h-12 text-primary-500 relative z-10" />
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Sincronizando...</p>
              </div>
            )}

            {status === 'connected' && (
              <div className="flex flex-col items-center gap-4 scale-in-center">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">¡Vinculado con éxito!</p>
              </div>
            )}

            {status === 'expired' && (
              <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                <p className="text-sm font-bold text-slate-900 dark:text-white">El código ha expirado</p>
                <button
                  onClick={onRefresh}
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recargar QR
                </button>
              </div>
            )}
          </div>

          {/* Corner accents */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-3xl opacity-30" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-3xl opacity-30" />
        </div>

        <div className="grid grid-cols-2 gap-4 w-full pt-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paso 1</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Menú de WhatsApp</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Paso 2</p>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Vincular dispositivo</p>
          </div>
        </div>
      </div>
    </div>
  );
};
