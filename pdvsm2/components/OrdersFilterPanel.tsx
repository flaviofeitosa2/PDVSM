
import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Calendar, Check } from 'lucide-react';
import { PaymentMethod, Sale } from '../types';

export interface OrderFilterState {
  startDate: string;
  endDate: string;
  quickPeriod: string | null;
  paymentMethods: PaymentMethod[];
  onlyCancelled: boolean;
  status: ('completed' | 'pending' | 'cancelled')[];
  selectedSellers: string[];
}

interface OrdersFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: OrderFilterState) => void;
  salesData: Sale[];
  currentFilters: OrderFilterState;
}

// Helper para formatar data localmente
const toLocalISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const OrdersFilterPanel: React.FC<OrdersFilterPanelProps> = ({ 
  isOpen, 
  onClose, 
  onApplyFilters,
  salesData,
  currentFilters
}) => {
  const [filters, setFilters] = useState<OrderFilterState>(currentFilters);
  const [isStatusOpen, setIsStatusOpen] = useState(true);
  const [isSellersOpen, setIsSellersOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  const uniqueSellers: string[] = Array.from<string>(new Set(salesData.map(s => s.sellerName))).sort();

  const paymentOptions: { id: PaymentMethod; label: string }[] = [
    { id: 'pix', label: 'Pix' },
    { id: 'money', label: 'Dinheiro' },
    { id: 'debit', label: 'Cartão de Débito' },
    { id: 'credit', label: 'Cartão de Crédito' },
    { id: 'others', label: 'Cheque' },
    { id: 'others', label: 'Voucher' }, // Mapeamento visual
    { id: 'others', label: 'Outros' },
    { id: 'credit_tab', label: 'Venda Fiado' },
    { id: 'link', label: 'Link de Pagamento' },
  ];

  // Remove duplicates for display if mapping causes them
  const uniquePaymentOptions = paymentOptions.filter((v,i,a)=>a.findIndex(t=>(t.label === v.label))===i);

  const handleQuickPeriod = (period: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'hoje': break; // start/end are today
      case 'ontem':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'ultimos_30':
        start.setDate(today.getDate() - 30);
        break;
      case 'esta_semana':
        start.setDate(today.getDate() - today.getDay());
        break;
      case 'semana_passada':
        start.setDate(today.getDate() - today.getDay() - 7);
        end.setDate(today.getDate() - today.getDay() - 1);
        break;
      case 'este_mes':
        start.setDate(1);
        break;
      case 'mes_passado':
        start.setMonth(today.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      case 'este_ano':
        start.setMonth(0, 1);
        break;
      case 'ano_passado':
        start.setFullYear(today.getFullYear() - 1, 0, 1);
        end.setFullYear(today.getFullYear() - 1, 11, 31);
        break;
    }

    setFilters(prev => ({
      ...prev,
      startDate: toLocalISO(start),
      endDate: toLocalISO(end),
      quickPeriod: prev.quickPeriod === period ? null : period
    }));
  };

  const togglePaymentMethod = (method: PaymentMethod) => {
    setFilters(prev => {
      const exists = prev.paymentMethods.includes(method);
      return {
        ...prev,
        paymentMethods: exists 
          ? prev.paymentMethods.filter(p => p !== method)
          : [...prev.paymentMethods, method]
      };
    });
  };

  const toggleStatus = (status: 'completed' | 'pending' | 'cancelled') => {
      setFilters(prev => {
          const exists = prev.status.includes(status);
          return {
              ...prev,
              status: exists ? prev.status.filter(s => s !== status) : [...prev.status, status]
          };
      });
  };

  const toggleSeller = (seller: string) => {
    setFilters(prev => {
      const exists = prev.selectedSellers.includes(seller);
      return {
        ...prev,
        selectedSellers: exists
          ? prev.selectedSellers.filter(s => s !== seller)
          : [...prev.selectedSellers, seller]
      };
    });
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 z-[60] transition-opacity"
          onClick={onClose}
        />
      )}

      <div className={`fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Filtros</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Period */}
          <section>
            <h3 className="font-bold text-gray-800 mb-4 text-base">Período</h3>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                 <label className="text-xs text-gray-500 mb-1 block">Inicial</label>
                 <div className="relative">
                    <input 
                        type="date" 
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]"
                        value={filters.startDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, quickPeriod: null }))}
                    />
                 </div>
              </div>
              <div className="relative flex-1">
                 <label className="text-xs text-gray-500 mb-1 block">Final</label>
                 <div className="relative">
                    <input 
                        type="date" 
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf]"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, quickPeriod: null }))}
                    />
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               {[
                 { id: 'ultimos_30', label: 'Últimos 30 dias' }, { id: 'hoje', label: 'Hoje' },
                 { id: 'ontem', label: 'Ontem' }, { id: 'esta_semana', label: 'Esta semana' },
                 { id: 'semana_passada', label: 'Semana passada' }, { id: 'este_mes', label: 'Este mês' },
                 { id: 'mes_passado', label: 'Mês passado' }, { id: 'este_ano', label: 'Este ano' },
                 { id: 'ano_passado', label: 'Ano passado' },
               ].map((item) => (
                 <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filters.quickPeriod === item.id ? 'bg-[#2dd4bf] border-[#2dd4bf]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                        {filters.quickPeriod === item.id && <Check size={14} className="text-white" />}
                    </div>
                    <input type="radio" name="quickPeriod" className="hidden" checked={filters.quickPeriod === item.id} onChange={() => handleQuickPeriod(item.id)} />
                    <span className="text-sm text-gray-600">{item.label}</span>
                 </label>
               ))}
            </div>
          </section>
          
          <hr className="border-gray-100" />

          {/* Payment Methods */}
          <section>
            <h3 className="font-bold text-gray-800 mb-4 text-base">Meio de Pagamento</h3>
            <div className="grid grid-cols-2 gap-3">
              {uniquePaymentOptions.map((item, idx) => (
                <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                   <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filters.paymentMethods.includes(item.id) ? 'bg-[#2dd4bf] border-[#2dd4bf]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                        {filters.paymentMethods.includes(item.id) && <Check size={14} className="text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={filters.paymentMethods.includes(item.id)} onChange={() => togglePaymentMethod(item.id)} />
                    <span className="text-sm text-gray-600">{item.label}</span>
                </label>
              ))}
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Cancelled Toggle */}
          <section>
            <h3 className="font-bold text-gray-800 mb-4 text-base">Pedidos Cancelados</h3>
            <label className="flex items-center gap-3 cursor-pointer">
               <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${filters.onlyCancelled ? 'bg-[#2dd4bf]' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${filters.onlyCancelled ? 'translate-x-5' : 'translate-x-0'}`}></div>
               </div>
               <input type="checkbox" className="hidden" checked={filters.onlyCancelled} onChange={() => setFilters(prev => ({ ...prev, onlyCancelled: !prev.onlyCancelled }))} />
               <span className="text-sm font-medium text-gray-700">Somente pedidos cancelados</span>
            </label>
          </section>

          <hr className="border-gray-100" />

          {/* Status Accordion */}
          <section>
             <button onClick={() => setIsStatusOpen(!isStatusOpen)} className="flex items-center justify-between w-full group mb-2">
                <h3 className="font-bold text-gray-800 text-base">Status de Pedidos</h3>
                {isStatusOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
             </button>
             {isStatusOpen && (
                 <div className="space-y-3 mt-3 animate-in slide-in-from-top-2">
                     {[
                         { id: 'completed', label: 'Pago' },
                         { id: 'pending', label: 'Pendente' },
                         { id: 'cancelled', label: 'Cancelado' }
                     ].map((st) => (
                        <label key={st.id} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filters.status.includes(st.id as any) ? 'bg-[#2dd4bf] border-[#2dd4bf]' : 'border-gray-300'}`}>
                                {filters.status.includes(st.id as any) && <Check size={14} className="text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={filters.status.includes(st.id as any)} onChange={() => toggleStatus(st.id as any)} />
                            <span className="text-sm text-gray-600">{st.label}</span>
                        </label>
                     ))}
                 </div>
             )}
          </section>

          <hr className="border-gray-100" />

          {/* Sellers Accordion */}
          <section>
             <button onClick={() => setIsSellersOpen(!isSellersOpen)} className="flex items-center justify-between w-full group mb-2">
                <h3 className="font-bold text-gray-800 text-base">Vendedores</h3>
                {isSellersOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
             </button>
             {isSellersOpen && (
               <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                 {uniqueSellers.length === 0 ? (
                   <p className="text-sm text-gray-400 italic">Nenhum vendedor encontrado.</p>
                 ) : (
                   uniqueSellers.map((seller) => (
                     <label key={seller} className="flex items-center gap-3 cursor-pointer group">
                         <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${filters.selectedSellers.includes(seller) ? 'bg-[#2dd4bf] border-[#2dd4bf]' : 'border-gray-300'}`}>
                              {filters.selectedSellers.includes(seller) && <Check size={14} className="text-white" />}
                          </div>
                          <input type="checkbox" className="hidden" checked={filters.selectedSellers.includes(seller)} onChange={() => toggleSeller(seller)} />
                          <span className="text-sm text-gray-600">{seller}</span>
                     </label>
                   ))
                 )}
               </div>
             )}
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 flex gap-3">
           <button 
             onClick={onClose}
             className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-lg transition-colors"
           >
             Descartar
           </button>
           <button 
             onClick={() => { onApplyFilters(filters); onClose(); }}
             className="flex-1 bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold py-3 rounded-lg transition-colors"
           >
             Filtrar
           </button>
        </div>
      </div>
    </>
  );
};

export default OrdersFilterPanel;
