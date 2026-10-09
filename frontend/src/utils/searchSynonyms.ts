// Sistema de sinónimos para búsqueda inteligente de módulos
// Permite encontrar módulos usando palabras clave relacionadas

export interface ModuleSynonym {
  keywords: string[];
  path: string;
  label: string;
}

export const moduleSynonyms: ModuleSynonym[] = [
  // Dashboard
  {
    keywords: ['inicio', 'home', 'principal', 'resumen', 'panel', 'overview'],
    path: '/',
    label: 'Dashboard'
  },
  // Conversaciones
  {
    keywords: ['chat', 'chats', 'mensajes', 'conversacion', 'whatsapp', 'chatbot', 'bot'],
    path: '/conversations',
    label: 'Conversaciones'
  },
  // Clientes
  {
    keywords: ['cliente', 'clientes', 'contactos', 'customers', 'users', 'usuario'],
    path: '/clients',
    label: 'Clientes'
  },
  // Potenciales (Leads)
  {
    keywords: ['leads', 'prospectos', 'oportunidades', 'potenciales', 'ventas', 'clientes potenciales'],
    path: '/leads',
    label: 'Potenciales'
  },
  // Catálogos
  {
    keywords: ['catalogo', 'productos', 'items', 'inventario', 'catalogos', 'product'],
    path: '/catalogs',
    label: 'Catálogos'
  },
  // Promociones
  {
    keywords: ['promocion', 'promociones', 'descuento', 'descuentos', 'oferta', 'ofertas', 'promo'],
    path: '/promotions',
    label: 'Promociones'
  },
  // Analíticas
  {
    keywords: ['estadistica', 'estadisticas', 'analitica', 'analiticas', 'metricas', 'reporte', 'reportes', 'graficos', 'charts', 'analytics', 'statistics', 'data', 'datos'],
    path: '/analytics',
    label: 'Analíticas'
  },
  // Constructor de Bots
  {
    keywords: ['bot', 'bots', 'flujo', 'flujos', 'flow', 'flows', 'automatizacion', 'automatizaciones', 'chatbot', 'chatbots', 'ia', 'inteligencia artificial', 'dialogflow'],
    path: '/flow-manager',
    label: 'Constructor de Bots'
  },
  // Atención / Agentes
  {
    keywords: ['agente', 'agentes', 'soporte', 'support', 'team', 'equipo', 'atencion al cliente'],
    path: '/agents',
    label: 'Agentes'
  },
  // Base de Conocimiento
  {
    keywords: ['conocimiento', 'faq', 'preguntas', 'respuestas', 'knowledge', 'base', 'ayuda', 'help'],
    path: '/knowledge-base',
    label: 'Base Conocimiento'
  },
  // Notificaciones
  {
    keywords: ['notificacion', 'notificaciones', 'alerta', 'alertas', 'notification', 'alerts'],
    path: '/notifications',
    label: 'Notificaciones'
  },
  // Facturación
  {
    keywords: ['facturacion', 'factura', 'facturas', 'billing', 'pago', 'pagos', 'cobro', 'cobros'],
    path: '/billing',
    label: 'Facturación'
  },
  // Planes y Suscripciones
  {
    keywords: ['plan', 'planes', 'suscripcion', 'suscripciones', 'pricing', 'precio', 'precios'],
    path: '/billing/plans',
    label: 'Planes y Suscripciones'
  },
  // Pagos
  {
    keywords: ['pago', 'pagos', 'payment', 'transactions', 'transacciones', 'historial pagos'],
    path: '/billing/payments',
    label: 'Pagos'
  },
  // Uso/Consumo
  {
    keywords: ['uso', 'consumo', 'usage', 'estadisticas uso', 'metricas uso'],
    path: '/billing/usage',
    label: 'Uso/Consumo'
  },
  // Conexiones
  {
    keywords: ['conexion', 'conexiones', 'integracion', 'redes', 'social', 'connect'],
    path: '/connections',
    label: 'Conexiones'
  },
  // WhatsApp
  {
    keywords: ['whatsapp', 'wa', 'qr whatsapp', 'multi whatsapp', 'conectar whatsapp'],
    path: '/whatsapp-qr',
    label: 'WhatsApp'
  },
  // Instagram
  {
    keywords: ['instagram', 'ig', 'insta', 'conectar instagram'],
    path: '/instagram-config',
    label: 'Instagram'
  },
  // Messenger
  {
    keywords: ['messenger', 'facebook', 'fb', 'conectar messenger'],
    path: '/facebook-config',
    label: 'Messenger'
  },
  // Equipo
  {
    keywords: ['equipo', 'staff', 'empleados', 'colaboradores', 'team'],
    path: '/admin/staff',
    label: 'Equipo'
  },
  // Super Admin - Todas las Empresas
  {
    keywords: ['todas empresas', 'all companies', 'empresas todas', 'superadmin empresas'],
    path: '/superadmin/companies',
    label: 'Todas las Empresas'
  },
  // Super Admin - Métricas del Negocio
  {
    keywords: ['metricas negocio', 'business metrics', 'metricas globales', 'estadisticas negocio'],
    path: '/superadmin/business-metrics',
    label: 'Métricas del Negocio'
  },
  // Super Admin - Logs del Sistema
  {
    keywords: ['logs sistema', 'system logs', 'logs globales', 'errores sistema'],
    path: '/superadmin/system-logs',
    label: 'Logs del Sistema'
  }
];

/**
 * Busca módulos basándose en una consulta de texto
 * Soporta búsqueda por nombre del módulo y sinónimos
 */
export const searchModules = (query: string): ModuleSynonym[] => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  return moduleSynonyms.filter(module => {
    // Buscar coincidencia exacta en el label
    if (module.label.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    
    // Buscar coincidencia en keywords
    return module.keywords.some(keyword => 
      keyword.toLowerCase().includes(normalizedQuery) || 
      normalizedQuery.includes(keyword.toLowerCase())
    );
  });
};

/**
 * Obtiene sugerencias de búsqueda basadas en el input del usuario
 */
export const getSearchSuggestions = (query: string, limit: number = 5): string[] => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const results = searchModules(query);
  return results.slice(0, limit).map(r => r.label);
};
