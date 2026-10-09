import { useState } from 'react';
import { Download, Filter, Eye } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageContainer } from '../../../components/layout/PageContainer';
import { PageBody } from '../../../components/layout/PageBody';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { SearchBar } from '../../../components/ui/SearchBar';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { KebabMenu } from '../../../components/ui/KebabMenu';

interface Payment {
  id: string;
  customer: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  method: string;
  date: string;
  invoice: string;
}

const mockPayments: Payment[] = [
  { id: 'PAY-001', customer: 'Empresa ABC', amount: 79.00, status: 'paid', method: 'Stripe', date: '2024-01-15', invoice: 'INV-001' },
  { id: 'PAY-002', customer: 'Empresa XYZ', amount: 29.00, status: 'paid', method: 'PayPal', date: '2024-01-14', invoice: 'INV-002' },
  { id: 'PAY-003', customer: 'Empresa 123', amount: 199.00, status: 'pending', method: 'Stripe', date: '2024-01-13', invoice: 'INV-003' },
  { id: 'PAY-004', customer: 'Empresa 456', amount: 79.00, status: 'failed', method: 'Stripe', date: '2024-01-12', invoice: 'INV-004' },
];

export const Payments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'customer', header: 'Cliente' },
    { key: 'amount', header: 'Monto', render: (value: number) => `$${value.toFixed(2)}` },
    { key: 'status', header: 'Estado', render: (value: string) => <StatusBadge status={value} /> },
    { key: 'method', header: 'Método' },
    { key: 'date', header: 'Fecha' },
    { key: 'invoice', header: 'Factura' },
    {
      key: 'actions', header: '', className: 'w-12',
      render: () => (
        <KebabMenu actions={[
          { label: 'Ver detalle', icon: <Eye className="w-3.5 h-3.5" />, onClick: (e) => e.stopPropagation() },
          { label: 'Descargar', icon: <Download className="w-3.5 h-3.5" />, onClick: (e) => e.stopPropagation() },
        ]} />
      )
    },
  ];

  const filteredPayments = mockPayments.filter(payment =>
    payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageContainer>
      <PageHeader title="Pagos" description="Pasarela de pago e historial de cobros" />
      <PageBody>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SearchBar
                placeholder="Buscar pagos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>Filtros</Button>
            </div>
          </div>
          <DataTable
            data={filteredPayments}
            columns={columns}
            pagination={{ currentPage, totalPages: Math.ceil(filteredPayments.length / 10), onPageChange: setCurrentPage }}
          />
        </Card>
      </PageBody>
    </PageContainer>
  );
};
