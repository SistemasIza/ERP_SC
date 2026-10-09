import { useState } from 'react';
import { Filter, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { SearchBar } from '../../../components/ui/SearchBar';
import { Badge } from '../../../components/ui/Badge';

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info' | 'success';
  service: string;
  message: string;
  details: string;
}

const mockLogs: SystemLog[] = [
  { id: 'LOG-001', timestamp: '2024-01-15 10:30:00', level: 'error', service: 'WhatsApp API', message: 'Connection timeout', details: 'Failed to connect to WhatsApp API after 30s' },
  { id: 'LOG-002', timestamp: '2024-01-15 10:25:00', level: 'warning', service: 'Instagram', message: 'Rate limit approaching', details: '95% of rate limit used' },
  { id: 'LOG-003', timestamp: '2024-01-15 10:20:00', level: 'info', service: 'Database', message: 'Backup completed', details: 'Daily backup completed successfully' },
  { id: 'LOG-004', timestamp: '2024-01-15 10:15:00', level: 'success', service: 'Payment Gateway', message: 'Payment processed', details: 'Payment PAY-001 processed successfully' },
  { id: 'LOG-005', timestamp: '2024-01-15 10:10:00', level: 'error', service: 'TikTok API', message: 'Authentication failed', details: 'Invalid API credentials' },
];

export const SystemLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const columns = [
    { key: 'timestamp', header: 'Fecha/Hora' },
    {
      key: 'level',
      header: 'Nivel',
      render: (value: string) => {
        const config: Record<string, { variant: 'danger' | 'warning' | 'info' | 'success'; icon: any }> = {
          error: { variant: 'danger', icon: XCircle },
          warning: { variant: 'warning', icon: AlertTriangle },
          info: { variant: 'info', icon: Info },
          success: { variant: 'success', icon: CheckCircle },
        };
        const { variant, icon: Icon } = config[value as keyof typeof config] || config.info;
        return (
          <Badge variant={variant} size="sm" icon={<Icon className="w-3 h-3" />}>
            {value}
          </Badge>
        );
      }
    },
    { key: 'service', header: 'Servicio' },
    { key: 'message', header: 'Mensaje' },
    { key: 'details', header: 'Detalles', render: (value: string) => value.substring(0, 40) + '...' },
  ];

  const filteredLogs = mockLogs.filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.service.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageContainer>
      <PageHeader title="Logs del Sistema" description="Errores, caídas de integraciones (WhatsApp, Instagram, etc.)" />
      <PageBody>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SearchBar
                placeholder="Buscar logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Filtros</Button>
            </div>
          </div>
          <DataTable
            data={filteredLogs}
            columns={columns}
            pagination={{ currentPage, totalPages: Math.ceil(filteredLogs.length / 10), onPageChange: setCurrentPage }}
          />
        </Card>
      </PageBody>
    </PageContainer>
  );
};
