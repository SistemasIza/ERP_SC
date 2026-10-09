import { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Clock, Users, Video, Phone, UsersRound, Presentation, Ellipsis } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { HeaderButton } from '../../../components/ui/HeaderButton';
import { CountBadge } from '../../../components/ui/CountBadge';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { Modal } from '../../../components/ui/Modal';
import { useNotifications } from '../../../contexts/NotificationContext';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../../../services/api';

type EventType = 'meeting' | 'demo' | 'webinar' | 'review' | 'call' | 'other';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  duration: string;
  description: string;
  attendees: string;
  type: EventType;
  color: string;
}

const EVENT_TYPE_STYLES: Record<string, { dot: string; badge: string }> = {
  meeting: { dot: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  demo: { dot: 'bg-purple-500', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  webinar: { dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  review: { dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  call: { dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  other: { dot: 'bg-slate-400', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting: 'Reunión',
  demo: 'Demo',
  webinar: 'Webinar',
  review: 'Revisión',
  call: 'Llamada',
  other: 'Otro',
};

const EVENT_TYPE_ICONS: Record<string, any> = {
  meeting: UsersRound,
  demo: Presentation,
  webinar: Video,
  review: CalendarIcon,
  call: Phone,
  other: Ellipsis,
};

const EVENT_COLORS = [
  { key: 'blue', dot: 'bg-blue-500', ring: 'ring-blue-500', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { key: 'purple', dot: 'bg-purple-500', ring: 'ring-purple-500', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  { key: 'emerald', dot: 'bg-emerald-500', ring: 'ring-emerald-500', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { key: 'amber', dot: 'bg-amber-500', ring: 'ring-amber-500', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { key: 'rose', dot: 'bg-rose-500', ring: 'ring-rose-500', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { key: 'cyan', dot: 'bg-cyan-500', ring: 'ring-cyan-500', badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
  { key: 'violet', dot: 'bg-violet-500', ring: 'ring-violet-500', badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  { key: 'orange', dot: 'bg-orange-500', ring: 'ring-orange-500', badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
  { key: 'slate', dot: 'bg-slate-400', ring: 'ring-slate-400', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' },
];

const getEventStyles = (ev: CalendarEvent) => {
  if (ev.color) {
    const found = EVENT_COLORS.find(c => c.key === ev.color);
    if (found) return { dot: found.dot, badge: found.badge };
  }
  return EVENT_TYPE_STYLES[ev.type] || EVENT_TYPE_STYLES.other;
};

const MOCK_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Reunión equipo ventas', date: new Date(2026, 6, 14), time: '10:00', duration: '1h', description: 'Revisión de métricas semanales y objetivos del mes.', attendees: 'Carlos, Ana, Luis', type: 'meeting', color: 'blue' },
  { id: '2', title: 'Demo con cliente potencial', date: new Date(2026, 6, 14), time: '15:30', duration: '45m', description: 'Presentación de la plataforma para cliente del sector retail.', attendees: 'Cliente, Equipo comercial', type: 'demo', color: 'purple' },
  { id: '3', title: 'Sprint planning', date: new Date(2026, 6, 15), time: '09:00', duration: '2h', description: 'Planificación del sprint 24. Revisión de backlog y estimaciones.', attendees: 'Dev team, PM', type: 'meeting', color: 'cyan' },
  { id: '4', title: 'Webinar: IA en ventas', date: new Date(2026, 6, 16), time: '11:00', duration: '1h', description: 'Webinar interno sobre uso de inteligencia artificial en procesos comerciales.', attendees: 'Todo el equipo', type: 'webinar', color: 'emerald' },
  { id: '5', title: 'Revisión trimestral', date: new Date(2026, 6, 18), time: '14:00', duration: '1.5h', description: 'Revisión de resultados del Q3 y definición de estrategia Q4.', attendees: 'Directores, Gerentes', type: 'review', color: 'amber' },
  { id: '6', title: 'Llamada con proveedor', date: new Date(2026, 6, 14), time: '11:00', duration: '30m', description: 'Coordinación de nuevos servicios.', attendees: 'Proveedor TI', type: 'call', color: 'rose' },
  { id: '7', title: 'Demo onboarding', date: new Date(2026, 6, 14), time: '16:30', duration: '1h', description: 'Capacitación a nuevo cliente.', attendees: 'Cliente nuevo', type: 'demo', color: 'violet' },
  { id: '8', title: 'Revisión de campaña', date: new Date(2026, 6, 14), time: '09:00', duration: '1h', description: 'Análisis de resultados de campaña de marketing.', attendees: 'Marketing team', type: 'review', color: 'orange' },
  { id: '9', title: 'Seguimiento leads', date: new Date(2026, 6, 15), time: '11:00', duration: '1h', description: 'Llamadas de seguimiento a leads calificados.', attendees: 'Comercial', type: 'call', color: 'rose' },
  { id: '10', title: 'Webinar producto', date: new Date(2026, 6, 15), time: '16:00', duration: '1h', description: 'Demostración de nuevas funcionalidades.', attendees: 'Clientes', type: 'webinar', color: 'emerald' },
  { id: '11', title: 'Reunión directiva', date: new Date(2026, 6, 15), time: '12:00', duration: '2h', description: 'Revisión de estrategia corporativa.', attendees: 'Directores', type: 'meeting', color: 'purple' },
];

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const toDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const mapEvent = (row: any): CalendarEvent => ({
  id: row.id,
  title: row.title,
  date: new Date(row.event_date + 'T12:00:00'),
  time: row.time || '',
  duration: row.duration || '',
  description: row.description || '',
  attendees: row.attendees || '',
  type: row.type,
  color: row.color,
});

export const Calendar = () => {
  const { addNotification } = useNotifications();
  const [today] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [loading, setLoading] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState({ title: '', time: '09:00', duration: '1h', description: '', attendees: '', type: 'meeting' as EventType, color: 'blue' });

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentMonth, currentYear, daysInMonth, firstDayOfWeek]);

  const monthEvents = useMemo(() => {
    return events.filter(e => e.date.getMonth() === currentMonth && e.date.getFullYear() === currentYear);
  }, [events, currentMonth, currentYear]);

  const getEventsForDay = (day: number) => monthEvents.filter(e => e.date.getDate() === day);

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(p => p - 1); } else setCurrentMonth(p => p - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(p => p + 1); } else setCurrentMonth(p => p + 1); };

  const isToday = (day: number) => today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getCalendarEvents();
        if (!cancelled) setEvents((Array.isArray(rows) ? rows : []).map(mapEvent));
      } catch (err) {
        console.error('Failed to load calendar events:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreateEvent = async () => {
    if (!formData.title.trim()) return;
    try {
      const created = await createCalendarEvent({
        title: formData.title,
        date: toDateStr(selectedDate || new Date(currentYear, currentMonth, 1)),
        time: formData.time,
        duration: formData.duration,
        description: formData.description,
        attendees: formData.attendees,
        type: formData.type,
        color: formData.color,
      });
      setEvents(prev => [...prev, mapEvent(created)]);
      setShowCreateEvent(false);
      setFormData({ title: '', time: '09:00', duration: '1h', description: '', attendees: '', type: 'meeting', color: 'blue' });
      addNotification({ type: 'success', title: 'Evento creado', message: `"${formData.title}" agregado al calendario.` });
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo crear el evento.' });
    }
  };

  const handleUpdateEvent = async () => {
    if (!formData.title.trim() || !editingEvent) return;
    try {
      const updated = await updateCalendarEvent(editingEvent.id, {
        title: formData.title,
        date: toDateStr(editingEvent.date),
        time: formData.time,
        duration: formData.duration,
        description: formData.description,
        attendees: formData.attendees,
        type: formData.type,
        color: formData.color,
      });
      setEvents(prev => prev.map(ev => ev.id === editingEvent.id ? mapEvent(updated) : ev));
      setEditingEvent(null);
      setSelectedEvent(null);
      setFormData({ title: '', time: '09:00', duration: '1h', description: '', attendees: '', type: 'meeting', color: 'blue' });
      addNotification({ type: 'success', title: 'Evento actualizado', message: `"${formData.title}" modificado correctamente.` });
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo actualizar el evento.' });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const deleted = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    setSelectedEvent(null);
    try {
      await deleteCalendarEvent(id);
      if (deleted) addNotification({ type: 'success', title: 'Evento eliminado', message: `"${deleted.title}" ha sido eliminado.` });
    } catch (err) {
      addNotification({ type: 'error', title: 'Error', message: 'No se pudo eliminar el evento.' });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Calendario"
        highlight="de Eventos"
        description="Administra reuniones, eventos y actividades."
        icon={CalendarIcon}
        action={
          <div className="flex items-center gap-3">
            <CountBadge count={events.length} />
            <HeaderButton onClick={() => { setSelectedDate(new Date(currentYear, currentMonth, today.getDate())); setShowCreateEvent(true); }} icon={<Plus className="w-4 h-4" />}>
              Nuevo Evento
            </HeaderButton>
          </div>
        }
      />

      <PageBody>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all text-slate-500">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-black text-lg text-slate-900 dark:text-white">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all text-slate-500">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
              {DAYS.map(d => (
                <div key={d} className="px-2 py-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => (
                <div key={idx}
                  className={`min-h-[100px] max-h-[130px] p-1.5 border-b border-r border-slate-100 dark:border-slate-800/50 transition-all flex flex-col relative ${
                    day ? 'hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer' : 'bg-slate-50/50 dark:bg-black/10'
                  }`}
                  onClick={() => { if (day) { setSelectedDate(new Date(currentYear, currentMonth, day)); setShowCreateEvent(true); } }}
                >
                  {day && (
                    <>
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                        isToday(day) ? 'bg-accent-500 text-black' : 'text-slate-700 dark:text-slate-300'
                      }`}>{day}</span>
                      <div className="mt-1 space-y-0.5 overflow-y-auto flex-1 scrollbar-none group-hover:scrollbar-thin">
                        {getEventsForDay(day).map(ev => {
                          const styles = getEventStyles(ev);
                          return (
                            <button key={ev.id} onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                              className={`w-full text-left px-1.5 py-0.5 rounded text-[9px] font-bold truncate hover:opacity-80 transition-all flex items-center gap-1 ${styles.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
                              {ev.title}
                            </button>
                          );
                        })}
                      </div>
                      {getEventsForDay(day).length > 2 && (
                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-dark-card to-transparent pointer-events-none" />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Events list sidebar */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <h3 className="font-black text-sm text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-accent-500" />
              Eventos de {MONTHS[currentMonth]}
            </h3>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-slate-400 text-center py-8">Cargando eventos...</p>
              ) : monthEvents.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No hay eventos este mes</p>
              ) : (
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin">
                  {monthEvents.sort((a, b) => a.date.getDate() - b.date.getDate()).map(ev => (
                    <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                      className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-slate-700/50 hover:bg-accent-500/5 hover:border-accent-500/20 transition-all group">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex flex-col items-center justify-center text-accent-500 shrink-0">
                          <span className="text-xs font-black">{ev.date.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{ev.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {ev.time}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageBody>

      {/* Create / Edit Event Modal */}
      <Modal
        open={showCreateEvent || editingEvent !== null}
        onClose={() => { setShowCreateEvent(false); setEditingEvent(null); setFormData({ title: '', time: '09:00', duration: '1h', description: '', attendees: '', type: 'meeting', color: 'blue' }); }}
        title={editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
        icon={<CalendarIcon className="w-5 h-5 text-accent-500" />}
        size="sm"
      >
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Título</label>
              <input type="text" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="Nombre del evento"
                className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Tipo de Evento</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map(type => {
                  const styles = EVENT_TYPE_STYLES[type];
                  const TypeIcon = EVENT_TYPE_ICONS[type];
                  return (
                    <button key={type} onClick={() => setFormData(p => ({ ...p, type }))}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                        formData.type === type
                          ? `${styles.badge} border-current`
                          : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}>
                      <TypeIcon className="w-4 h-4" />
                      <span className="text-[7px] font-black uppercase tracking-wider">{EVENT_TYPE_LABELS[type]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Color del Evento</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_COLORS.map(c => (
                  <button key={c.key} onClick={() => setFormData(p => ({ ...p, color: c.key }))}
                    className={`w-7 h-7 rounded-full ${c.dot} transition-all ${
                      formData.color === c.key ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ' + c.ring : 'opacity-50 hover:opacity-80'
                    }`}
                    title={c.key} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Hora</label>
              <input type="time" value={formData.time} onChange={e => setFormData(p => ({ ...p, time: e.target.value }))}
                className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Duración</label>
              <input type="text" value={formData.duration} onChange={e => setFormData(p => ({ ...p, duration: e.target.value }))}
                placeholder="ej. 1h, 45m"
                className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Descripción</label>
            <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3}
              placeholder="Descripción del evento"
              className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60 resize-none" />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">Asistentes</label>
            <input type="text" value={formData.attendees} onChange={e => setFormData(p => ({ ...p, attendees: e.target.value }))}
              placeholder="Nombres separados por coma"
              className="w-full px-4 py-3 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-2xl focus:border-accent-500/50 focus:ring-4 focus:ring-accent-500/5 outline-none transition-all font-bold text-sm text-slate-900 dark:text-white placeholder-slate-400/60" />
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
              className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all shadow-md">
              {editingEvent ? 'Actualizar Evento' : 'Crear Evento'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Event detail Modal */}
      <Modal
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title ?? ''}
        icon={<CalendarIcon className="w-5 h-5 text-accent-500" />}
        size="sm"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {(() => {
                const styles = getEventStyles(selectedEvent);
                const TypeIcon = EVENT_TYPE_ICONS[selectedEvent.type] || Ellipsis;
                return (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${styles.badge}`}>
                    <TypeIcon className="w-3 h-3" />
                    {EVENT_TYPE_LABELS[selectedEvent.type] || 'Otro'}
                  </span>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/30">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fecha</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedEvent.date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/30">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Horario</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedEvent.time} ({selectedEvent.duration})</p>
              </div>
            </div>
            {selectedEvent.description && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/30">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Descripción</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedEvent.description}</p>
              </div>
            )}
            {selectedEvent.attendees && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-700/30">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Asistentes
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedEvent.attendees}</p>
              </div>
            )}
            <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => {
                setEditingEvent(selectedEvent);
                setFormData({ title: selectedEvent.title, time: selectedEvent.time, duration: selectedEvent.duration, description: selectedEvent.description, attendees: selectedEvent.attendees, type: selectedEvent.type, color: selectedEvent.color });
                setSelectedEvent(null);
              }}
                className="flex-1 py-3.5 bg-accent-500/10 text-accent-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-accent-500/20 transition-all border border-accent-500/20 flex items-center justify-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5" />
                Editar Evento
              </button>
              <button onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="flex-1 py-3.5 bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20 flex items-center justify-center gap-2">
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
};
