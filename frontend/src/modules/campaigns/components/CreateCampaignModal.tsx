import { useState, useRef, useEffect } from 'react';
import {
  UploadCloud, FileSpreadsheet, ChevronLeft, ChevronRight, Send,
  Smartphone, Zap, Check, Wand2
} from 'lucide-react';
import { Loader } from '../../../components/ui/Loader';
import { Modal } from '../../../components/ui/Modal';
import { Dropdown } from '../../../components/ui/Dropdown';
import { useNotifications } from '../../../contexts/NotificationContext';
import { parseCampaignExcel, createCampaign, sendCampaign } from '../../../services/api';
import api from '../../../services/api';

interface ParsedContact {
  phone: string;
  variables: Record<string, string>;
}

interface ParsedExcel {
  headers: string[];
  phoneKey: string;
  rows: ParsedContact[];
  total: number;
}

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (campaign: any) => void;
}

const delayOptions = [
  { value: '1500', label: '1.5 segundos entre mensajes' },
  { value: '3000', label: '3 segundos (recomendado)' },
  { value: '5000', label: '5 segundos' },
  { value: '10000', label: '10 segundos' },
];

const stepsMeta = [
  { label: 'Excel', desc: 'Carga tus contactos' },
  { label: 'Mensaje', desc: 'Redacta tu campaña' },
  { label: 'Revisión', desc: 'Confirma y envía' },
];

export const CreateCampaignModal = ({ open, onClose, onCreated }: CreateCampaignModalProps) => {
  const { addNotification } = useNotifications();
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [step, setStep] = useState(1);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedExcel | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [delayMs, setDelayMs] = useState('3000');
  const [sendNow, setSendNow] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [metaTemplateName, setMetaTemplateName] = useState('');
  const [metaTemplateLanguage, setMetaTemplateLanguage] = useState('es');
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [metaTemplatesLoading, setMetaTemplatesLoading] = useState(false);
  const [metaTemplatesError, setMetaTemplatesError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setParsed(null);
    setFileName('');
    setParseError('');
    setName('');
    setMessage('');
    setDelayMs('3000');
    setSendNow(true);
    setCreating(false);
    setMetaTemplateName('');
    setMetaTemplateLanguage('es');
    (async () => {
      try {
        const res = await api.get('/whatsapp-connections');
        const connList = Array.isArray(res.data) ? res.data : [];

        // Load Cloud API connections
        try {
          const cloudRes = await api.get('/platform/connections');
          const cloudData = cloudRes.data;
          const cloudList = Array.isArray(cloudData) ? cloudData : (cloudData?.connections || cloudData?.data || []);
          const cloudWhatsapp = cloudList
            .filter((c: any) => c.platform_type === 'whatsapp' && c.status === 'connected')
            .map((c: any) => ({
              id: c.id,
              display_name: `${c.display_name || 'Cloud API'} (Cloud)`,
              phone_number: c.config?.phone_number || c.platform_account_id || '',
              status: c.status,
              source: 'cloud'
            }));
          connList.push(...cloudWhatsapp);
        } catch { /* cloud API not available */ }

        setConnections(connList);
        const connected = connList.find((c: any) => c.status === 'connected');
        setConnectionId(connected?.id || connList[0]?.id || '');
      } catch (e) {
        setConnections([]);
        setConnectionId('');
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!connectionId) return;
    const conn = connections.find((c) => c.id === connectionId);
    console.log('[Campaign] Connection changed:', connectionId, 'source:', conn?.source, 'name:', conn?.display_name);
    if (!conn || conn.source !== 'cloud') {
      setMetaTemplates([]);
      setMetaTemplatesError('');
      return;
    }
    setMetaTemplatesLoading(true);
    setMetaTemplatesError('');
    console.log('[Campaign] Fetching templates from:', `/platform/connections/${connectionId}/templates`);
    api.get(`/platform/connections/${connectionId}/templates`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        console.log('[Campaign] Templates loaded:', data.length, data.map((t: any) => t.name));
        setMetaTemplates(data);
      })
      .catch((err) => {
        console.error('[Campaign] Templates error:', err?.response?.data || err.message);
        setMetaTemplates([]);
        setMetaTemplatesError(err?.response?.data?.error || 'No se pudieron cargar los templates de Meta.');
      })
      .finally(() => setMetaTemplatesLoading(false));
  }, [connectionId, connections]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext || '')) {
      setParseError('Solo se permiten archivos .xlsx o .xls');
      return;
    }
    setParsing(true);
    setParseError('');
    try {
      const base64Data = await readFileAsBase64(file);
      const result = await parseCampaignExcel(file.name, base64Data);
      if (!result.rows || result.rows.length === 0) {
        setParseError('No se encontraron teléfonos válidos en el archivo.');
        setParsing(false);
        return;
      }
      setParsed(result);
      setFileName(file.name);
      setStep(2);
    } catch (err: any) {
      setParseError(err?.response?.data?.error || 'No se pudo leer el archivo Excel.');
    } finally {
      setParsing(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const insertVariable = (variable: string) => {
    const el = textareaRef.current;
    if (!el) {
      setMessage((prev) => prev + `{{${variable}}}`);
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = message.slice(0, start) + `{{${variable}}}` + message.slice(end);
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + variable.length + 4;
      el.setSelectionRange(pos, pos);
    });
  };

  const renderPreview = () => {
    if (!parsed || parsed.rows.length === 0 || !message) return '';
    let preview = message;
    const sample = parsed.rows[0];
    for (const [key, value] of Object.entries(sample.variables)) {
      preview = preview.replace(new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'gi'), value);
    }
    preview = preview.replace(/\{\{\s*[\w\s-]+\s*\}\}/g, '');
    return preview;
  };

  const handleCreate = async () => {
    if (!parsed) return;
    if (!name.trim()) {
      addNotification({ type: 'error', title: 'Falta el nombre', message: 'Ingresa un nombre para la campaña.' });
      return;
    }
    if (!message.trim()) {
      addNotification({ type: 'error', title: 'Falta el mensaje', message: 'Redacta el mensaje a enviar.' });
      return;
    }
    const isCloudConnection = connections.find((c) => c.id === connectionId)?.source === 'cloud';
    if (isCloudConnection && !metaTemplateName.trim()) {
      addNotification({ type: 'error', title: 'Falta el template Meta', message: 'Cloud API requiere un template aprobado por Meta para mensajes proactivos.' });
      return;
    }
    setCreating(true);
    try {
      const campaign = await createCampaign({
        name: name.trim(),
        messageTemplate: message.trim(),
        whatsappConnectionId: connectionId || null,
        delayMs: Number(delayMs) || 3000,
        contacts: parsed.rows,
        metaTemplateName: metaTemplateName || undefined,
        metaTemplateLanguage: metaTemplateName ? metaTemplateLanguage : undefined,
      });
      addNotification({ type: 'success', title: 'Campaña creada', message: `Se cargaron ${parsed.total} contactos.` });
      if (sendNow) {
        try {
          await sendCampaign(campaign.id);
        } catch (err: any) {
          addNotification({ type: 'warning', title: 'No se inició el envío', message: err?.response?.data?.error || 'Configura la conexión WhatsApp e inicia el envío manualmente.' });
        }
      }
      onCreated(campaign);
      onClose();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err?.response?.data?.error || 'No se pudo crear la campaña.' });
    } finally {
      setCreating(false);
    }
  };

  const connectedCount = connections.filter((c) => c.status === 'connected').length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title="Nueva Campaña de Mensajes"
      subtitle="Sube un Excel, personaliza el mensaje y envía por WhatsApp automáticamente"
      icon={<Send className="w-5 h-5 text-accent-500" />}
    >
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6">
        {stepsMeta.map((s, i) => {
          const idx = i + 1;
          const active = idx === step;
          const done = idx < step;
          return (
            <div key={s.label} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${done ? 'bg-emerald-500 text-white' : active ? 'bg-accent-500 text-black' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                {done ? <Check className="w-4 h-4" /> : idx}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold leading-none ${active ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{s.label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5 hidden sm:block truncate">{s.desc}</p>
              </div>
              {idx < 3 && <div className={`flex-1 h-px mx-1 ${done ? 'bg-emerald-500/50' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </div>
          );
        })}
      </div>

      {/* STEP 1: Excel */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className="group border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all hover:border-accent-500/60 hover:bg-accent-500/5 cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {parsing ? (
              <>
                <Loader size="md" className="mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Procesando archivo...</p>
              </>
            ) : (
              <>
                <div className="p-3 bg-accent-500/10 rounded-2xl mb-3 transition-transform group-hover:scale-105">
                  <UploadCloud className="w-8 h-8 text-accent-500" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Arrastra tu archivo Excel aquí o <span className="text-accent-500 underline">haz clic para seleccionarlo</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Formatos: .xlsx, .xls — Debe contener una columna con teléfonos (celular, teléfono, whatsapp, número...)
                </p>
              </>
            )}
          </div>

          <div className="flex items-start gap-3 px-4 py-3 bg-gradient-to-r from-blue-500/5 to-accent-500/5 border border-blue-500/15 rounded-xl">
            <div className="p-1.5 bg-blue-500/10 rounded-lg shrink-0 mt-0.5">
              <Wand2 className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-blue-600 dark:text-blue-400">Variables del Excel:</span> Las columnas de tu archivo se usan automáticamente. Ejemplo: si tu Excel tiene columna "nombre", usa <code className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md font-mono text-[10px] font-bold">nombre</code> en el mensaje.
            </div>
          </div>

          {parseError && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-500">
              {parseError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => { if (parsed) setStep(2); }}
              disabled={!parsed}
              className="flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold bg-accent-500 text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-600 transition-all"
            >
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Message */}
      {step === 2 && parsed && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{fileName}</p>
              <p className="text-[10px] text-slate-400">
                {parsed.total} contactos detectados · Columna teléfono: <span className="font-mono font-bold">{parsed.phoneKey}</span>
              </p>
            </div>
            <button onClick={() => setStep(1)} className="ml-auto text-[11px] font-bold text-accent-500 hover:underline shrink-0">Cambiar archivo</button>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre de la campaña</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Campaña de Bienvenida - Febrero"
              className="w-full mt-1.5 px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400/60"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mensaje</label>
              <span className="text-[10px] text-slate-400">{message.length} caracteres</span>
            </div>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Escribe tu mensaje aquí... Usa los botones de abajo para insertar datos del contacto"
                className="w-full mt-1.5 px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400/60 font-mono leading-relaxed resize-none"
              />
              {message && parsed.headers.length > 0 && (
                <div className="absolute top-2.5 right-3 pointer-events-none">
                  {parsed.headers.filter(h => message.includes(`{{${h}}}`)).length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {parsed.headers.filter(h => message.includes(`{{${h}}}`)).map(h => (
                        <span key={h} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent-500/15 text-accent-600 dark:text-accent-400 rounded-md text-[9px] font-bold border border-accent-500/20">
                          <span className="w-1 h-1 bg-accent-500 rounded-full" />
                          {h.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {parsed.headers.length > 0 && (
              <div className="mt-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-md bg-accent-500/10 flex items-center justify-center">
                    <span className="text-accent-500 text-[10px] font-black">+</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Toca para insertar</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.headers.map((h) => (
                    <button
                      key={h}
                      onClick={() => insertVariable(h)}
                      className="group flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/[0.02] text-slate-600 dark:text-slate-300 hover:from-accent-500/10 hover:to-accent-500/5 hover:text-accent-600 dark:hover:text-accent-400 transition-all duration-200 border border-slate-200/60 dark:border-white/10 hover:border-accent-500/30 hover:shadow-sm active:scale-95"
                      title={`Insertar: ${h.replace(/_/g, ' ')}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-400/60 group-hover:bg-accent-500 transition-colors" />
                      {h.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> Conexión WhatsApp
              </label>
              <div className="mt-1.5">
                <Dropdown
                  value={connectionId}
                  onChange={setConnectionId}
                  options={connections.map((c) => ({
                    value: c.id,
                    label: `${c.display_name}${c.phone_number ? ' · ' + c.phone_number : ''} (${c.status})`,
                  }))}
                  placeholder={connections.length === 0 ? 'No hay conexiones' : 'Seleccionar conexión'}
                />
              </div>
              {connections.length === 0 && (
                <p className="text-[10px] text-amber-500 mt-1">Conecta un WhatsApp en el módulo de Conexiones antes de enviar.</p>
              )}
              {connectedCount === 0 && connections.length > 0 && (
                <p className="text-[10px] text-amber-500 mt-1">Ninguna conexión está conectada actualmente.</p>
              )}
              {connections.find((c) => c.id === connectionId)?.source === 'cloud' && (
                <div className="mt-3">
                  <label className="text-[11px] font-bold text-violet-500 uppercase tracking-wider">
                    Cloud API — Template Meta
                  </label>
                  {metaTemplatesLoading ? (
                    <div className="mt-1.5 px-4 py-3 dark:bg-white/5 border border-violet-300 dark:border-violet-700 rounded-xl flex items-center gap-2">
                      <Loader size="xs" />
                      <span className="text-xs text-violet-400">Cargando templates de Meta...</span>
                    </div>
                  ) : metaTemplates.length > 0 ? (
                    <select
                      value={metaTemplateName}
                      onChange={(e) => {
                        const tpl = metaTemplates.find((t: any) => t.name === e.target.value);
                        setMetaTemplateName(e.target.value);
                        setMetaTemplateLanguage(tpl?.language || 'es');
                        if (tpl) {
                          const bodyComp = tpl.components?.find((c: any) => c.type === 'BODY');
                          if (bodyComp?.text) {
                            setMessage(bodyComp.text.replace(/\{\{(.*?)\}\}/g, '\u200B$1\u200B'));
                          }
                        }
                      }}
                      className="w-full mt-1.5 px-4 py-3 dark:bg-white/5 border border-violet-300 dark:border-violet-700 rounded-xl focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white"
                    >
                      <option value="">Seleccionar template...</option>
                      {metaTemplates.map((t: any) => (
                        <option key={t.name} value={t.name}>
                          {t.name} — {t.language} ({t.status})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={metaTemplateName}
                      onChange={(e) => setMetaTemplateName(e.target.value)}
                      placeholder="ej: plantillaenvios"
                      className="w-full mt-1.5 px-4 py-3 dark:bg-white/5 border border-violet-300 dark:border-violet-700 rounded-xl focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white"
                    />
                  )}
                  {metaTemplateName && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-violet-400">Idioma:</span>
                      <input
                        type="text"
                        value={metaTemplateLanguage}
                        onChange={(e) => setMetaTemplateLanguage(e.target.value)}
                        className="px-2 py-0.5 w-16 text-[10px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-lg outline-none focus:border-violet-500/50"
                      />
                      <span className="text-[9px] text-slate-400">(ej: es, es_PE, en, en_US)</span>
                    </div>
                  )}
                  <p className="text-[10px] text-violet-400 mt-1">
                    Cloud API requiere un template aprobado por Meta. El mensaje se enviará como parámetro del template.
                  </p>
                </div>
              )}
              {metaTemplatesError && connections.find((c) => c.id === connectionId)?.source === 'cloud' && (
                <div className="mt-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500">
                  <p className="font-bold mb-1">Error cargando templates:</p>
                  <p>{metaTemplatesError}</p>
                  <p className="text-[10px] text-red-400 mt-1">Verifica: Phone Number ID correcto, Access Token con permisos, y que tengas templates creados en Meta Business Suite.</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3" /> Velocidad de envío
              </label>
              <div className="mt-1.5">
                <Dropdown value={delayMs} onChange={setDelayMs} options={delayOptions} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Recomendado: 3s para evitar bloqueos de WhatsApp.</p>
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vista previa (primer contacto)</p>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-accent-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{parsed.rows[0].phone}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{renderPreview() || 'Escribe un mensaje para ver la vista previa...'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!name.trim() || !message.trim()}
              className="flex items-center gap-2 px-5 h-10 rounded-xl text-sm font-bold bg-accent-500 text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-600 transition-all"
            >
              Revisar y crear <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && parsed && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="px-4 py-4 bg-accent-500/5 border border-accent-500/20 rounded-xl text-center">
              <p className="text-2xl font-black text-accent-500">{parsed.total}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Contactos</p>
            </div>
            <div className="px-4 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center">
              <p className="text-2xl font-black text-emerald-500">{message.replace(/\{\{\s*[\w\s-]+\s*\}\}/g, '').length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Caracteres</p>
            </div>
            <div className="px-4 py-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
              <p className="text-2xl font-black text-blue-500">{connections.find((c) => c.id === connectionId)?.status === 'connected' ? '✓' : '—'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Conexión lista</p>
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{name}</p>
          </div>

          <div className="px-4 py-3 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mensaje</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{message}</p>
          </div>

          <label className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl cursor-pointer">
            <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Enviar inmediatamente al crear</p>
              <p className="text-[10px] text-slate-400">Si la conexión no está lista, se guardará como borrador para enviar después.</p>
            </div>
          </label>

          {connections.find((c) => c.id === connectionId)?.status !== 'connected' && (
            <div className="px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400">
              ⚠️ La conexión seleccionada no está conectada. Podrás iniciar el envío manualmente cuando el dispositivo esté en línea.
            </div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} disabled={creating} className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-6 h-11 rounded-xl text-sm font-black bg-gradient-to-r from-accent-500 to-accent-600 text-black hover:opacity-90 transition-all shadow-lg shadow-accent-500/20 disabled:opacity-50"
            >
              {creating ? <Loader size="xs" /> : <Send className="w-4 h-4" />}
              {creating ? 'Creando...' : sendNow ? 'Crear y Enviar' : 'Crear Campaña'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
