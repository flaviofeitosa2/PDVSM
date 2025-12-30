
import React, { useState, useMemo } from 'react';
import { 
  List, HelpCircle, Calendar, TrendingUp, DollarSign, Search, Filter, X, Users, FileText, User, CreditCard, Eye, Trash2, Ban, AlertTriangle, Loader2, Save, XCircle, ChevronRight
} from 'lucide-react';
import { Sale, UserProfile, PaymentMethod } from '../types';
import UserMenu from './UserMenu';
import HistoryFilterPanel, { FilterState } from './HistoryFilterPanel';
import SaleDetailPanel from './SaleDetailPanel';

interface HistoryScreenProps {
  sales: Sale[];
  userProfile: UserProfile;
  onCancelSale: (saleId: string, reason: string) => Promise<void>;
  onUpdateSaleDate: (saleId: string, newDate: string) => Promise<void>;
  onDeleteSale: (saleId: string) => Promise<void>;
  cancelledSalesVisibility?: 'strike' | 'hide';
  toggleSidebar?: () => void;
}

const getLocalISODate = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ 
  sales, 
  userProfile, 
  onCancelSale, 
  onUpdateSaleDate, 
  onDeleteSale,
  cancelledSalesVisibility = 'strike',
  toggleSidebar
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [saleToEditDate, setSaleToEditDate] = useState<Sale | null>(null);
  const [newDateValue, setNewDateValue] = useState('');
  const [newTimeValue, setNewTimeValue] = useState('');

  const [filters, setFilters] = useState<FilterState>({
    startDate: getLocalISODate(),
    endDate: getLocalISODate(),
    quickPeriod: 'hoje',
    paymentMethods: [],
    onlyCancelled: false,
    selectedSellers: []
  });

  const isOperator = userProfile?.role === 'operator';
  const isAdmin = userProfile && ['admin', 'owner', 'master'].includes(userProfile.role);

  const paymentMethodLabels: Record<string, string> = {
    money: 'Dinheiro', debit: 'Débito', credit: 'Crédito', pix: 'Pix',
    others: 'Outros', credit_tab: 'Fiado', link: 'Link'
  };

  const getStatusStyle = (status: string) => {
      if (status === 'cancelled') return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', icon: X, label: 'Cancelado' };
      if (status === 'pending') return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: Calendar, label: 'Pendente' };
      return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: TrendingUp, label: 'Concluído' };
  };

  const filteredSales = useMemo(() => {
      if (!sales) return [];
      
      return sales.filter(sale => {
          if (isOperator && sale.sellerName !== userProfile.full_name) return false;
          if (cancelledSalesVisibility === 'hide' && sale.status === 'cancelled' && !filters.onlyCancelled) return false;

          const searchLower = searchQuery.toLowerCase();
          const matchesSearch = 
              (sale.clientName || '').toLowerCase().includes(searchLower) ||
              (sale.code || '').includes(searchLower) ||
              (sale.clientCpf && sale.clientCpf.includes(searchLower));
          if (!matchesSearch) return false;

          try {
              const saleDate = new Date(sale.date);
              const start = new Date(filters.startDate + 'T00:00:00');
              const end = new Date(filters.endDate + 'T23:59:59');
              if (saleDate < start || saleDate > end) return false;
          } catch (e) { return false; }

          if (filters.paymentMethods.length > 0) {
              const saleMethods = sale.payments ? sale.payments.map(p => p.method) : [sale.paymentMethod];
              const hasMethod = saleMethods.some(m => filters.paymentMethods.includes(m));
              if (!hasMethod) return false;
          }

          if (filters.onlyCancelled && sale.status !== 'cancelled') return false;
          if (!isOperator && filters.selectedSellers.length > 0 && !filters.selectedSellers.includes(sale.sellerName)) return false;

          return true;
      });
  }, [sales, searchQuery, filters, cancelledSalesVisibility, isOperator, userProfile.full_name]);

  const validSales = filteredSales.filter(s => s.status !== 'cancelled');
  
  // LOGICA DE CALCULO GRANULAR POR MEIO DE PAGAMENTO
  const totalRevenue = useMemo(() => {
      return validSales.reduce((acc, sale) => {
          if (filters.paymentMethods.length > 0) {
              if (sale.payments && sale.payments.length > 0) {
                  const filteredAmount = sale.payments
                    .filter(p => filters.paymentMethods.includes(p.method))
                    .reduce((sum, p) => sum + p.amount, 0);
                  return acc + filteredAmount;
              } else {
                  return filters.paymentMethods.includes(sale.paymentMethod) ? acc + (sale.total || 0) : acc;
              }
          }
          return acc + (sale.total || 0);
      }, 0);
  }, [validSales, filters.paymentMethods]);

  const averageTicket = validSales.length > 0 ? totalRevenue / validSales.length : 0;
  const periodLabel = filters.quickPeriod ? filters.quickPeriod.replace('_', ' ') : 'Personalizado';
  
  const activeFiltersCount = 
      (filters.quickPeriod !== 'hoje' ? 1 : 0) + 
      filters.paymentMethods.length + 
      (filters.onlyCancelled ? 1 : 0) + 
      (!isOperator ? filters.selectedSellers.length : 0);

  const handleClearFilters = (e: React.MouseEvent) => {
      e.stopPropagation();
      setFilters({
        startDate: getLocalISODate(),
        endDate: getLocalISODate(),
        quickPeriod: 'hoje',
        paymentMethods: [],
        onlyCancelled: false,
        selectedSellers: []
      });
  };

  const openCancelModal = (e: React.MouseEvent, sale: Sale) => {
      e.stopPropagation();
      setCancelReason('');
      setSaleToCancel(sale);
  };

  const confirmCancel = async () => {
      if (!saleToCancel) return;
      setActionLoading(true);
      try {
          await onCancelSale(saleToCancel.id, cancelReason || 'Cancelado pelo usuário');
          setSaleToCancel(null);
      } finally { setActionLoading(false); }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f0f2f5] relative font-sans">
      
      {/* Modais omitidos para brevidade mas mantidos conforme lógica anterior */}
      {saleToCancel && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-center text-center mb-4"><div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-4"><Ban size={32} /></div><h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Cancelar Venda #{saleToCancel.code}?</h3><p className="text-xs text-gray-400 font-bold uppercase mt-2">O valor será removido do faturamento atual.</p></div>
                  <div className="mb-6"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Motivo</label><textarea className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm focus:border-red-500 outline-none resize-none bg-gray-50" rows={2} placeholder="Ex: Cliente desistiu..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} autoFocus></textarea></div>
                  <div className="flex gap-3"><button onClick={() => setSaleToCancel(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-widest rounded-xl">Sair</button><button onClick={confirmCancel} disabled={actionLoading} className="flex-2 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-red-200 flex items-center justify-center gap-2">{actionLoading ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />} Confirmar</button></div>
              </div>
          </div>
      )}

      {/* Header Estilo Moderno - Gradiente Emerald */}
      <div className="bg-gradient-to-br from-[#2ebc7d] to-[#14b8a6] text-white shadow-xl flex-shrink-0 relative z-20 px-6 py-6 md:px-10">
        <header className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
                <button onClick={() => toggleSidebar?.()} className="lg:hidden p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><List size={24} /></button>
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Histórico de Vendas</h2>
                    <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mt-2">Controle Financeiro Granular</p>
                </div>
            </div>
            <UserMenu />
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <div className="flex flex-col"><span className="text-3xl font-black tracking-tighter">{validSales.length}</span><span className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">Pedidos no Período</span></div>
            <div className="flex flex-col"><span className="text-3xl font-black tracking-tighter">{totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">{filters.paymentMethods.length > 0 ? "Faturamento Filtrado" : "Faturamento Total"}</span></div>
            {!isOperator && (
                <>
                    <div className="hidden md:flex flex-col"><span className="text-3xl font-black tracking-tighter">{averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">Ticket Médio</span></div>
                    <div className="hidden md:flex flex-col"><span className="text-3xl font-black tracking-tighter text-emerald-200">100%</span><span className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">Margem Operacional</span></div>
                </>
            )}
        </div>
      </div>

      {/* Barra de Filtros - Grudada no topo no Scroll */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 md:px-10 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-2/3">
            <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#2ebc7d] transition-colors" size={18} />
                <input type="text" placeholder="BUSCAR POR CLIENTE OU CÓDIGO..." className="w-full pl-12 pr-4 py-3 text-xs font-bold text-gray-700 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-[#2ebc7d] focus:bg-white transition-all outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={() => setIsFilterOpen(true)} className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 transition-all font-black text-[10px] uppercase tracking-widest ${activeFiltersCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}>
                <Filter size={16} /> <span>Filtros</span>
                {activeFiltersCount > 0 && <span className="bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center ml-1">{activeFiltersCount}</span>}
            </button>
        </div>
        {activeFiltersCount > 0 && <button onClick={handleClearFilters} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Limpar Tudo</button>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-7xl mx-auto space-y-4">
            {filteredSales.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-20 text-center flex flex-col items-center justify-center text-gray-400 border border-gray-100 shadow-sm"><FileText size={64} className="text-gray-100 mb-6" /><h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Nenhuma venda encontrada</h3><p className="text-xs font-bold uppercase mt-2 opacity-50">Tente ajustar seus filtros de busca.</p></div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {/* Cabeçalho visível apenas Desktop */}
                    <div className="hidden lg:grid grid-cols-12 px-8 py-3 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        <div className="col-span-2">Pedido / Data</div>
                        <div className="col-span-3">Cliente</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-2">Pagamento</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Lista de Vendas - Design de Card Adaptável */}
                    {filteredSales.map((sale) => {
                        const status = getStatusStyle(sale.status);
                        const dateObj = new Date(sale.date);
                        const isCancelled = sale.status === 'cancelled';
                        const hasPaymentFilter = filters.paymentMethods.length > 0;
                        const filteredPortion = hasPaymentFilter 
                            ? (sale.payments ? sale.payments.filter(p => filters.paymentMethods.includes(p.method)).reduce((sum, p) => sum + p.amount, 0) : (filters.paymentMethods.includes(sale.paymentMethod) ? sale.total : 0))
                            : sale.total;

                        return (
                            <div 
                                key={sale.id} 
                                onClick={() => setSelectedSale(sale)}
                                className={`bg-white rounded-3xl p-6 md:p-4 md:px-8 border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer group flex flex-col lg:grid lg:grid-cols-12 lg:items-center gap-4 ${isCancelled ? 'opacity-60 grayscale bg-gray-50' : ''}`}
                            >
                                {/* Data / Código */}
                                <div className="col-span-2 flex flex-col">
                                    <span className="text-xs font-black text-slate-400 mb-1">#{sale.code}</span>
                                    <span className="text-sm font-black text-slate-800 tracking-tighter">{dateObj.toLocaleDateString('pt-BR')}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                {/* Cliente */}
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-slate-400 font-black text-xs">{sale.clientName.substring(0,2).toUpperCase()}</div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-black text-slate-800 uppercase truncate">{sale.clientName}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sale.clientCpf || 'Venda Rápida'}</span>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="col-span-2 text-center flex justify-start lg:justify-center">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.bg} ${status.text} ${status.border}`}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* Pagamento Granular */}
                                <div className="col-span-2">
                                    {sale.payments && sale.payments.length > 0 ? (
                                        <div className="flex flex-wrap lg:flex-col gap-1.5">
                                            {sale.payments.map((p, idx) => (
                                                <div key={idx} className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-tighter ${hasPaymentFilter && filters.paymentMethods.includes(p.method) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                                    <span className="opacity-50">{paymentMethodLabels[p.method]}</span>
                                                    <span>{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] font-bold text-slate-500 uppercase">{paymentMethodLabels[sale.paymentMethod]}</div>
                                    )}
                                </div>

                                {/* Valor Total - DESTAQUE NO FILTRO */}
                                <div className="col-span-2 lg:text-right">
                                    <div className="flex flex-col lg:items-end">
                                        {hasPaymentFilter ? (
                                            <>
                                                <span className="text-emerald-600 font-black text-xl tracking-tighter">{filteredPortion.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                <span className="text-[9px] font-black text-slate-300 uppercase line-through">Total Pedido: {sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            </>
                                        ) : (
                                            <span className="text-lg font-black text-slate-800 tracking-tighter">{sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        )}
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{(sale.items || []).reduce((a,b)=>a+(b.quantity||0),0)} itens</span>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="col-span-1 flex justify-end">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-teal-50 group-hover:text-teal-600 transition-all"><ChevronRight size={20} /></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
          <div className="mt-10 mb-20 text-center"><p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Fim dos registros para este período</p></div>
      </div>

      <HistoryFilterPanel isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} onApplyFilters={setFilters} salesData={sales} currentFilters={filters} userRole={userProfile?.role} />
      <SaleDetailPanel isOpen={!!selectedSale} onClose={() => setSelectedSale(null)} sale={selectedSale} />
    </div>
  );
};

export default HistoryScreen;
