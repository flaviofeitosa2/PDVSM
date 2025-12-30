
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  User, 
  Clock, 
  Plus, 
  Edit3,
  Trash2,
  Calendar,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  List
} from 'lucide-react';
import { Sale, UserProfile } from '../types';
import UserMenu from './UserMenu';
import OrdersFilterPanel, { OrderFilterState } from './OrdersFilterPanel';

interface OrdersScreenProps {
  sales: Sale[];
  userProfile: UserProfile;
  toggleSidebar: () => void;
  onLoadOrder: (sale: Sale) => void;
  onCreateNew: () => void;
  onCancelOrder: (saleId: string, reason: string) => void;
}

const OrdersScreen: React.FC<OrdersScreenProps> = ({ 
    sales, 
    userProfile,
    toggleSidebar,
    onLoadOrder,
    onCreateNew,
    onCancelOrder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Default Filters
  const [filters, setFilters] = useState<OrderFilterState>({
    startDate: '',
    endDate: '',
    quickPeriod: null,
    paymentMethods: [],
    onlyCancelled: false,
    status: ['pending'], // Default lock to pending
    selectedSellers: []
  });

  const getBrazilDate = (dateString?: string | Date) => {
      const date = dateString ? new Date(dateString) : new Date();
      return new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  };

  const filteredSales = useMemo(() => {
    let data = sales.filter(s => {
      // 1. CRITICAL: ONLY SHOW PENDING ORDERS
      if (s.status !== 'pending') return false;

      // 2. Search Query
      const matchesSearch = 
        s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.includes(searchQuery) ||
        (s.sellerName && s.sellerName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (!matchesSearch) return false;

      // 3. Date Range
      const saleDate = getBrazilDate(s.date);
      saleDate.setHours(0,0,0,0);

      if (filters.startDate) {
        const start = new Date(filters.startDate + 'T00:00:00');
        if (saleDate < start) return false;
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate + 'T23:59:59');
        if (saleDate > end) return false;
      }

      // 4. Sellers
      if (filters.selectedSellers.length > 0) {
        if (!filters.selectedSellers.includes(s.sellerName)) return false;
      }

      return true;
    });

    // Sort: Oldest pending first (to prioritize clearing queue) or Newest first? 
    // Usually newest first is better for UX.
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchQuery, filters]);

  // Statistics for KPIs (Only based on filtered pending items)
  const stats = useMemo(() => {
      const count = filteredSales.length;
      const totalPotential = filteredSales.reduce((acc, s) => acc + s.total, 0);
      const avgTicket = count > 0 ? totalPotential / count : 0;

      // Find oldest pending order
      let oldestDate = new Date();
      if (filteredSales.length > 0) {
          const dates = filteredSales.map(s => new Date(s.date).getTime());
          oldestDate = new Date(Math.min(...dates));
      }

      return { count, totalPotential, avgTicket, oldestDate };
  }, [filteredSales]);

  const handleCancelClick = (e: React.MouseEvent, sale: Sale) => {
      e.stopPropagation();
      if (window.confirm(`Tem certeza que deseja excluir o pedido #${sale.code}? Esta ação não pode ser desfeita.`)) {
          onCancelOrder(sale.id, 'Cancelado na tela de Pedidos Abertos');
      }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f3f4f6] relative">
      
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
             <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <List size={24} />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    Pedidos em Aberto
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full border border-amber-200 font-bold">
                        {stats.count}
                    </span>
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">Vendas salvas aguardando finalização.</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onCreateNew}
            className="hidden sm:flex bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-teal-500/20 items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            Novo Pedido
          </button>
          <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between relative overflow-hidden">
                  <div className="relative z-10">
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total em Aberto</p>
                      <h3 className="text-3xl font-extrabold text-gray-800">
                          {stats.totalPotential.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">Receita potencial</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl text-amber-500">
                      <ShoppingBag size={28} />
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-400"></div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Pedidos Salvos</p>
                      <h3 className="text-3xl font-extrabold text-gray-800">{stats.count}</h3>
                      <p className="text-xs text-gray-400 mt-1">Aguardando pagamento</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-500">
                      <Clock size={28} />
                  </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Pedido Mais Antigo</p>
                      <h3 className="text-lg font-bold text-gray-800 mt-1">
                          {stats.count > 0 ? stats.oldestDate.toLocaleDateString('pt-BR') : '-'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                          {stats.count > 0 ? stats.oldestDate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : ''}
                      </p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl text-rose-500">
                      <AlertCircle size={28} />
                  </div>
              </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
              <div className="flex items-center gap-3 w-full lg:w-auto">
                  <div className="relative flex-1 lg:w-96 group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2dd4bf] transition-colors" size={18} />
                      <input 
                          type="text" 
                          placeholder="Buscar pedido por cliente ou código..." 
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#2dd4bf] focus:ring-2 focus:ring-teal-50 transition-all text-sm font-medium"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                      />
                  </div>
                  <button 
                      onClick={() => setIsFilterOpen(true)}
                      className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors shadow-sm"
                      title="Filtros avançados"
                  >
                      <Filter size={20} />
                  </button>
              </div>
          </div>

          {/* Orders List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {filteredSales.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center text-gray-400">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                          <ShoppingBag size={40} className="text-gray-300" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-700 mb-1">Nenhum pedido pendente</h3>
                      <p className="text-sm">Todos os pedidos foram concluídos ou cancelados.</p>
                      <button 
                        onClick={onCreateNew}
                        className="mt-6 text-[#2dd4bf] font-bold hover:underline text-sm uppercase tracking-wide"
                      >
                          Iniciar nova venda
                      </button>
                  </div>
              ) : (
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50/50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                              <tr>
                                  <th className="px-6 py-4">Código / Data</th>
                                  <th className="px-6 py-4">Cliente</th>
                                  <th className="px-6 py-4">Vendedor</th>
                                  <th className="px-6 py-4 text-center">Itens</th>
                                  <th className="px-6 py-4 text-right">Total</th>
                                  <th className="px-6 py-4 text-right">Ação</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                              {filteredSales.map((sale) => {
                                  const dateObj = new Date(sale.date);
                                  
                                  return (
                                      <tr 
                                        key={sale.id} 
                                        className="hover:bg-amber-50/30 transition-colors group cursor-pointer"
                                        onClick={() => onLoadOrder(sale)}
                                      >
                                          <td className="px-6 py-4">
                                              <div className="flex flex-col">
                                                  <div className="flex items-center gap-2">
                                                      <span className="font-bold text-gray-900 text-sm bg-gray-100 px-2 py-0.5 rounded border border-gray-200">#{sale.code}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5 font-medium">
                                                      <Calendar size={12} />
                                                      {dateObj.toLocaleDateString('pt-BR')} • {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                  </div>
                                              </div>
                                          </td>
                                          
                                          <td className="px-6 py-4">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs border border-amber-200">
                                                      {sale.clientName.substring(0,2).toUpperCase()}
                                                  </div>
                                                  <div className="flex flex-col max-w-[200px]">
                                                      <span className="font-bold text-gray-800 text-sm truncate">{sale.clientName}</span>
                                                      <span className="text-xs text-gray-400 truncate">
                                                          {sale.clientCpf || 'Cliente Balcão'}
                                                      </span>
                                                  </div>
                                              </div>
                                          </td>

                                          <td className="px-6 py-4">
                                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                                  <User size={14} className="text-gray-400" />
                                                  {sale.sellerName}
                                              </div>
                                          </td>

                                          <td className="px-6 py-4 text-center">
                                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                                                  {sale.items.length}
                                              </span>
                                          </td>

                                          <td className="px-6 py-4 text-right">
                                              <span className="font-bold text-gray-900 text-base">
                                                  {sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                              </span>
                                          </td>

                                          <td className="px-6 py-4 text-right">
                                              <div className="flex justify-end gap-2 items-center">
                                                  <button 
                                                      onClick={(e) => handleCancelClick(e, sale)}
                                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                      title="Excluir Pedido"
                                                  >
                                                      <Trash2 size={18} />
                                                  </button>
                                                  
                                                  <button 
                                                      onClick={() => onLoadOrder(sale)}
                                                      className="flex items-center gap-2 bg-[#2dd4bf] hover:bg-[#14b8a6] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm shadow-teal-200 transition-all transform hover:scale-105"
                                                  >
                                                      Continuar
                                                      <ArrowRight size={16} />
                                                  </button>
                                              </div>
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-400 uppercase tracking-widest font-medium">
              {filteredSales.length} pedidos aguardando finalização
          </div>

      </div>

      <OrdersFilterPanel 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApplyFilters={setFilters}
        salesData={sales}
        currentFilters={filters}
      />
    </div>
  );
};

export default OrdersScreen;
