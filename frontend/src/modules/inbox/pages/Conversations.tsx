import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getConversations, getConversationMessages, getConversationMessageUpdates, deleteConversation, deleteUser, getCatalogs, getTeamUsers, assignAgentToConversation, updateConversationTags } from '../../../services/api';
import api from '../../../services/api';
import {
  Check, CheckCheck, Send, Search, Filter, Users, MoreVertical, Smile, Paperclip, Mic, Star, MessageCircle, Trash2, ChevronLeft, ChevronRight, ChevronDown, Store, Package, X, Bell, BellOff, Shield, Plus, Cloud, QrCode, Bot, User, MapPin, Download, Sticker, Camera, Video, Tag
} from 'lucide-react';
import { FaWhatsapp, FaTelegram, FaInstagram, FaFacebookMessenger, FaTiktok } from 'react-icons/fa';
import { PageLoader } from '../../../components/layout/PageLoader';
import { Dropdown } from '../../../components/ui/Dropdown';
import { Loader } from '../../../components/ui/Loader';
import { AnimatedButton } from '../../../components/ui/AnimatedButton';
import { Modal } from '../../../components/ui/Modal';
import { useNotifications } from '../../../contexts/NotificationContext';

const CONVERSATIONS_PAGE_SIZE = 30;
const MAX_CONVERSATIONS = 200;

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const formatMessageText = (text: string, searchTerm: string) => {
  let html: string;
  if (!searchTerm) {
    html = escapeHtml(text);
  } else {
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = text.split(new RegExp(`(${escapedTerm})`, 'gi')).map(part =>
      part.toLowerCase() === searchTerm.toLowerCase()
        ? `<mark class="bg-amber-300 text-gray-900 rounded-sm px-0.5">${escapeHtml(part)}</mark>`
        : escapeHtml(part)
    ).join('');
  }
  return html
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-extrabold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/~~(.+?)~~/g, '<span class="line-through">$1</span>')
    .replace(/`(.+?)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 rounded text-[11px] font-mono">$1</code>')
    .replace(/\n/g, '<br />');
};

const MessageStatus = ({ status }: { status?: string }) => {
  const statusColors: Record<string, string> = {
    sending: 'text-gray-300 dark:text-gray-600',
    sent: 'text-gray-400 dark:text-gray-500',
    delivered: 'text-gray-400 dark:text-gray-500',
    read: 'text-[#53bdeb]',
    error: 'text-red-500 dark:text-red-400',
  };
  const color = statusColors[status || 'sent'] || statusColors.sent;
  const label = status === 'read' ? 'Leído'
    : status === 'delivered' ? 'Entregado'
    : status === 'error' ? 'Error'
    : status === 'sending' ? 'Enviando'
    : 'Enviado';

  if (status === 'error') return <span title={label} className={`text-[9px] font-bold ${color}`}>Error</span>;
  if (status === 'sending') return <span title={label} className={`text-[9px] font-bold ${color}`}>...</span>;
  if (status === 'read' || status === 'delivered') {
    return <span title={label} className="inline-flex"><CheckCheck className={`w-4 h-4 ${color}`} aria-label={label} /></span>;
  }
  return <span title={label} className="inline-flex"><Check className={`w-3.5 h-3.5 ${color}`} aria-label={label} /></span>;
};

const PreviewIcon = ({ kind }: { kind: 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' | 'contact' | null }) => {
  if (!kind) return null;
  const Icon = kind === 'image' ? Camera
    : kind === 'video' ? Video
    : kind === 'audio' ? Mic
    : kind === 'document' ? Paperclip
    : kind === 'location' ? MapPin
    : kind === 'sticker' ? Sticker
    : User;
  return <Icon className="w-3 h-3 shrink-0" />;
};

const StickerMedia = ({ url, isMe }: { url: string; isMe: boolean }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  if (failed) {
    return (
      <div className={`-mx-5 -mt-3 mb-2 rounded-t-2xl px-4 py-3 flex items-center gap-3 ${isMe ? 'bg-gray-50 dark:bg-white/5' : 'bg-white/15'}`}>
        <Sticker className={`w-5 h-5 flex-shrink-0 ${isMe ? 'text-accent-500' : 'text-white'}`} />
        <span className={`text-xs font-semibold ${isMe ? 'text-gray-600 dark:text-gray-300' : 'text-white'}`}>Sticker no disponible</span>
      </div>
    );
  }

  return (
    <div className={`-mx-5 -mt-3 mb-2 rounded-t-2xl px-4 py-3 flex justify-center ${isMe ? 'bg-gray-50 dark:bg-white/5' : 'bg-white/15'}`}>
      <img
        src={url}
        alt="Sticker"
        className="w-40 h-40 max-w-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
};

const BotStatusIndicator = ({ conv, sizeClass = 'w-3.5 h-3.5' }: { conv: any; sizeClass?: string }) => {
  const state = conv?.contactId?.bot_state || conv?.contactId?.botState || conv?.botState;
  const status = state === 'handoff' ? 'handoff' : typeof state === 'string' && state.startsWith('capture_') ? 'capture' : 'active';
  const icon = status === 'handoff' ? <User className={`${sizeClass} text-red-500`} />
    : status === 'capture' ? <Bot className={`${sizeClass} text-red-500`} />
    : <Bot className={`${sizeClass} text-yellow-400`} />;
  const label = status === 'handoff' ? 'Agente humano atendiendo' : status === 'capture' ? 'Bot en pausa' : 'Bot atendiendo';
  return (
    <span className="relative group inline-flex items-center shrink-0">
      {icon}
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 whitespace-nowrap bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[9px] font-bold px-2 py-1 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {label}
      </span>
    </span>
  );
};

type TemplateVariable = {
  key: string;
  label: string;
  scope: 'header' | 'body' | 'button';
  index: number;
  name?: string;
  buttonIndex?: number;
};

const collectTemplateVariables = (text: string | undefined, scope: TemplateVariable['scope'], buttonIndex?: number): TemplateVariable[] => {
  if (!text) return [];
  const prefix = scope === 'header' ? 'Encabezado' : scope === 'body' ? 'Mensaje' : 'Botón';
  const positionals = new Set<number>();
  const named: string[] = [];
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const token = match[1];
    if (/^\d+$/.test(token)) {
      positionals.add(parseInt(token, 10));
    } else if (!named.includes(token)) {
      named.push(token);
    }
  }

  const positionalVars: TemplateVariable[] = Array.from(positionals)
    .sort((a, b) => a - b)
    .map(index => ({
      key: `${scope}-${buttonIndex ?? ''}-${index}`,
      label: `${prefix} {{${index}}}`,
      scope,
      index,
      buttonIndex,
    }));

  const namedVars: TemplateVariable[] = named.map((name, nameIndex) => ({
    key: `${scope}-${buttonIndex ?? ''}-${name}`,
    label: `${prefix}: ${name}`,
    scope,
    index: nameIndex,
    name,
    buttonIndex,
  }));

  return [...positionalVars, ...namedVars];
};

const extractTemplateVariables = (template: any): TemplateVariable[] => {
  const components = Array.isArray(template?.components) ? template.components : [];
  const variables: TemplateVariable[] = [];

  for (const component of components) {
    const type = String(component?.type || '').toUpperCase();
    if (type === 'HEADER' && String(component?.format || '').toUpperCase() === 'TEXT') {
      variables.push(...collectTemplateVariables(component?.text, 'header'));
    }
    if (type === 'BODY') {
      variables.push(...collectTemplateVariables(component?.text, 'body'));
    }
    if (type === 'BUTTONS' && Array.isArray(component?.buttons)) {
      component.buttons.forEach((button: any, buttonIndex: number) => {
        if (String(button?.type || '').toUpperCase() === 'URL') {
          variables.push(...collectTemplateVariables(button?.url, 'button', buttonIndex));
        }
      });
    }
  }

  return variables;
};

const buildTemplateComponents = (variables: TemplateVariable[], values: Record<string, string>) => {
  // Meta distingue parámetros posicionales ({type:'text'}) de los nombrados
  // ({parameter_name}) según cómo esté escrita la plantilla.
  const parameter = (variable: TemplateVariable) => {
    const text = (values[variable.key] || '').trim();
    return variable.name
      ? { type: 'text', parameter_name: variable.name, text }
      : { type: 'text', text };
  };
  const components: any[] = [];

  const headerVars = variables.filter(v => v.scope === 'header').sort((a, b) => a.index - b.index);
  if (headerVars.length > 0) {
    components.push({ type: 'header', parameters: headerVars.map(parameter) });
  }

  const bodyVars = variables.filter(v => v.scope === 'body').sort((a, b) => a.index - b.index);
  if (bodyVars.length > 0) {
    components.push({ type: 'body', parameters: bodyVars.map(parameter) });
  }

  const buttons = new Map<number, TemplateVariable[]>();
  variables.filter(v => v.scope === 'button').forEach(v => {
    const list = buttons.get(v.buttonIndex!) || [];
    list.push(v);
    buttons.set(v.buttonIndex!, list);
  });
  Array.from(buttons.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([buttonIndex, list]) => {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: String(buttonIndex),
        parameters: list.sort((a, b) => a.index - b.index).map(parameter),
      });
    });

  return components;
};

const buildTemplatePreview = (template: any, variables: TemplateVariable[], values: Record<string, string>) => {
  const body = (Array.isArray(template?.components) ? template.components : [])
    .find((component: any) => String(component?.type || '').toUpperCase() === 'BODY');
  const text = body?.text;
  if (!text) return '';
  return String(text).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match: string, token: string) => {
    const variable = variables.find(v => v.scope === 'body' && (v.name === token || String(v.index) === token));
    return variable ? (values[variable.key] || '').trim() : '';
  });
};

export const Conversations = () => {
  const { addNotification, dismissHandoffAlert } = useNotifications();
  const { id } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);
  const [whatsappConnections, setWhatsappConnections] = useState<{ id: string; display_name: string }[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const conversationsRef = useRef<any[]>([]);
  const nextConversationOffsetRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const loadingListRef = useRef(false);
  const listRequestRef = useRef<AbortController | null>(null);
  const loadMoreRequestRef = useRef<AbortController | null>(null);
  const listRequestIdRef = useRef(0);
  const loadMoreRequestIdRef = useRef(0);
  const lastConversationsHash = useRef('');

  // Catalog integration state
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // Assignment state (real agents from backend)
  const [systemAgents, setSystemAgents] = useState<any[]>([]);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessagesLength = useRef(0);
  const messageVersionRef = useRef('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [liveLocationActive, setLiveLocationActive] = useState(false);
  const liveLocationWatchRef = useRef<number | null>(null);
  const liveLocationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveLocationLastRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [mutedConversations, setMutedConversations] = useState<Set<string>>(new Set());
  const [isChatSearchOpen, setIsChatSearchOpen] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [chatSearchIndex, setChatSearchIndex] = useState(0);
  const chatSearchRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Start New Conversation State
  const [showStartModal, setShowStartModal] = useState(false);
  const [startProvider, setStartProvider] = useState<'baileys' | 'whatsapp_cloud'>('baileys');
  const [startPhone, setStartPhone] = useState('');
  const [startText, setStartText] = useState('');
  const [startCloudConnId, setStartCloudConnId] = useState('');
  const [cloudConnections, setCloudConnections] = useState<any[]>([]);
  const [metaTemplates, setMetaTemplates] = useState<any[]>([]);
  const [loadingMetaTemplates, setLoadingMetaTemplates] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [selectedTemplateLang, setSelectedTemplateLang] = useState('es');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [submittingStart, setSubmittingStart] = useState(false);

  const selectedMetaTemplate = useMemo(() => {
    const byId = selectedTemplateId ? metaTemplates.find(t => t.id === selectedTemplateId) : null;
    return byId || metaTemplates.find(t => t.name === selectedTemplateName) || null;
  }, [metaTemplates, selectedTemplateId, selectedTemplateName]);
  const selectedTemplateVariables = useMemo(
    () => extractTemplateVariables(selectedMetaTemplate),
    [selectedMetaTemplate]
  );

  const openNewConversationModal = async () => {
    setShowStartModal(true);
    setStartPhone('');
    setStartText('');
    setSelectedTemplateName('');
    setTemplateVariables({});
    try {
      const res = await api.get('/platform/connections');
      const conns = (res.data || []).filter((c: any) => c.platform_type === 'whatsapp');
      setCloudConnections(conns);
      if (conns.length > 0) {
        setStartCloudConnId(conns[0].id);
        fetchMetaTemplates(conns[0].id);
      }
    } catch {
      setCloudConnections([]);
    }
  };

  const fetchMetaTemplates = async (connId: string) => {
    if (!connId) return;
    setLoadingMetaTemplates(true);
    setTemplateVariables({});
    try {
      const res = await api.get(`/message-templates/meta-templates?connectionId=${connId}`);
      const templates = Array.isArray(res.data) ? res.data : [];
      setMetaTemplates(templates);
      if (templates.length > 0) {
        setSelectedTemplateId(templates[0].id || '');
        setSelectedTemplateName(templates[0].name);
        setSelectedTemplateLang(templates[0].language || 'es');
      } else {
        setSelectedTemplateId('');
        setSelectedTemplateName('');
      }
    } catch (err: any) {
      console.error('Error loading Meta templates', err);
      setMetaTemplates([]);
      setSelectedTemplateId('');
      setSelectedTemplateName('');
    } finally {
      setLoadingMetaTemplates(false);
    }
  };

  const conversationQuery = useMemo(() => ({
    limit: CONVERSATIONS_PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: filterStatus,
    channel: filterChannel === 'all' ? undefined : filterChannel,
  }), [debouncedSearch, filterStatus, filterChannel]);

  const fetchConversationsList = useCallback(async (force = false) => {
    if (loadingListRef.current && !force) return;
    listRequestRef.current?.abort();
    const requestId = ++listRequestIdRef.current;
    const controller = new AbortController();
    listRequestRef.current = controller;
    loadingListRef.current = true;

    try {
      const data = await getConversations({ ...conversationQuery, offset: 0 }, controller.signal);
      if (controller.signal.aborted || requestId !== listRequestIdRef.current) return;
      const page = Array.isArray(data) ? data : [];
      nextConversationOffsetRef.current = page.length;
      const newHash = JSON.stringify(page.map((conversation: any) => [
        conversation._id,
        conversation.lastMessageAt,
        conversation.lastMessageContent,
        conversation.unreadCount,
        conversation.hasReplied,
        conversation.status,
        conversation.botState,
        conversation.assignedTo,
        conversation.contactId?.name,
        conversation.contactId?.tags,
      ]));

      if (!force && newHash === lastConversationsHash.current) {
        setLoading(false);
        return;
      }
      lastConversationsHash.current = newHash;
      setConversations(current => {
        const merged = new Map(current.map(conversation => [conversation._id, conversation]));
        page.forEach(conversation => merged.set(conversation._id, conversation));
        return Array.from(merged.values()).sort((a, b) =>
          new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
        );
      });
      setHasMoreConversations(page.length === CONVERSATIONS_PAGE_SIZE && nextConversationOffsetRef.current < MAX_CONVERSATIONS);
    } catch (error: any) {
      if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
        console.error('Failed to load conversations', error);
      }
    } finally {
      if (requestId === listRequestIdRef.current) {
        loadingListRef.current = false;
        setLoading(false);
      }
    }
  }, [conversationQuery]);

  const loadMoreConversations = useCallback(async () => {
    if (loadingListRef.current || loadingMoreRef.current || !hasMoreConversations) return;
    const offset = nextConversationOffsetRef.current;
    if (offset >= MAX_CONVERSATIONS) {
      setHasMoreConversations(false);
      return;
    }

    loadMoreRequestRef.current?.abort();
    const requestId = ++loadMoreRequestIdRef.current;
    const controller = new AbortController();
    loadMoreRequestRef.current = controller;
    loadingMoreRef.current = true;
    setLoadingMoreConversations(true);
    try {
      const data = await getConversations({ ...conversationQuery, offset }, controller.signal);
      if (controller.signal.aborted || requestId !== loadMoreRequestIdRef.current) return;
      const page = Array.isArray(data) ? data : [];
      setConversations(current => {
        const seen = new Set(current.map(conversation => conversation._id));
        return [...current, ...page.filter(conversation => !seen.has(conversation._id))];
      });
      const nextOffset = offset + page.length;
      nextConversationOffsetRef.current = nextOffset;
      setHasMoreConversations(page.length === CONVERSATIONS_PAGE_SIZE && nextOffset < MAX_CONVERSATIONS);
    } catch (error: any) {
      if (error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
        console.error('Failed to load more conversations', error);
      }
    } finally {
      if (requestId === loadMoreRequestIdRef.current) {
        loadingMoreRef.current = false;
        setLoadingMoreConversations(false);
      }
    }
  }, [conversationQuery, hasMoreConversations]);

  const handleConversationsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      void loadMoreConversations();
    }
  };

  const handleStartConversationSubmit = async () => {
    if (!startPhone.trim()) {
      addNotification({ type: 'error', title: 'Teléfono requerido', message: 'Ingresa el número de teléfono.' });
      return;
    }

    if (startProvider === 'whatsapp_cloud' && !selectedTemplateName) {
      addNotification({ type: 'error', title: 'Template requerido', message: 'Selecciona una plantilla aprobada por Meta.' });
      return;
    }

    if (startProvider === 'baileys' && !startText.trim()) {
      addNotification({ type: 'error', title: 'Mensaje requerido', message: 'Escribe un mensaje inicial.' });
      return;
    }

    const missingVariable = selectedTemplateVariables.find(v => !(templateVariables[v.key] || '').trim());
    if (startProvider === 'whatsapp_cloud' && missingVariable) {
      addNotification({
        type: 'error',
        title: 'Variable requerida',
        message: `Completa el valor de ${missingVariable.label} para enviar la plantilla.`
      });
      return;
    }

    setSubmittingStart(true);
    try {
      const payload = {
        phoneNumber: startPhone.trim(),
        text: startText.trim(),
        templateName: selectedTemplateName,
        languageCode: selectedTemplateLang,
        components: startProvider === 'whatsapp_cloud'
          ? buildTemplateComponents(selectedTemplateVariables, templateVariables)
          : [],
        templatePreview: startProvider === 'whatsapp_cloud'
          ? buildTemplatePreview(selectedMetaTemplate, selectedTemplateVariables, templateVariables)
          : '',
        connectionId: startCloudConnId,
        provider: startProvider
      };

      const res = await api.post('/conversations/start', payload);
      addNotification({ type: 'success', title: 'Conversación iniciada', message: 'El mensaje ha sido enviado correctamente.' });
      setShowStartModal(false);
      setTemplateVariables({});

      const conversationId = res.data?.conversation?.id;
      if (conversationId) {
        setShowMobileChat(true);
        navigate(`/conversations/${conversationId}`);
      }
      await fetchConversationsList();
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error al iniciar', message: err.response?.data?.error || err.message });
    } finally {
      setSubmittingStart(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return { prefix: '', number: '' };

    // Convertir a string y limpiar espacios y caracteres especiales
    let cleanPhone = String(phone).trim();

    // Eliminar caracteres comunes de WhatsApp (como @c.us, @s.whatsapp.net, etc.)
    cleanPhone = cleanPhone.replace(/@c\.us$/i, '');
    cleanPhone = cleanPhone.replace(/@s\.whatsapp\.net$/i, '');
    cleanPhone = cleanPhone.replace(/@g\.us$/i, '');
    cleanPhone = cleanPhone.replace(/@whatsapp\.net$/i, '');

    // Eliminar cualquier otro carácter no numérico excepto el +
    cleanPhone = cleanPhone.replace(/[^\d+]/g, '');

    // Si el número está vacío después de limpiar
    if (!cleanPhone) return { prefix: '', number: '' };

    // Códigos de país comunes (ISO 3166-1)
    const countryCodes = ['1', '7', '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '88', '91', '92', '93', '94', '95', '98'];

    // Detectar si tiene prefijo internacional (+)
    if (cleanPhone.startsWith('+')) {
      const match = cleanPhone.match(/^\+(\d{1,3})(.*)$/);
      if (match) {
        const potentialPrefix = match[1];
        // Verificar si es un código de país válido
        if (countryCodes.includes(potentialPrefix)) {
          return {
            prefix: '+' + potentialPrefix,
            number: match[2].trim()
          };
        }
        // Si no es código de país conocido, intentar con 2 dígitos
        if (potentialPrefix.length === 3) {
          const twoDigitPrefix = potentialPrefix.substring(0, 2);
          if (countryCodes.includes(twoDigitPrefix)) {
            return {
              prefix: '+' + twoDigitPrefix,
              number: potentialPrefix.substring(2) + match[2].trim()
            };
          }
        }
      }
    }

    // Intentar detectar prefijo sin + (ej: 51 para Perú, 1 para USA, etc.)
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      // Intentar coincidir con códigos de país conocidos
      for (const code of countryCodes.sort((a, b) => b.length - a.length)) {
        if (digitsOnly.startsWith(code)) {
          const remainingLength = digitsOnly.length - code.length;
          // Verificar que el número restante tenga longitud razonable (8-10 dígitos)
          if (remainingLength >= 8 && remainingLength <= 10) {
            return {
              prefix: '+' + code,
              number: digitsOnly.substring(code.length)
            };
          }
        }
      }
    }

    // Si no tiene prefijo detectado, asumir formato local
    return {
      prefix: '',
      number: cleanPhone
    };
  };

  const getRealPhoneNumber = (contact: any) => {
    // Intentar obtener el número real de múltiples campos posibles
    let realPhone = contact.phoneNumber;

    // Si phoneNumber parece un ID (muy largo), buscar en otros campos
    if (!realPhone || realPhone.length > 15) {
      realPhone = contact.phone || contact.contactPhone || contact.mobile || contact.cell || contact.whatsappNumber || contact.waNumber;
    }

    // Si aún no hay número válido, usar el ID como fallback
    if (!realPhone) {
      realPhone = contact.phoneNumber || contact.id;
    }

    // Si parece un ID largo (LID de WhatsApp @lid) y no corresponde a un número real, no mostrarlo
    const digitsOnly = (realPhone || '').replace(/\D/g, '');
    const looksLikeLid = digitsOnly.length > 15 || (realPhone || '').length > 15;
    if (looksLikeLid) return '';

    return realPhone;
  };

  useEffect(() => {
    if (messages.length > lastMessagesLength.current || isNearBottom()) {
      scrollToBottom();
    }
    lastMessagesLength.current = messages.length;
  }, [messages]);

  const selectedConversationId = selectedConv?._id;

  useEffect(() => {
    lastMessagesLength.current = 0;
    setChatSearchTerm('');
    setChatSearchIndex(0);
    setIsChatSearchOpen(false);
  }, [selectedConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadMoreRequestRef.current?.abort();
    loadMoreRequestIdRef.current += 1;
    loadingMoreRef.current = false;
    setLoadingMoreConversations(false);
    setConversations([]);
    setHasMoreConversations(true);
    nextConversationOffsetRef.current = 0;
    lastConversationsHash.current = '';
    if (conversationsRef.current.length === 0) setLoading(true);
    void fetchConversationsList(true);

    let interval: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => {
      if (document.hidden) return;
      void fetchConversationsList();
      interval = setInterval(() => void fetchConversationsList(), 8000);
    };
    const onVisibility = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
        interval = undefined;
      } else if (!interval) {
        startPolling();
      }
    };
    startPolling();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      listRequestRef.current?.abort();
      listRequestIdRef.current += 1;
      loadingListRef.current = false;
    };
  }, [fetchConversationsList]);

  useEffect(() => {
    if (!id || debouncedSearch || filterStatus !== 'all' || filterChannel !== 'all' || conversationsRef.current.some(candidate => candidate._id === id)) return;
    const controller = new AbortController();
    void getConversations({ limit: 1, conversationId: id }, controller.signal)
      .then(data => {
        const conversation = Array.isArray(data) ? data[0] : null;
        if (!conversation || controller.signal.aborted) return;
        setConversations(current => [conversation, ...current.filter(candidate => candidate._id !== id)]);
      })
      .catch(() => { });
    return () => controller.abort();
  }, [id, debouncedSearch, filterStatus, filterChannel]);

  useEffect(() => {
    if (!id) return;
    const conversation = conversations.find(candidate => candidate._id === id);
    if (!conversation) return;
    setSelectedConv(conversation);
    if (selectedConversationId !== id) {
      setTagInput('');
      setShowMobileChat(true);
    }
  }, [id, conversations, selectedConversationId]);

  useEffect(() => {
    api.get('/multi-whatsapp/connections').then(res => {
      if (Array.isArray(res.data)) {
        setWhatsappConnections(res.data);
        const active = res.data.find((c: any) => c.status === 'connected');
        if (active) setSelectedConnectionId(active.id);
      }
    }).catch(() => { });
  }, []);

  // Cargar los agentes reales del equipo para la asignación de conversaciones
  useEffect(() => {
    getTeamUsers()
      .then(agents => setSystemAgents(Array.isArray(agents) ? agents : []))
      .catch(err => console.error('Error fetching team agents:', err));
  }, []);

  const filteredConversations = conversations;

  useEffect(() => {
    if (!selectedConversationId) {
      messageVersionRef.current = '';
      return;
    }

    const controller = new AbortController();
    let active = true;
    let polling = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    messageVersionRef.current = '';
    setMessages([]);

    const versionFor = (items: any[]) => {
      const latest = items[items.length - 1];
      return latest ? `${latest.createdAt}|${latest._id}|${latest.status || ''}` : '';
    };

    const loadMessages = async () => {
      const result = await getConversationMessages(selectedConversationId, { markRead: true, signal: controller.signal });
      if (!active || controller.signal.aborted) return;
      const items = Array.isArray(result.messages) ? result.messages : [];
      messageVersionRef.current = `${versionFor(items)}|e:${result.eventVersion || 0}`;
      setMessages(items);
    };

    const pollUpdates = async () => {
      if (!active || polling || document.hidden) return;
      polling = true;
      let retryDelay = 0;
      try {
        const update = await getConversationMessageUpdates(selectedConversationId, messageVersionRef.current, controller.signal);
        if (!active || controller.signal.aborted) return;
        if (update.changed) await loadMessages();
        else if (update.version) messageVersionRef.current = update.version;
      } catch (error: any) {
        if (!active || controller.signal.aborted || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
        console.error('Failed to load message updates', error);
        retryDelay = 3000;
      } finally {
        polling = false;
        if (active && !document.hidden) {
          retryTimer = setTimeout(() => void pollUpdates(), retryDelay);
        }
      }
    };

    const onVisibility = () => {
      if (!document.hidden && !polling) void pollUpdates();
    };

    void loadMessages()
      .then(() => {
        if (active && !document.hidden) void pollUpdates();
      })
      .catch((error: any) => {
        if (active && error?.name !== 'CanceledError' && error?.code !== 'ERR_CANCELED') {
          console.error('Failed to load messages', error);
          retryTimer = setTimeout(() => void pollUpdates(), 3000);
        }
      });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [selectedConversationId]);

  const fetchCatalogs = async () => {
    if (catalogs.length > 0) return;
    try {
      setLoadingCatalogs(true);
      const data = await getCatalogs();
      setCatalogs(data);
    } catch (error) {
      console.error('Failed to load catalogs', error);
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const toggleCatalog = () => {
    if (!isCatalogOpen) {
      fetchCatalogs();
    }
    setIsCatalogOpen(!isCatalogOpen);
  };

  const handleSelectProduct = async (item: any) => {
    if (!selectedConv || sending) return;
    setIsCatalogOpen(false);

    const productText = `*${item.title}*\n${item.description ? item.description + '\n' : ''}${item.price ? 'Precio: ' + item.price + '\n' : ''}${item.url ? 'Enlace: ' + item.url : ''}`;

    setSending(true);

    const optimistic = {
      _id: `tmp-${Date.now()}`,
      direction: 'outbound',
      content: item.media_url ? { url: item.media_url, caption: productText } : productText,
      createdAt: new Date().toISOString(),
      type: item.media_url ? 'image' : 'text',
      status: 'sending'
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const response = await api.post(`/conversations/${selectedConv._id}/send`, {
        text: productText,
        mediaUrl: item.media_url,
        mediaType: 'image',
        whatsapp_connection_id: selectedConnectionId || undefined,
      });
      setMessages(prev => prev.map(m => m._id === optimistic._id ? response.data : m));
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      const errMsg = err.response?.data?.error || 'Error al enviar el producto. Verifica la conexión.';
      addNotification({ type: 'error', title: 'Error', message: errMsg });
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Grabar en el mejor formato de CAPTURA del navegador (webm/opus es el
      // más fiable en Chrome; ogg/opus en Firefox). El backend convierte después
      // a ogg/opus, que es el formato que WhatsApp entrega como nota de voz.
      // No forcemos audio/mp4 para grabar: en algunos navegadores captura audio
      // casi vacío (header válido pero duración ~0s).
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mp4;codecs=mp4a.40.2']
        .find(t => MediaRecorder.isTypeSupported(t));
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        if (!selectedConv) return;

        // Evitar notas de voz vacías: WhatsApp descarta (failed) audios que
        // duran menos de ~500ms. No enviar y avisar al usuario.
        const elapsedMs = Date.now() - recordingStartedAtRef.current;
        if (elapsedMs < 500) {
          audioChunksRef.current = [];
          addNotification({ type: 'error', title: 'Audio demasiado corto', message: 'Mantén la grabación al menos un segundo.' });
          return;
        }
        if (audioBlob.size === 0) return;

        const optimistic = {
          _id: `tmp-${Date.now()}`,
          direction: 'outbound',
          content: JSON.stringify({ url: URL.createObjectURL(audioBlob), type: 'audio' }),
          createdAt: new Date().toISOString(),
          type: 'audio',
          status: 'sending'
        };
        setMessages(prev => [...prev, optimistic]);

        // Leer el audio como base64 (data URL) y enviarlo por JSON, igual que
        // fotos/documentos. El backend lo sube a Graph API y lo envía por id.
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          try {
            const response = await api.post(`/conversations/${selectedConv._id}/send`, {
              mediaUrl: dataUrl,
              mediaType: 'audio',
              caption: '',
              whatsapp_connection_id: selectedConnectionId || undefined,
            });
            setMessages(prev => prev.map(m => m._id === optimistic._id ? response.data : m));
          } catch {
            setMessages(prev => prev.filter(m => m._id !== optimistic._id));
            addNotification({ type: 'error', title: 'Error', message: 'Error al enviar el audio.' });
          }
        };
        reader.onerror = () => {
          setMessages(prev => prev.filter(m => m._id !== optimistic._id));
          addNotification({ type: 'error', title: 'Error', message: 'No se pudo leer el audio.' });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      recordingStartedAtRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo acceder al micrófono.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    audioChunksRef.current = [];
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const getTagColor = (tag: string) => {
    const colors = [
      'bg-accent-500/10 text-accent-600 dark:text-accent-400',
      'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getConvTags = (conv: any): string[] => {
    const convTags = Array.isArray(conv?.tags) ? conv.tags : [];
    const contactTags = Array.isArray(conv?.contactId?.tags) ? conv.contactId.tags : [];
    return Array.from(
      new Set([...convTags, ...contactTags].map((t: any) => String(t ?? '').trim()).filter(Boolean))
    ).slice(0, 20);
  };

  const persistConversationTags = async (nextTags: string[]) => {
    if (!selectedConv?._id) return;
    const conversationId = selectedConv._id;
    const safeTags = Array.from(new Set(nextTags.map((t) => t.trim()).filter(Boolean))).slice(0, 20);
    setSavingTags(true);
    try {
      await updateConversationTags(conversationId, safeTags);
      setSelectedConv((prev: any) => {
        if (prev?._id !== conversationId) return prev;
        return {
          ...prev,
          tags: safeTags,
          contactId: prev.contactId ? { ...prev.contactId, tags: safeTags } : prev.contactId,
        };
      });
      setConversations((prev) => prev.map((c) => (
        c._id === conversationId
          ? { ...c, tags: safeTags, contactId: c.contactId ? { ...c.contactId, tags: safeTags } : c.contactId }
          : c
      )));
    } catch (error) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudieron guardar las etiquetas.' });
    } finally {
      setSavingTags(false);
    }
  };

  const handleAddTag = async () => {
    if (!selectedConv) return;
    const value = tagInput.trim();
    if (!value) return;
    const current = getConvTags(selectedConv);
    if (current.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTagInput('');
      return;
    }
    await persistConversationTags([...current, value]);
    setTagInput('');
  };

  const handleRemoveTag = async (tag: string) => {
    if (!selectedConv) return;
    const current = getConvTags(selectedConv);
    await persistConversationTags(current.filter((t) => t !== tag));
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const EMOJIS = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '💪', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '🔥', '⭐', '✨', '💯', '🎉', '🎊', '🥳', '🎈', '🎁', '💡', '📌', '📍', '💀', '☠️', '👋', '🤚', '🖐️', '✋', '🖖', '🖕', '🤙', '💅'];

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleAttachFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv || sending) return;

    const localUrl = URL.createObjectURL(file);
    const mediaType = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video'
      : file.type.startsWith('audio/') ? 'audio'
      : 'document';

    setSending(true);

    const optimistic = {
      _id: `tmp-${Date.now()}`,
      direction: 'outbound',
      content: JSON.stringify({ url: localUrl, type: mediaType, filename: file.name }),
      createdAt: new Date().toISOString(),
      type: mediaType,
      status: 'sending'
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      // Leer el archivo como base64 (data URL) y enviarlo por JSON.
      // Cloud API no acepta base64 como URL, así que el backend lo sube a
      // Graph API para obtener un media_id y lo envía.
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        try {
          const response = await api.post(`/conversations/${selectedConv._id}/send`, {
            mediaUrl: dataUrl,
            mediaType,
            caption: '',
            filename: file.name || `archivo-${Date.now()}`,
            whatsapp_connection_id: selectedConnectionId || undefined,
          });
          setMessages(prev => prev.map(m => m._id === optimistic._id ? response.data : m));
        } catch (err: any) {
          setMessages(prev => prev.filter(m => m._id !== optimistic._id));
          const errMsg = err.response?.data?.error || 'Error al enviar el archivo. Verifica la conexión.';
          addNotification({ type: 'error', title: 'Error', message: errMsg });
        }
      };
      reader.onerror = () => {
        setMessages(prev => prev.filter(m => m._id !== optimistic._id));
        addNotification({ type: 'error', title: 'Error', message: 'No se pudo leer el archivo.' });
      };
      reader.readAsDataURL(file);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleMuteConversation = (convId: string) => {
    const isMuted = mutedConversations.has(convId);
    setMutedConversations(prev => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
    setIsChatMenuOpen(false);
    setIsMenuOpen(false);
    addNotification({ type: 'success', title: isMuted ? 'Silencio desactivado' : 'Conversación silenciada', message: '' });
  };

  const [blockedContacts, setBlockedContacts] = useState<Set<string>>(new Set());

  const handleBlockContact = (contactId?: string) => {
    if (!contactId) return;
    setBlockedContacts(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
        return next;
      }
      next.add(contactId);
      return next;
    });
    setIsChatMenuOpen(false);
    setIsMenuOpen(false);
    const isBlocked = blockedContacts.has(contactId || '');
    addNotification({ type: 'success', title: isBlocked ? 'Contacto desbloqueado' : 'Contacto bloqueado', message: '' });
  };

  const handleSearchInChat = () => {
    setIsChatSearchOpen(true);
    setChatSearchTerm('');
    setChatSearchIndex(0);
    setIsChatMenuOpen(false);
    setIsMenuOpen(false);
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder="Buscar..."]');
      input?.focus();
    }, 100);
  };

  const parseMessage = (content: any): string => {
    if (!content) return '';
    try {
      let parsed = content;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
          // Handle double stringification
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }
        } catch {
          // If it fails to parse, it's likely just plain text
          // (or a very malformed JSON string, which we just return as is)
        }
      }

      if (typeof parsed === 'string') return parsed;

      if (parsed && typeof parsed === 'object') {
        const body = parsed.body ||
          parsed.bodyText ||
          (typeof parsed.text === 'string' ? parsed.text : parsed.text?.body) ||
          parsed.conversation ||
          parsed.caption ||
          parsed.extendedTextMessage?.text ||
          parsed.interactive?.button_reply?.title ||
          parsed.interactive?.list_reply?.title ||
          (typeof parsed.message === 'string' ? parsed.message : parsed.message?.conversation || parsed.message?.extendedTextMessage?.text) ||
          parsed.response ||
          parsed.answer ||
          parsed.botMessage ||
          parsed.msg ||
          parsed.content;

        if (body && typeof body === 'string') return body;

        // If it's a media message without a text body
        if (parsed.url || parsed.imageMessage || parsed.videoMessage || parsed.documentMessage || parsed.media) return '';
        
        // Fallback for simple single-key objects from bot
        const keys = Object.keys(parsed);
        if (keys.length === 1 && typeof parsed[keys[0]] === 'string') {
            return parsed[keys[0]];
        }
      }

      return '';
    } catch {
      return typeof content === 'string' ? content : '';
    }
  };

  type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'sticker';

  const parseContentObject = (content: any): any => {
    if (!content) return null;
    if (typeof content !== 'string') return content;
    try {
      let parsed = JSON.parse(content);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      return parsed;
    } catch {
      return null;
    }
  };

  const mediaKindFrom = (mimeType?: string, hint?: string): MediaKind => {
    const mime = (mimeType || '').toLowerCase();
    if ((hint || '').toLowerCase() === 'sticker') return 'sticker';
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('application/') || mime.startsWith('text/')) return 'document';
    const h = (hint || '').toLowerCase();
    if (h === 'image' || h === 'video' || h === 'audio' || h === 'document' || h === 'sticker') return h;
    if (h === 'media') return 'image';
    return 'image';
  };

  const isStickerMessage = (content: any): boolean => {
    const parsed = parseContentObject(content);
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.type === 'sticker' || parsed.sticker || parsed.stickerMessage) return true;
    return parsed.media?.type === 'sticker';
  };

  type PreviewKind = 'image' | 'video' | 'audio' | 'document' | 'location' | 'sticker' | 'contact' | null;

  // Vista previa del último mensaje en la lista: si el mensaje no tiene texto
  // (solo media), se muestra una etiqueta en lugar de dejarlo vacío, junto con
  // un icono del tipo de contenido (estilo WhatsApp).
  const getConversationPreview = (content: any): { text: string; kind: PreviewKind } => {
    const text = parseMessage(content);
    const parsed = parseContentObject(content);
    if (parsed && typeof parsed === 'object') {
      if (parsed.type === 'location' || parsed.location) return { text: 'Ubicación', kind: 'location' };
      if (parsed.type === 'contact' || parsed.contacts) return { text: 'Contacto', kind: 'contact' };
      if (text) return { text, kind: null };
      const hasMedia = parsed.url || parsed.media || parsed.imageMessage || parsed.videoMessage
        || parsed.audioMessage || parsed.documentMessage || parsed.stickerMessage || parsed.sticker;
      if (!hasMedia) return { text, kind: null };
      if (isStickerMessage(parsed)) return { text: 'Sticker', kind: 'sticker' };
      const kind = mediaKindFrom(parsed.mime_type || parsed.mimeType, parsed.media?.type || parsed.type);
      if (kind === 'video') return { text: 'Video', kind: 'video' };
      if (kind === 'audio') return { text: 'Audio', kind: 'audio' };
      if (kind === 'document') return { text: parsed.filename ? `Documento: ${parsed.filename}` : 'Documento', kind: 'document' };
      return { text: 'Foto', kind: 'image' };
    }
    return { text, kind: null };
  };

  const getMessageMedia = (content: any): { url: string; type: MediaKind; filename?: string; caption?: string } | null => {
    const parsed = parseContentObject(content);
    if (!parsed || typeof parsed !== 'object') {
      if (typeof content === 'string') {
        const match = content.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp|mp4|ogg|mp3|pdf)/i);
        if (match) {
          const ext = match[1].toLowerCase();
          const type: MediaKind = ['mp4'].includes(ext) ? 'video' : ['ogg', 'mp3'].includes(ext) ? 'audio' : ['pdf'].includes(ext) ? 'document' : 'image';
          return { url: match[0], type };
        }
      }
      return null;
    }

    const candidates: Array<[any, string | undefined]> = [
      [parsed.media, parsed.media?.type || parsed.type],
      [parsed.imageMessage, 'image'],
      [parsed.videoMessage, 'video'],
      [parsed.audioMessage, 'audio'],
      [parsed.documentMessage, 'document'],
      [parsed.stickerMessage, 'sticker'],
      [parsed.sticker, 'sticker'],
      [parsed.image, 'image'],
      [parsed.video, 'video'],
      [parsed.audio, 'audio'],
      [parsed.document, 'document'],
      [parsed.raw?.imageMessage, 'image'],
      [parsed.raw?.videoMessage, 'video'],
      [parsed.raw?.audioMessage, 'audio'],
      [parsed.raw?.documentMessage, 'document'],
      [parsed.raw?.stickerMessage, 'sticker'],
      [parsed.raw?.sticker, 'sticker'],
      [parsed.raw?.image, 'image'],
      [parsed.raw?.video, 'video'],
      [parsed.raw?.audio, 'audio'],
      [parsed.raw?.document, 'document'],
    ];

    for (const [media, hint] of candidates) {
      const url = media?.url || media?.link;
      if (typeof url === 'string' && url) {
        return {
          url,
          type: mediaKindFrom(media?.mimetype || media?.mime_type, hint),
          filename: media?.filename || media?.fileName || parsed.filename,
          caption: media?.caption || parsed.caption,
        };
      }
    }

    if (typeof parsed.url === 'string' && parsed.url) {
      return {
        url: parsed.url,
        type: mediaKindFrom(parsed.mime_type || parsed.mimetype, parsed.type),
        filename: parsed.filename || parsed.fileName,
        caption: parsed.caption,
      };
    }

    return null;
  };

  const getMessageLocation = (content: any): { latitude: number; longitude: number; name?: string; address?: string } | null => {
    const parsed = parseContentObject(content);
    if (!parsed || typeof parsed !== 'object') return null;
    const loc = parsed.location || parsed.locationMessage || parsed.raw?.location || parsed.raw?.locationMessage;
    if (!loc) return null;
    const latitude = loc.latitude ?? loc.degreesLatitude;
    const longitude = loc.longitude ?? loc.degreesLongitude;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return { latitude, longitude, name: loc.name, address: loc.address };
  };

  const parseButtons = (content: any): { id: string; text: string }[] => {
    if (!content) return [];
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      let buttons: { id: string; text: string }[] = [];
      if (parsed?.buttons && Array.isArray(parsed.buttons) && parsed.buttons.length > 0) {
        buttons = parsed.buttons.map((b: any, i: number) => ({
          id: b.id || `btn_${i}`,
          text: b.text || b.title || `Opción ${i + 1}`,
        }));
      }
      // Mostrar la opción automática "↩ Volver" cuando el bot la incluye
      if (parsed?.buttonMapping?.btn_back && !buttons.some((b) => b.id === 'btn_back')) {
        buttons.push({ id: 'btn_back', text: '↩ Volver' });
      }
      return buttons;
    } catch {
      return [];
    }
  };

  const isNumericButtons = (content: any): boolean => {
    if (!content) return false;
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      return !!parsed?.isNumericButtons;
    } catch {
      return false;
    }
  };

  const handleBotButtonClick = async (button: { id: string; text: string; number?: string }) => {
    if (!selectedConv || sending) return;
    setMessageText('');
    setSending(true);

    // Cuando el bot envió opciones numeradas como texto (>3), el cliente
    // responde con el número de la opción, no con el texto.
    const replyText = button.number ?? button.text;

    const optimistic = {
      _id: `tmp-${Date.now()}`,
      direction: 'outbound',
      content: replyText,
      createdAt: new Date().toISOString(),
      type: 'text',
      status: 'sending',
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await api.post(`/conversations/${selectedConv._id}/send`, {
        text: replyText,
        whatsapp_connection_id: selectedConnectionId || undefined,
      });
      setMessages((prev) => prev.map((m) => (m._id === optimistic._id ? response.data : m)));
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      addNotification({ type: 'error', title: 'Error', message: err?.response?.data?.error || 'No se pudo enviar la respuesta.' });
    } finally {
      setSending(false);
    }
  };

  const conversationPreviews = useMemo(() => new Map(
    conversations.map(conversation => [conversation._id, getConversationPreview(conversation.lastMessageContent)])
  ), [conversations]);

  const messageRenderData = useMemo(() => messages.map(message => ({
    body: parseMessage(message.content),
    media: getMessageMedia(message.content),
    sticker: isStickerMessage(message.content),
    location: getMessageLocation(message.content),
    buttons: parseButtons(message.content),
    numericButtons: isNumericButtons(message.content),
  })), [messages]);

  const chatSearchResults = useMemo(() => {
    const term = chatSearchTerm.trim().toLowerCase();
    if (!term) return [];
    return messageRenderData
      .map((rendered, index) => ({ index, body: rendered.body }))
      .filter(({ body }) => body.toLowerCase().includes(term));
  }, [messageRenderData, chatSearchTerm]);

  const goToChatSearchResult = (dir: 'next' | 'prev') => {
    if (chatSearchResults.length === 0) return;
    const next = dir === 'next'
      ? (chatSearchIndex + 1) % chatSearchResults.length
      : (chatSearchIndex - 1 + chatSearchResults.length) % chatSearchResults.length;
    setChatSearchIndex(next);
    const idx = chatSearchResults[next]?.index;
    if (idx !== undefined && chatSearchRefs.current[idx]) {
      chatSearchRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  useEffect(() => {
    chatSearchRefs.current = chatSearchRefs.current.slice(0, messages.length);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConv || sending) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    const optimistic = {
      _id: `tmp-${Date.now()}`,
      direction: 'outbound',
      content: text,
      createdAt: new Date().toISOString(),
      type: 'text',
      status: 'sending'
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const response = await api.post(`/conversations/${selectedConv._id}/send`, { text, whatsapp_connection_id: selectedConnectionId || undefined });
      setMessages(prev => prev.map(m => m._id === optimistic._id ? response.data : m));
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      const errMsg = err.response?.data?.error || 'Error al enviar el mensaje. Verifica la conexión.';
      addNotification({ type: 'error', title: 'Error', message: errMsg });
    } finally {
      setSending(false);
    }
  };

  // Envía una ubicación al contacto. Con WhatsApp Cloud API no existe un
  // mensaje de "ubicación en vivo" (solo estática), así que el modo en tiempo
  // real reenvía la posición actualizada cada minuto como mensajes de ubicación.
  const sendLocation = async (location: { latitude: number; longitude: number; name?: string; address?: string }) => {
    if (!selectedConv || sending) return;
    setSending(true);

    const optimistic = {
      _id: `tmp-${Date.now()}`,
      direction: 'outbound',
      content: {
        type: 'location',
        location: {
          ...location,
          url: `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
        },
      },
      createdAt: new Date().toISOString(),
      type: 'location',
      status: 'sending'
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const response = await api.post(`/conversations/${selectedConv._id}/send`, {
        location,
        whatsapp_connection_id: selectedConnectionId || undefined,
      });
      setMessages(prev => prev.map(m => m._id === optimistic._id ? response.data : m));
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      addNotification({ type: 'error', title: 'Error', message: err.response?.data?.error || 'No se pudo enviar la ubicación.' });
    } finally {
      setSending(false);
    }
  };

  const handleSendCurrentLocation = () => {
    setIsLocationMenuOpen(false);
    if (!selectedConv) return;
    if (!navigator.geolocation) {
      addNotification({ type: 'error', title: 'Ubicación no disponible', message: 'Este navegador no soporta geolocalización.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void sendLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          name: 'Mi ubicación actual',
          address: '',
        });
      },
      () => addNotification({ type: 'error', title: 'Ubicación no disponible', message: 'No se pudo obtener tu ubicación. Revisa los permisos del navegador.' }),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const stopLiveLocation = () => {
    if (liveLocationWatchRef.current != null) {
      navigator.geolocation.clearWatch(liveLocationWatchRef.current);
      liveLocationWatchRef.current = null;
    }
    if (liveLocationTimerRef.current) {
      clearInterval(liveLocationTimerRef.current);
      liveLocationTimerRef.current = null;
    }
    liveLocationLastRef.current = null;
    setLiveLocationActive(false);
  };

  const startLiveLocation = () => {
    setIsLocationMenuOpen(false);
    if (!selectedConv) return;
    if (!navigator.geolocation) {
      addNotification({ type: 'error', title: 'Ubicación no disponible', message: 'Este navegador no soporta geolocalización.' });
      return;
    }
    if (liveLocationActive) return;

    const sendLatest = () => {
      const coords = liveLocationLastRef.current;
      if (!coords) return;
      void sendLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        name: 'Ubicación en tiempo real',
        address: '',
      });
    };

    liveLocationWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        liveLocationLastRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setLiveLocationActive(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        liveLocationLastRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        sendLatest();
      },
      () => addNotification({ type: 'error', title: 'Ubicación no disponible', message: 'No se pudo obtener tu ubicación. Revisa los permisos del navegador.' }),
      { enableHighAccuracy: true, timeout: 15000 }
    );

    liveLocationTimerRef.current = setInterval(sendLatest, 60000);
    addNotification({ type: 'success', title: 'Ubicación en tiempo real', message: 'Se enviará tu posición actualizada cada minuto.' });
  };

  useEffect(() => () => {
    if (liveLocationWatchRef.current != null) navigator.geolocation.clearWatch(liveLocationWatchRef.current);
    if (liveLocationTimerRef.current) clearInterval(liveLocationTimerRef.current);
  }, []);

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string, contactId?: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(conversationId);
      if (contactId) {
        await deleteUser(contactId);
      }
      dismissHandoffAlert(conversationId);
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      if (selectedConv?._id === conversationId) setSelectedConv(null);
    } catch (err) {
      console.error('Failed to delete', err);
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo eliminar. Inténtalo de nuevo.' });
    }
  };

  // Estado del bot para este contacto: 'handoff' | 'capture' | 'active'
  const getBotStatus = (conv: any): 'handoff' | 'capture' | 'active' => {
    const state = conv?.contactId?.bot_state || conv?.contactId?.botState || conv?.botState;
    if (state === 'handoff') return 'handoff';
    if (typeof state === 'string' && state.startsWith('capture_')) return 'capture';
    return 'active';
  };

  const isBotPaused = (conv: any) => getBotStatus(conv) !== 'active';

  const handleReactivateBot = async () => {
    if (!selectedConv) return;
    setIsChatMenuOpen(false);
    setIsMenuOpen(false);
    try {
      await api.post(`/conversations/${selectedConv._id}/reactivate-bot`);
      dismissHandoffAlert(selectedConv._id);
      if (selectedConv.contactId) {
        selectedConv.contactId.bot_state = null;
        selectedConv.contactId.botState = null;
        selectedConv.contactId.custom_attributes = { ...(selectedConv.contactId.custom_attributes || {}), flow_history: [] };
      }
      addNotification({ type: 'success', title: 'Bot reactivado', message: 'El bot volverá a responder a este contacto.' });
      // Actualizar de inmediato el listado y el header (el bot queda "atendiendo" → amarillo)
      setConversations(prev => prev.map(c =>
        c._id === selectedConv._id
          ? { ...c, botState: 'main_menu', contactId: { ...(c.contactId || {}), bot_state: null, botState: null } }
          : c
      ));
      setSelectedConv({ ...selectedConv, botState: 'main_menu', bot_state: null, contactId: { ...(selectedConv.contactId || {}), bot_state: null, botState: null } });
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo reactivar el bot.' });
    }
  };


  const getAgentName = (agent: any) => {
    return agent?.full_name || agent?.name || agent?.email || 'Agente';
  };

  const handleAssignAgent = async (agentId: string) => {
    if (!selectedConv) return;
    setIsAssignOpen(false);
    setAssignLoading(true);
    try {
      await assignAgentToConversation(selectedConv._id, agentId);
      const selectedAgent = systemAgents.find(a => a.id === agentId);
      const assignedAgent = selectedAgent
        ? { id: agentId, name: getAgentName(selectedAgent) }
        : null;
      // Actualizar de inmediato el listado y el header
      setConversations(prev => prev.map(c =>
        c._id === selectedConv._id ? { ...c, assignedTo: agentId, assignedAgent } : c
      ));
      setSelectedConv((prev: any) => prev ? { ...prev, assignedTo: agentId, assignedAgent } : prev);
      addNotification({ type: 'success', title: 'Conversación asignada', message: `Asignada a ${getAgentName(selectedAgent)}.` });
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo asignar la conversación.' });
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignAgent = async () => {
    if (!selectedConv) return;
    setIsAssignOpen(false);
    setAssignLoading(true);
    try {
      await api.post('/assignment/unassign', { conversationId: selectedConv._id });
      setConversations(prev => prev.map(c =>
        c._id === selectedConv._id ? { ...c, assignedTo: null, assignedAgent: null } : c
      ));
      setSelectedConv((prev: any) => prev ? { ...prev, assignedTo: null, assignedAgent: null } : prev);
      addNotification({ type: 'success', title: 'Conversación sin asignar', message: 'Ningún agente asignado.' });
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo quitar la asignación.' });
    } finally {
      setAssignLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const diff = now.getTime() - date.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays === 0 && date.getDate() === now.getDate()) {
      return timeStr;
    } else if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) {
      return `Ayer ${timeStr}`;
    } else if (diffDays < 7) {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return `${days[date.getDay()]} ${timeStr}`;
    } else {
      return `${date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${timeStr}`;
    }
  };

  const generateAvatar = (contact: any) => {
    const isGroup = contact?.isGroup;
    const name = contact?.name || 'U';
    const firstLetter = name.charAt(0).toUpperCase();
    const colors = isGroup ? 'bg-indigo-600' : 'bg-slate-500';
    return { content: firstLetter, bgColor: colors, isGroup };
  };

  const getChannelBadge = (channel: string) => {
    const channelMap: Record<string, { icon: any; color: string; label: string }> = {
      whatsapp: { icon: FaWhatsapp, color: 'bg-green-500', label: 'WhatsApp' },
      instagram: { icon: FaInstagram, color: 'bg-gradient-to-br from-pink-500 to-purple-600', label: 'Instagram' },
      tiktok: { icon: FaTiktok, color: 'bg-black', label: 'TikTok' },
      telegram: { icon: FaTelegram, color: 'bg-blue-500', label: 'Telegram' },
      messenger: { icon: FaFacebookMessenger, color: 'bg-blue-600', label: 'Messenger' }
    };
    return channelMap[channel] || { icon: null, color: 'bg-gray-500', label: channel };
  };

  const normalizeChannel = (channel?: string) => {
    const channelMapping: Record<string, string> = {
      'wa': 'whatsapp',
      'wsp': 'whatsapp',
      'ig': 'instagram',
      'tg': 'telegram',
      'facebook_messenger': 'messenger',
      'fb': 'messenger',
      'facebook': 'messenger'
    };
    if (!channel) return 'whatsapp';
    const normalized = String(channel).toLowerCase().trim();
    return channelMapping[normalized] || normalized;
  };

  if (loading) return <PageLoader sectionName="Conversaciones" />;

  return (
    <div className="flex-1 flex overflow-hidden antialiased">

      {/* --- SIDEBAR: Chat List --- */}
      <div className={`w-[340px] lg:w-[400px] xl:w-[440px] h-full flex flex-col bg-white dark:bg-dark-card border-r border-gray-100 dark:border-white/5 z-20 shadow-2xl relative transition-all duration-500 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>

        {/* Sidebar Header */}
        <div className="pt-6 px-5 md:px-6 pb-3">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Conversaciones</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={openNewConversationModal}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent-500 text-black hover:bg-accent-600 transition-all shadow-md"
                title="Nueva conversación"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setFilterStatus(filterStatus === 'groups' ? 'all' : 'groups');
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${filterStatus === 'groups' ? 'text-accent-500 bg-accent-500/10 shadow-[0_0_10px_rgba(249,115,22,0.2)]' : 'text-gray-400 hover:text-accent-500 hover:bg-accent-500/10'}`}
                title={filterStatus === 'groups' ? "Viendo solo grupos" : "Filtrar por grupos"}
              >
                <Users className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={() => { setIsFilterOpen(!isFilterOpen); setIsMenuOpen(false); }}
                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isFilterOpen ? 'text-accent-500 bg-accent-500/10' : 'text-gray-400 hover:text-accent-500 hover:bg-accent-500/10'}`}
                >
                  <Filter className="w-4 h-4" />
                </button>
                {isFilterOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-1.5 border-b border-gray-100 dark:border-white/5 mb-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Estado</p>
                    </div>
                    {[
                      { id: 'all', label: 'Todos', icon: MessageCircle },
                      { id: 'unread', label: 'No leídos', icon: Star },
                      { id: 'groups', label: 'Grupos', icon: Users }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => { setFilterStatus(f.id); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === f.id ? 'text-accent-500 bg-accent-500/5' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                      >
                        <f.icon className="w-3 h-3" />
                        {f.label}
                      </button>
                    ))}
                    <div className="px-3 py-1.5 border-t border-gray-100 dark:border-white/5 mt-1 mb-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Respuesta</p>
                    </div>
                    {[
                      { id: 'replied', label: 'Respondieron', icon: CheckCheck },
                      { id: 'not_replied', label: 'Sin respuesta', icon: MessageCircle }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => { setFilterStatus(f.id); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === f.id ? 'text-accent-500 bg-accent-500/5' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                      >
                        <f.icon className="w-3 h-3" />
                        {f.label}
                      </button>
                    ))}
                    <div className="px-3 py-1.5 border-t border-gray-100 dark:border-white/5 mt-1 mb-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Canal</p>
                    </div>
                    {[
                      { id: 'all', label: 'Todos', icon: MessageCircle },
                      { id: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp },
                      { id: 'instagram', label: 'Instagram', icon: FaInstagram },
                      { id: 'messenger', label: 'Messenger', icon: FaFacebookMessenger }
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => { setFilterChannel(f.id); setIsFilterOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${filterChannel === f.id ? 'text-accent-500 bg-accent-500/5' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                      >
                        {f.icon ? <f.icon className="w-3 h-3" /> : <span className="w-3 h-3 flex items-center justify-center text-[9px] font-bold">T</span>}
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>


            </div>
          </div>

          {/* Search Bar */}
          <div className="relative group mb-2">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent-500 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar conversación..."
              className="w-full h-10 pl-10 pr-4 bg-gray-50/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:border-accent-500/50 focus:bg-white focus:ring-4 focus:ring-accent-500/10 rounded-xl outline-none text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 transition-all font-bold shadow-sm"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); }}
            />
          </div>
        </div>

        {/* Chat Items List — scroll continuo estilo WhatsApp Web */}
        <div
          onScroll={handleConversationsScroll}
          className="flex-1 overflow-y-auto px-2 md:px-3 pb-4 space-y-1 custom-scrollbar"
        >
          {filteredConversations.map((conv) => {
            const isSelected = selectedConv?._id === conv._id;
            const contact = conv.contactId || {};
            const avatar = generateAvatar(contact);
            const channelBadge = getChannelBadge(normalizeChannel(conv.channel));
            const ChannelIcon = channelBadge.icon;
            const preview = conversationPreviews.get(conv._id) || { text: 'Sin mensajes', kind: null };

            return (
              <div
                key={conv._id}
                onClick={() => {
                  if (selectedConv?._id !== conv._id) {
                    stopLiveLocation();
                    setMessages([]);
                    setMessageText('');
                    setShowMobileChat(true);
                    navigate(`/conversations/${conv._id}`);
                  }
                }}
                className={`flex items-start gap-2.5 md:gap-3 p-2 md:p-2.5 cursor-pointer transition-all duration-300 relative group rounded-2xl border ${isSelected
                  ? 'bg-white dark:bg-dark-card border-accent-500/10 shadow-md scale-[1.01] z-10'
                  : 'bg-white dark:bg-dark-card border-gray-50 dark:border-white/5 md:bg-transparent md:border-transparent shadow-sm md:shadow-none hover:shadow-sm md:hover:shadow-none hover:border-gray-100 dark:hover:border-white/10 md:hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
              >
                {/* Active Indicator */}
                {isSelected && (
                  <div className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent-500 rounded-r-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                )}

                {/* Avatar */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm ${avatar.bgColor}`}>
                    {avatar.isGroup ? <Users className="w-4 h-4" /> : avatar.content}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-dark-card rounded-full" />
                </div>

                {/* Info Container */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-gray-900 dark:text-gray-100 truncate text-[13px] tracking-tight">
                        {contact.name || (() => {
                          const realPhone = getRealPhoneNumber(contact);
                          const { prefix, number } = formatPhoneNumber(realPhone);
                          return prefix && number ? `${prefix} ${number}` : number || realPhone || 'Sin número guardado';
                        })()}
                      </span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center text-white shrink-0 ${channelBadge.color}`} title={channelBadge.label}>
                        {ChannelIcon ? <ChannelIcon className="w-2.5 h-2.5" /> : <span className="text-[8px] font-bold">T</span>}
                      </div>
                      {Array.from(new Set([...(conv.tags || []), ...(contact.tags || [])].map((t: any) => String(t ?? '').trim()).filter(Boolean))).map((tag: string, i: number) => (
                        <span key={`${tag}-${i}`} className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shrink-0 ${getTagColor(tag)}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase flex items-center gap-1">
                      {mutedConversations.has(conv._id) && (
                        <BellOff className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      )}
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className={`text-[12px] truncate w-full pr-4 flex items-center gap-1 min-w-0 ${isSelected ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                      <PreviewIcon kind={preview.kind} />
                      <span className="truncate">{preview.text || 'Sin mensajes'}</span>
                    </p>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {conv.unreadCount > 0 && (
                        <span className="bg-accent-500 text-black text-[9px] font-black h-4 min-w-[16px] flex items-center justify-center rounded-full px-1 shadow-sm">
                          {conv.unreadCount}
                        </span>
                      )}

                      <button
                        onClick={(e) => handleDeleteConversation(e, conv._id, conv.contactId?._id)}
                        className="md:opacity-0 md:group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {loadingMoreConversations && (
            <div className="flex justify-center py-3">
              <Loader size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* --- MAIN PANE --- */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden h-full relative bg-[#efeae2] dark:bg-[#0b141a] ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
        {/* Subtle Chat Background Pattern (estilo WhatsApp) */}
        <div className="absolute inset-0 z-0 opacity-[0.5] dark:opacity-[0.12] pointer-events-none mix-blend-multiply dark:mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2351847c' fill-opacity='0.08'%3E%3Cpath d='M0 0h32v2H0zM0 8h8v2H0zM0 16h16v2H0zM0 24h24v2H0zM0 30h16v2H0zM8 0v2H6V0zM16 0v2h-2V0zM24 0v2h-2V0zM30 0v2h2V0zM8 6v2H6V6zM16 6v2h-2V6zM24 6v2h-2V6zM30 6v2h2V6zM8 14v2H6v-2zM16 14v2h-2v-2zM24 14v2h-2v-2zM30 14v2h2v-2zM8 22v2H6v-2zM16 22v2h-2v-2zM24 22v2h-2v-2zM30 22v2h2v-2zM8 30v2H6v-2zM16 30v2h-2v-2zM24 30v2h-2v-2zM30 30v2h2v-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

        {selectedConv ? (
          <>
            {/* Conversation Header */}
            <div className="shrink-0">
              {/* Mobile header (WhatsApp style) */}
              <div className="md:hidden flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-dark-card border-b border-gray-100 dark:border-white/5">
                <button
                  onClick={() => { setSelectedConv(null); setShowMobileChat(false); navigate('/conversations'); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm ${generateAvatar(selectedConv.contactId).bgColor}`}>
                  {selectedConv.contactId?.isGroup ? <Users className="w-4 h-4" /> : generateAvatar(selectedConv.contactId).content}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {selectedConv.contactId?.name || (() => {
                      const realPhone = getRealPhoneNumber(selectedConv.contactId);
                      const { prefix, number } = formatPhoneNumber(realPhone);
                      return prefix && number ? `${prefix} ${number}` : number || realPhone || 'Sin número guardado';
                    })()}
                  </h3>
                </div>
                <div className="relative flex items-center">
                  <BotStatusIndicator conv={selectedConv} sizeClass="w-4 h-4 mr-1" />
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-400 hover:text-accent-500 rounded-xl transition-all">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {isChatSearchOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setIsChatSearchOpen(false); setChatSearchTerm(''); }} />
                      <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-1.5">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                              type="text"
                              value={chatSearchTerm}
                              onChange={(e) => { setChatSearchTerm(e.target.value); setChatSearchIndex(0); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') goToChatSearchResult('next'); }}
                              placeholder="Buscar..."
                              className="w-full h-8 pl-8 pr-2 bg-gray-100 dark:bg-white/10 border border-transparent focus:border-accent-500/30 rounded-lg outline-none text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1.5 px-0.5">
                            <span className="text-[10px] font-bold text-gray-400 tabular-nums whitespace-nowrap">
                              {chatSearchTerm ? `${chatSearchIndex + 1}/${chatSearchResults.length}` : 'Escribe para buscar'}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button onClick={() => goToChatSearchResult('prev')} disabled={!chatSearchTerm || chatSearchResults.length === 0}
                                className="p-1 text-gray-400 hover:text-accent-500 disabled:opacity-30 transition-all">
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => goToChatSearchResult('next')} disabled={!chatSearchTerm || chatSearchResults.length === 0}
                                className="p-1 text-gray-400 hover:text-accent-500 disabled:opacity-30 transition-all">
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => { setIsChatSearchOpen(false); setChatSearchTerm(''); }}
                                className="p-1 text-gray-400 hover:text-red-500 transition-all">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {isMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={handleSearchInChat} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <Search className="w-4 h-4 text-gray-400" /> Buscar
                        </button>
                        <button onClick={() => handleMuteConversation(selectedConv._id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <Bell className={`w-4 h-4 ${mutedConversations.has(selectedConv._id) ? 'text-accent-500' : 'text-gray-400'}`} /> {mutedConversations.has(selectedConv._id) ? 'Silenciado' : 'Silenciar'}
                        </button>
                        {isBotPaused(selectedConv) && (
                          <button onClick={handleReactivateBot} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                            <Bot className="w-4 h-4 text-emerald-500" /> Reactivar bot
                          </button>
                        )}
                        <button onClick={() => handleBlockContact(selectedConv.contactId?._id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <Shield className={`w-4 h-4 ${blockedContacts.has(selectedConv.contactId?._id || '') ? 'text-red-500' : 'text-gray-400'}`} /> {blockedContacts.has(selectedConv.contactId?._id || '') ? 'Bloqueado' : 'Bloquear'}
                        </button>
                        <div className="border-t border-gray-100 dark:border-white/5" />
                        <button onClick={(e) => { setIsMenuOpen(false); handleDeleteConversation(e as any, selectedConv._id, selectedConv.contactId?._id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Desktop header (card style) */}
              <div className="hidden md:block px-4 md:px-6 py-2 relative z-20">
                <div className="bg-white/90 dark:bg-[#202020]/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between transition-all gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm ${generateAvatar(selectedConv.contactId).bgColor}`}>
                      {selectedConv.contactId?.isGroup ? <Users className="w-5 h-5" /> : generateAvatar(selectedConv.contactId).content}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none truncate">
                          {selectedConv.contactId?.name || (() => {
                            const realPhone = getRealPhoneNumber(selectedConv.contactId);
                            const { prefix, number } = formatPhoneNumber(realPhone);
                            return prefix && number ? `${prefix} ${number}` : number || realPhone || 'Sin número guardado';
                          })()}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide leading-none mt-1.5 block truncate">{(() => {
                        const realPhone = getRealPhoneNumber(selectedConv.contactId);
                        const { prefix, number } = formatPhoneNumber(realPhone);
                        return prefix && number ? `${prefix} ${number}` : number || realPhone || 'Sin número guardado';
                      })()}</span>

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                          <Tag className="w-3 h-3" /> Etiquetas
                        </span>
                        {getConvTags(selectedConv).map((tag) => (
                          <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${getTagColor(tag)}`}>
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              disabled={savingTags}
                              className="opacity-70 hover:opacity-100 disabled:opacity-40"
                              title="Quitar etiqueta"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center gap-1">
                          <input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            placeholder="Agregar etiqueta"
                            disabled={savingTags}
                            className="h-6 w-28 rounded-md border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-white/5 px-2 text-[10px] text-gray-700 dark:text-gray-200 outline-none focus:border-accent-500/40 disabled:opacity-50"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            disabled={savingTags || !tagInput.trim()}
                            className="h-6 px-2 rounded-md bg-accent-500/10 text-accent-600 dark:text-accent-400 text-[10px] font-bold hover:bg-accent-500/20 disabled:opacity-40"
                          >
                            {savingTags ? '...' : 'Agregar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 relative">
                    <div className="flex items-center gap-1.5">
                        <BotStatusIndicator conv={selectedConv} sizeClass="w-4 h-4" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Atendido:</span>
                        <div className="relative">
                          <button
                            onClick={() => setIsAssignOpen(!isAssignOpen)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-900 dark:text-white dark:bg-white/5 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-white/10 hover:border-accent-500/50 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {selectedConv.assignedAgent?.name || (selectedConv.assignedTo ? getAgentName(systemAgents.find(a => a.id === selectedConv.assignedTo)) : 'Sin asignar')}
                            <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                          </button>
                          {isAssignOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsAssignOpen(false)}></div>
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5 dark:bg-white/5">
                                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Asignar a:</span>
                                </div>
                                <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
                                  {assignLoading && <div className="px-4 py-2 text-xs text-gray-400">Cargando...</div>}
                                  {!assignLoading && systemAgents.length === 0 && (
                                    <div className="px-4 py-2 text-xs text-gray-400">No hay agentes disponibles</div>
                                  )}
                                  {systemAgents.map(agent => (
                                    <button
                                      key={agent.id}
                                      onClick={() => handleAssignAgent(agent.id)}
                                      className={`w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-bold ${(selectedConv.assignedTo === agent.id || selectedConv.assignedAgent?.id === agent.id)
                                        ? 'text-accent-500 bg-accent-500/5'
                                        : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                      {getAgentName(agent)}
                                    </button>
                                  ))}
                                </div>
                                {selectedConv.assignedTo && (
                                  <>
                                    <div className="border-t border-gray-100 dark:border-white/5" />
                                    <button
                                      onClick={handleUnassignAgent}
                                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    >
                                      Quitar asignación
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>

                      <div className="flex items-center gap-0">
                        <div className="relative">
                          <button onClick={handleSearchInChat} className={`p-1.5 rounded-lg transition-all hover:bg-accent-500/5 ${isChatSearchOpen ? 'text-accent-500 bg-accent-500/5' : 'text-gray-400 hover:text-accent-500'}`}>
                            <Search className="w-4 h-4" />
                          </button>
                          {isChatSearchOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => { setIsChatSearchOpen(false); setChatSearchTerm(''); }} />
                              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                <div className="p-1.5">
                                  <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                      type="text"
                                      value={chatSearchTerm}
                                      onChange={(e) => { setChatSearchTerm(e.target.value); setChatSearchIndex(0); }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') goToChatSearchResult('next'); }}
                                      placeholder="Buscar..."
                                      className="w-full h-8 pl-8 pr-2 bg-gray-100 dark:bg-white/10 border border-transparent focus:border-accent-500/30 rounded-lg outline-none text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 transition-all"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5 px-0.5">
                                    <span className="text-[10px] font-bold text-gray-400 tabular-nums whitespace-nowrap">
                                      {chatSearchTerm ? `${chatSearchIndex + 1}/${chatSearchResults.length}` : 'Escribe para buscar'}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                      <button onClick={() => goToChatSearchResult('prev')} disabled={!chatSearchTerm || chatSearchResults.length === 0}
                                        className="p-1 text-gray-400 hover:text-accent-500 disabled:opacity-30 transition-all">
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => goToChatSearchResult('next')} disabled={!chatSearchTerm || chatSearchResults.length === 0}
                                        className="p-1 text-gray-400 hover:text-accent-500 disabled:opacity-30 transition-all">
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => { setIsChatSearchOpen(false); setChatSearchTerm(''); }}
                                        className="p-1 text-gray-400 hover:text-red-500 transition-all">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="relative">
                          <button onClick={() => setIsChatMenuOpen(!isChatMenuOpen)} className="p-1.5 text-gray-400 hover:text-accent-500 hover:bg-accent-500/5 rounded-lg transition-all">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {isChatMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsChatMenuOpen(false)} />
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <button onClick={handleSearchInChat} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                  <Search className="w-4 h-4 text-gray-400" /> Buscar
                                </button>
                                <button onClick={() => handleMuteConversation(selectedConv._id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                  <Bell className={`w-4 h-4 ${mutedConversations.has(selectedConv._id) ? 'text-accent-500' : 'text-gray-400'}`} /> {mutedConversations.has(selectedConv._id) ? 'Silenciado' : 'Silenciar'}
                                </button>
                                <button onClick={() => handleBlockContact(selectedConv.contactId?._id)} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                  <Shield className={`w-4 h-4 ${blockedContacts.has(selectedConv.contactId?._id || '') ? 'text-red-500' : 'text-gray-400'}`} /> {blockedContacts.has(selectedConv.contactId?._id || '') ? 'Bloqueado' : 'Bloquear'}
                                </button>
                                {isBotPaused(selectedConv) && (
                                  <button onClick={handleReactivateBot} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                                    <Bot className="w-4 h-4 text-emerald-500" /> Reactivar bot
                                  </button>
                                )}
                                <div className="border-t border-gray-100 dark:border-white/5" />
                                <button onClick={(e) => { setIsChatMenuOpen(false); handleDeleteConversation(e as any, selectedConv._id, selectedConv.contactId?._id); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                  <Trash2 className="w-4 h-4" /> Eliminar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>

{/* Chat Body */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-4 space-y-4 custom-scrollbar relative z-10"
            >
              {messages.map((m, msgIdx) => {
                const isMe = m.direction === 'outbound';
                const rendered = messageRenderData[msgIdx];
                const body = rendered.body;
                const media = rendered.media;
                const sticker = rendered.sticker;
                const location = rendered.location;
                const unavailableMedia = !media && !location && (sticker || ['image', 'video', 'audio', 'document'].includes(m.type))
                  ? (sticker ? 'Sticker no disponible' : m.type === 'audio' ? 'Audio no disponible' : m.type === 'video' ? 'Video no disponible' : m.type === 'image' ? 'Imagen no disponible' : 'Archivo no disponible')
                  : null;
                const isCurrentSearch = chatSearchResults[chatSearchIndex]?.index === msgIdx;

                return (
                  <div key={m._id} ref={el => { chatSearchRefs.current[msgIdx] = el; }}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all duration-300 ${isCurrentSearch ? 'ring-2 ring-amber-400 dark:ring-amber-500 rounded-2xl scale-[1.02]' : ''}`}>
                    <div className={`flex items-end gap-1.5 max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] ${isMe ? 'animate-[slideInRight_0.3s_ease-out]' : 'animate-[slideInLeft_0.3s_ease-out]'}`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 overflow-hidden shadow-sm border border-white/30 dark:border-white/10 bg-gradient-to-br from-accent-500 to-accent-600">
                          {selectedConv.contactId?.isGroup ? <Users className="w-3.5 h-3.5 text-white/90" /> : <span className="text-xs font-bold text-white">{generateAvatar(selectedConv.contactId).content}</span>}
                        </div>
                      )}
                      <div className={`relative px-4 py-2.5 rounded-[1.25rem] transition-all duration-200 ${isMe
                        ? 'bg-white dark:bg-[#202020] text-gray-900 dark:text-gray-100 rounded-br-[4px] border border-gray-200/70 dark:border-white/10 shadow-sm'
                        : 'bg-gradient-to-br from-accent-500 to-accent-600 text-white rounded-bl-[4px] border border-white/15 shadow-md shadow-accent-500/20'
                        }`}>
                        {sticker && media ? (
                          <StickerMedia url={media.url} isMe={isMe} />
                        ) : media ? (
                          <div className="-mx-5 -mt-3 mb-2 rounded-t-2xl overflow-hidden">
                            {media.type === 'image' ? (
                              <img src={media.url} alt="Imagen" className="w-full h-auto object-contain bg-black/5" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : media.type === 'video' ? (
                              <video src={media.url} controls className="w-full max-h-64" />
                            ) : media.type === 'audio' ? (
                              <div className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-gray-50 dark:bg-white/5' : 'bg-white/15'}`}>
                                <Mic className={`w-5 h-5 ${isMe ? 'text-accent-500' : 'text-white'}`} />
                                <audio src={media.url} controls className="flex-1 h-8" />
                              </div>
                            ) : (
                              <a href={media.url} target="_blank" rel="noreferrer" download={media.filename || undefined}
                                className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10' : 'bg-white/15 hover:bg-white/20'}`}>
                                <Paperclip className={`w-5 h-5 flex-shrink-0 ${isMe ? 'text-gray-400' : 'text-white/80'}`} />
                                <span className={`text-xs font-semibold truncate flex-1 ${isMe ? 'text-gray-600 dark:text-gray-300' : 'text-white'}`}>{media.filename || 'Documento'}</span>
                                <Download className={`w-4 h-4 flex-shrink-0 ${isMe ? 'text-gray-400' : 'text-white/70'}`} />
                              </a>
                            )}
                          </div>
                        ) : unavailableMedia ? (
                          <div className={`-mx-5 -mt-3 mb-2 rounded-t-2xl px-4 py-3 flex items-center gap-3 ${isMe ? 'bg-gray-50 dark:bg-white/5' : 'bg-white/15'}`}>
                            {unavailableMedia === 'Audio no disponible'
                              ? <Mic className={`w-5 h-5 flex-shrink-0 ${isMe ? 'text-gray-400' : 'text-white/80'}`} />
                              : <Paperclip className={`w-5 h-5 flex-shrink-0 ${isMe ? 'text-gray-400' : 'text-white/80'}`} />}
                            <span className={`text-xs font-semibold ${isMe ? 'text-gray-500 dark:text-gray-400' : 'text-white'}`}>{unavailableMedia}</span>
                          </div>
                        ) : null}
                        {location ? (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer"
                            className={`-mx-5 -mt-3 mb-2 flex items-center gap-3 rounded-t-2xl px-4 py-3 transition-colors ${isMe ? 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10' : 'bg-white/15 hover:bg-white/20'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400' : 'bg-white/20 text-white'}`}>
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{location.name || 'Ubicación compartida'}</p>
                              <p className={`text-[10px] truncate ${isMe ? 'text-gray-500 dark:text-gray-400' : 'text-white/80'}`}>
                                {location.address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
                              </p>
                            </div>
                          </a>
                        ) : null}
                        {body && <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap tracking-wide" dangerouslySetInnerHTML={{ __html: formatMessageText(body, chatSearchTerm) }} />}
                        <div className={`flex justify-end items-center gap-1.5 ${body || media || sticker || location || unavailableMedia ? 'mt-2' : ''} ${isMe ? 'text-gray-400 dark:text-gray-500' : 'text-white/70'}`}>
                          <span className="text-[9px] font-black uppercase tracking-widest">
                            {formatTime(m.createdAt)}
                          </span>
                          {isMe && <MessageStatus status={m.status} />}
                        </div>
                      </div>
                    </div>
                    {!isMe && rendered.buttons.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1.5 ml-9 max-w-[80%] lg:max-w-[70%]">
                        <span className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black mb-0.5 ml-1">
                          Opciones del bot
                        </span>
                        {rendered.buttons.map((btn, idx) => (
                          <AnimatedButton
                            key={btn.id}
                            variant="ghost"
                            onClick={() => handleBotButtonClick({
                              ...btn,
                              ...(rendered.numericButtons ? { number: String(idx + 1) } : {}),
                            })}
                            className="!text-[10px] !py-2 !px-4 !rounded-full w-full !justify-center !bg-white dark:!bg-[#202020] !border !border-gray-200 dark:!border-white/10 !text-gray-700 dark:!text-gray-200 hover:!bg-gray-50 dark:hover:!bg-white/5"
                          >
                            {rendered.numericButtons ? `${idx + 1}. ${btn.text}` : btn.text}
                          </AnimatedButton>
                        ))}
                      </div>
                    )}
                    {isMe && rendered.buttons.length > 0 && (
                      <div className="flex flex-col mt-1.5 mr-9 max-w-[80%] lg:max-w-[70%] items-end">
                        <div className="flex flex-col w-full gap-1 rounded-xl px-3 py-2 bg-white dark:bg-[#202020] border border-gray-200 dark:border-white/10 shadow-sm">
                          <span className="text-[9px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black mb-0.5">
                            Opciones
                          </span>
                          {rendered.buttons.map((btn, idx) => (
                            <div
                              key={btn.id}
                              className="flex items-center gap-2 text-[10px] py-0.5 text-gray-700 dark:text-gray-200 font-medium"
                            >
                              <span className="w-4 h-4 shrink-0 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400 text-[8px] flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <span>{btn.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input Footer Area */}
            <div className="px-4 md:px-8 pb-4 md:pb-8 pt-2 z-20 relative">
              {/* Catalog Popover */}
              {isCatalogOpen && (
                <div className="absolute bottom-full left-4 md:left-8 mb-4 w-[calc(100vw-32px)] md:w-[360px] bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300 z-50">
                  <div className="px-4 py-3 dark:bg-dark-card border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Store className="w-4 h-4 text-accent-500" />
                      Insertar Producto
                    </h4>
                    <button onClick={() => setIsCatalogOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {loadingCatalogs ? (
                      <div className="text-center py-6 text-xs font-bold text-gray-500">Cargando catálogos...</div>
                    ) : catalogs.length === 0 ? (
                      <div className="text-center py-6">
                        <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-gray-500">No hay catálogos disponibles.</p>
                      </div>
                    ) : (
                      catalogs.map(catalog => (
                        <div key={catalog.id} className="mb-4 last:mb-0">
                          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2">{catalog.name}</h5>
                          <div className="space-y-1">
                            {catalog.items?.map((item: any) => (
                              <button
                                key={item.id}
                                onClick={() => handleSelectProduct(item)}
                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors group"
                              >
                                <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {item.media_url ? (
                                    <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{item.title}</p>
                                  <p className="text-[10px] font-black text-accent-500 uppercase tracking-widest">{item.price ? `$${item.price}` : 'Sin precio'}</p>
                                </div>
                              </button>
                            ))}
                            {(!catalog.items || catalog.items.length === 0) && (
                              <p className="text-[10px] font-bold text-gray-400 px-2">Catálogo vacío</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Quick Replies */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 custom-scrollbar">
                {['Gracias', 'Perfecto', 'Enviado', 'Confirmado', 'Te llamo'].map((reply) => (
                  <button
                    key={reply}
                    onClick={() => setMessageText(reply)}
                    className="flex-shrink-0 px-3 py-1.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-accent-500/10 hover:border-accent-500/30 hover:text-accent-600 dark:hover:text-accent-400 transition-all duration-200 active:scale-95"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {whatsappConnections.length > 0 && (
                <div className="mb-2">
                  <Dropdown
                    value={selectedConnectionId}
                    onChange={(v) => setSelectedConnectionId(v)}
                    options={whatsappConnections.map(c => ({ value: c.id, label: c.display_name }))}
                    placeholder="Conexión WhatsApp..."
                  />
                </div>
              )}
              {liveLocationActive && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-2xl bg-accent-500/10 border border-accent-500/30 text-accent-600 dark:text-accent-400">
                  <MapPin className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest flex-1">Ubicación en tiempo real activa</span>
                  <button onClick={stopLiveLocation} className="text-[10px] font-black uppercase tracking-widest underline hover:text-red-500 transition-colors">
                    Detener
                  </button>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept="image/*,.pdf,.doc,.docx" className="hidden" />
              {isRecording ? (
                <div className="bg-white dark:bg-dark-card rounded-[1.5rem] shadow-xl border border-red-200 dark:border-red-500/30 flex items-center px-4 md:px-6 py-2.5 md:py-3 gap-3 animate-in fade-in duration-200">
                  <button onClick={cancelRecording} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{formatDuration(recordingDuration)}</span>
                  <div className="flex-1 h-1 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: `${Math.min(100, (recordingDuration / 60) * 100)}%` }} />
                  </div>
                  <button onClick={stopRecording} className="p-2.5 md:p-3 rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg flex items-center justify-center">
                    <Send className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#202020] rounded-[1.5rem] pl-4 md:pl-5 shadow-sm border border-gray-200 dark:border-white/10 flex items-center transition-all focus-within:ring-2 focus-within:ring-accent-500/20 group">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Escribe a ${selectedConv?.contactId?.name || 'este contacto'}...`}
                    className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder:text-gray-400 font-bold text-sm md:text-base py-3 md:py-3.5 min-w-0"
                  />
                  <div className="flex items-center md:gap-0.5 shrink-0 pr-1.5 md:pr-2">
                    <button onClick={toggleCatalog} className={`p-1.5 md:p-2 transition-all relative group/catalog ${isCatalogOpen ? 'text-accent-500 bg-accent-500/10 rounded-lg' : 'text-gray-400 hover:text-accent-500'}`}>
                      <Store className="w-4 h-4 md:w-5 md:h-5" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover/catalog:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden md:block">
                        Catálogo
                      </div>
                    </button>
                    <button onClick={handleAttachFile} className="p-1.5 md:p-2 text-gray-400 hover:text-accent-500 transition-all">
                      <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                        className={`p-1.5 md:p-2 transition-all ${isLocationMenuOpen || liveLocationActive ? 'text-accent-500 bg-accent-500/10 rounded-lg' : 'text-gray-400 hover:text-accent-500'}`}
                        title="Ubicación"
                      >
                        <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      {isLocationMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsLocationMenuOpen(false)} />
                          <div className="absolute bottom-full right-0 mb-2 w-60 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-3 border-b border-gray-100 dark:border-white/5">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ubicación</span>
                            </div>
                            <button onClick={handleSendCurrentLocation} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors">
                              <MapPin className="w-4 h-4 text-accent-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-gray-900 dark:text-white">Mi ubicación actual</p>
                                <p className="text-[9px] font-medium text-gray-400">Envía un punto fijo</p>
                              </div>
                            </button>
                            <button onClick={liveLocationActive ? stopLiveLocation : startLiveLocation} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors">
                              <MapPin className={`w-4 h-4 shrink-0 ${liveLocationActive ? 'text-red-500' : 'text-accent-500'}`} />
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-gray-900 dark:text-white">{liveLocationActive ? 'Detener ubicación en tiempo real' : 'Ubicación en tiempo real'}</p>
                                <p className="text-[9px] font-medium text-gray-400">{liveLocationActive ? 'Se está compartiendo tu posición' : 'Comparte tu posición cada minuto'}</p>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="relative">
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5 md:p-2 text-gray-400 hover:text-accent-500 transition-all">
                        <Smile className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                      {showEmojiPicker && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                          <div className="absolute bottom-full right-0 mb-2 w-72 md:w-80 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-3 border-b border-gray-100 dark:border-white/5">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Emojis</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-3 grid grid-cols-8 gap-1">
                              {EMOJIS.map((emoji, i) => (
                                <button key={i} onClick={() => handleEmojiSelect(emoji)}
                                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all hover:scale-110">
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !messageText.trim()}
                      className={`p-2 md:p-3 rounded-2xl transition-all duration-200 flex items-center justify-center ml-1 ${messageText.trim()
                        ? 'bg-black dark:bg-accent-500 text-white dark:text-black shadow-lg shadow-accent-500/20 scale-105 hover:scale-110 active:scale-95'
                        : 'bg-gray-50 dark:bg-white/5 text-gray-300 dark:text-gray-600'
                        } ${sending ? 'animate-pulse' : ''}`}
                    >
                      {sending ? (
                        <Loader size="xs" />
                      ) : (
                        <Send className={messageText.trim() ? "w-4 h-4 md:w-5 md:h-5" : "w-3.5 h-3.5 md:w-4 md:h-4"} />
                      )}
                    </button>
                    <div className="w-px h-5 md:h-6 bg-gray-100 dark:bg-white/5 mx-0.5 md:mx-1.5" />
                    <button onClick={startRecording} className="p-1.5 md:p-2 text-gray-400 hover:text-accent-500 transition-colors">
                      <Mic className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 select-none animate-in fade-in zoom-in-95 duration-1000">
            <div className="w-60 h-60 bg-white dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl relative transform -rotate-2 hover:rotate-0 transition-transform duration-700">
              <div className="absolute inset-0 bg-accent-500/10 blur-[60px] rounded-full" />
              <MessageCircle className="w-24 h-24 text-accent-500 z-10 animate-pulse-slow" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">CRM GSC</h2>
            <p className="max-w-sm text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed mb-10 px-6">
              Gestiona todas tus interacciones de WhatsApp desde una interfaz centralizada y moderna.
            </p>
            <div className="flex items-center gap-3 bg-black dark:bg-accent-500 px-6 py-2.5 rounded-2xl text-white dark:text-black shadow-lg transition-all active:scale-95 cursor-pointer">
              <Check className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cifrado Activo</span>
            </div>
          </div>
        )}

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.05);
            border-radius: 10px;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.05);
          }
          .animate-pulse-slow {
            animation: pulse 4s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.95); }
          }
        `}</style>
      </div>

      {/* Modal Nueva Conversación */}
      <Modal
        open={showStartModal}
        onClose={() => setShowStartModal(false)}
        title="Iniciar Nueva Conversación"
        icon={<Plus className="w-5 h-5 text-accent-500" />}
        size="md"
      >
        <div className="space-y-4">
          {/* Provider selector tabs */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Proveedor</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStartProvider('baileys')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  startProvider === 'baileys'
                    ? 'border-accent-500 bg-accent-500/10 text-accent-600 dark:text-accent-400'
                    : 'border-slate-200 dark:border-slate-700 text-gray-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4" />
                Baileys (Texto libre)
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartProvider('whatsapp_cloud');
                  if (cloudConnections.length > 0) {
                    setStartCloudConnId(cloudConnections[0].id);
                    fetchMetaTemplates(cloudConnections[0].id);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  startProvider === 'whatsapp_cloud'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-700 text-gray-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Cloud className="w-4 h-4" />
                Cloud API (Meta Template)
              </button>
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Número de Teléfono</label>
            <input
              type="text"
              placeholder="ej. +51 987654321 o 987654321"
              value={startPhone}
              onChange={e => setStartPhone(e.target.value)}
              className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm text-slate-900 dark:text-white"
            />
          </div>

          {/* If Baileys: Free text message */}
          {startProvider === 'baileys' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Mensaje de Texto Inicial</label>
              <textarea
                rows={3}
                placeholder="Escribe el primer mensaje..."
                value={startText}
                onChange={e => setStartText(e.target.value)}
                className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm text-slate-900 dark:text-white resize-none"
              />
            </div>
          )}

          {/* If Cloud API: Select Cloud Connection + Select Template */}
          {startProvider === 'whatsapp_cloud' && (
            <>
              {cloudConnections.length === 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                  No hay conexiones de WhatsApp Cloud API configuradas. Ve a <strong>Gestión de WhatsApp</strong> para configurar las credenciales de Meta.
                </div>
              ) : (
                <>
                  {cloudConnections.length > 1 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Conexión Cloud</label>
                      <select
                        value={startCloudConnId}
                        onChange={e => {
                          setStartCloudConnId(e.target.value);
                          fetchMetaTemplates(e.target.value);
                        }}
                        className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                      >
                        {cloudConnections.map(c => (
                          <option key={c.id} value={c.id}>{c.display_name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Plantilla de Meta (Template)</label>
                    {loadingMetaTemplates ? (
                      <div className="py-3 text-center text-xs text-gray-400">Cargando plantillas de Meta...</div>
                    ) : metaTemplates.length === 0 ? (
                      <p className="text-xs text-red-500">No se encontraron plantillas aprobadas en tu cuenta de Meta.</p>
                    ) : (
                      <select
                        value={selectedTemplateId || selectedTemplateName}
                        onChange={e => {
                          const t = metaTemplates.find(tmpl => (tmpl.id || tmpl.name) === e.target.value);
                          setSelectedTemplateId(t?.id || '');
                          setSelectedTemplateName(t?.name || e.target.value);
                          setSelectedTemplateLang(t?.language || 'es');
                          setTemplateVariables({});
                        }}
                        className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                      >
                        {metaTemplates.map(tmpl => (
                          <option key={tmpl.id || tmpl.name} value={tmpl.id || tmpl.name}>
                            {tmpl.name} ({tmpl.language || 'es'}) — {tmpl.category}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {selectedMetaTemplate && (() => {
                    const bodyComponent = (Array.isArray(selectedMetaTemplate.components) ? selectedMetaTemplate.components : [])
                      .find((c: any) => String(c?.type || '').toUpperCase() === 'BODY');
                    return bodyComponent?.text ? (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-700">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Contenido</p>
                        <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{bodyComponent.text}</p>
                      </div>
                    ) : null;
                  })()}

                  {selectedTemplateVariables.length > 0 && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">Variables de la plantilla</label>
                      {selectedTemplateVariables.map(variable => (
                        <input
                          key={variable.key}
                          type="text"
                          placeholder={variable.label}
                          value={templateVariables[variable.key] || ''}
                          onChange={e => setTemplateVariables(prev => ({ ...prev, [variable.key]: e.target.value }))}
                          className="w-full px-4 py-2.5 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm text-slate-900 dark:text-white"
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowStartModal(false)}
              className="flex-1 py-3 text-slate-500 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleStartConversationSubmit}
              disabled={submittingStart || (startProvider === 'whatsapp_cloud' && cloudConnections.length === 0)}
              className="flex-1 py-3 bg-gradient-to-r from-accent-500 to-accent-600 text-black text-xs font-bold rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all shadow-md disabled:opacity-50"
            >
              {submittingStart ? 'Enviando...' : 'Iniciar Conversación'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Conversations;