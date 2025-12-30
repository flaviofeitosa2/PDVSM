
import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Minus, 
  Plus, 
  ShoppingCart, 
  User, 
  ChevronRight, 
  Edit2, 
  Search,
  UserPlus,
  Loader2,
  Check,
  ArrowLeft,
  CalendarCheck,
  AlertCircle
} from 'lucide-react';
import { CartItem, Customer, Product, Subscription } from '../types';
import DiscountModal from './DiscountModal';
import { supabase } from '../supabaseClient';

interface CartProps {
  items: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  discount: number;
  onApplyDiscount: (discount: number) => void;
  addToCart: (product: Product, meta?: any) => void;
  allProducts: Product[];
  onRegisterCustomer: (customer: Customer) => Promise<Customer | null>;
}

const Cart: React.FC<CartProps> = ({
  items,
  updateQuantity,
  removeFromCart,
  clearCart,
  isOpen,
  onClose,
  onCheckout,
  customers,
  selectedCustomer,
  onSelectCustomer,
  discount,
  onApplyDiscount,
  addToCart,
  onRegisterCustomer
}) => {
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  
  // Estados para a Gaveta de Seleção de Cliente
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState('');

  // Estados para Assinaturas
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);

  // Estados para o Cadastro Rápido de Cliente
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCpf, setQuickCpf] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Efeito para verificar assinatura quando o cliente é selecionado
  useEffect(() => {
    const checkSubscription = async () => {
      if (!selectedCustomer) {
        setActiveSubscription(null);
        return;
      }

      setLoadingSub(true);
      try {
        // Busca a assinatura mais recente (pendente ou ativa) do cliente
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('customer_id', selectedCustomer.id)
          .eq('status', 'active')
          .order('end_date', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setActiveSubscription(data[0] as Subscription);
        } else {
          setActiveSubscription(null);
        }
      } catch (err) {
        console.error("Erro ao verificar assinatura:", err);
      } finally {
        setLoadingSub(false);
      }
    };

    checkSubscription();
  }, [selectedCustomer]);

  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const filteredCustomers = useMemo(() => {
    const query = drawerSearch.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(query) ||
      (c.cpf && c.cpf.includes(query)) ||
      (c.phone && c.phone.includes(query)) ||
      (c.fantasyName && c.fantasyName.toLowerCase().includes(query))
    );
  }, [customers, drawerSearch]);

  const quickFilteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.cpf && c.cpf.includes(customerSearch))
  ).slice(0, 5);

  const maskCpf = (v: string) => {
    v = v.replace(/\D/g, '');
    if (v.length <= 11) return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v.substring(0, 14);
  };

  const handleQuickRegister = async () => {
    if (!quickName.trim()) return alert("O nome é obrigatório.");
    setIsSavingCustomer(true);
    try {
      const newCustomer = await onRegisterCustomer({
        id: '', 
        name: quickName,
        cpf: quickCpf,
        avatarText: quickName.substring(0, 2).toUpperCase(),
        balance: 0,
        phone: '',
        email: '',
        createdAt: new Date().toISOString()
      } as Customer);

      if (newCustomer) {
        onSelectCustomer(newCustomer);
        setIsQuickAddOpen(false);
        setIsCustomerDrawerOpen(false);
        setQuickName('');
        setQuickCpf('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const addSubscriptionToCart = () => {
    if (!activeSubscription) return;
    
    // Verifica se já existe esse item no carrinho
    const alreadyInCart = items.some(i => i.subscriptionReconciliationId === activeSubscription.id);
    if (alreadyInCart) return alert("Esta parcela de assinatura já está no carrinho.");

    // Fixed error: manageStock does not exist in type 'Product', changed to 'manage_stock'
    const subProduct: Product = {
      id: `SUB-${activeSubscription.id}`,
      code: 'ASSINATURA',
      name: `MENSALIDADE: ${activeSubscription.provider}`,
      category: 'Serviços',
      price: activeSubscription.value,
      image: 'https://cdn-icons-png.flaticon.com/512/2991/2991106.png',
      manage_stock: false
    };

    const periodDate = new Date(activeSubscription.end_date);
    const periodName = periodDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

    addToCart(subProduct, {
      id: activeSubscription.id,
      period: periodName
    });
  };

  return (
    <>
      {/* Backdrop apenas mobile */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[40] transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Container Carrinho */}
      <div className={`
        fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[50] transform transition-transform duration-300 flex flex-col
        lg:static lg:translate-x-0 lg:w-[400px] lg:border-l lg:border-gray-200 lg:shadow-none
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart size={24} className="text-gray-800" />
              <span className="absolute -top-2 -right-2 bg-[#2dd4bf] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">Carrinho</h2>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
                <button onClick={clearCart} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Limpar carrinho">
                    <Trash2 size={18} />
                </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors lg:hidden">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Customer Selection Area */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <User size={14} /> Cliente
                    </h3>
                    {selectedCustomer && (
                        <button onClick={() => onSelectCustomer(null)} className="text-xs text-red-500 hover:underline">Remover</button>
                    )}
                </div>
                
                {selectedCustomer ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                {selectedCustomer.avatarText || 'US'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-800 truncate">{selectedCustomer.name}</p>
                                <p className="text-xs text-gray-500 truncate">{selectedCustomer.cpf || 'Sem documento'}</p>
                            </div>
                            {loadingSub && <Loader2 size={16} className="animate-spin text-indigo-500" />}
                        </div>

                        {/* Subscriber Logic & Auto-abatement UI */}
                        {activeSubscription && !loadingSub && (
                            <div className={`p-3 rounded-lg border animate-in slide-in-from-top-2 duration-300 ${activeSubscription.payment_date ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CalendarCheck size={16} className={activeSubscription.payment_date ? 'text-emerald-600' : 'text-indigo-600'} />
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${activeSubscription.payment_date ? 'text-emerald-700' : 'text-indigo-700'}`}>
                                            {activeSubscription.payment_date ? 'Assinatura em Dia' : 'Assinatura Pendente'}
                                        </span>
                                    </div>
                                    {!activeSubscription.payment_date && (
                                        <button 
                                            onClick={addSubscriptionToCart}
                                            className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-1 rounded hover:bg-indigo-700 transition-colors"
                                        >
                                            ADICIONAR PARCELA
                                        </button>
                                    )}
                                </div>
                                <p className="text-[11px] text-gray-600 mt-1 font-medium">
                                    Plano: <span className="font-bold">{activeSubscription.provider}</span> • Valor: <span className="font-bold">{activeSubscription.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </p>
                            </div>
                        )}
                        
                        {!activeSubscription && !loadingSub && selectedCustomer.isSubscriber && (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
                                <AlertCircle size={16} className="text-amber-600" />
                                <span className="text-[10px] font-bold text-amber-700 uppercase">Assinatura não configurada</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar cliente..." 
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm outline-none focus:border-[#2dd4bf] transition-all"
                                    value={customerSearch}
                                    onChange={(e) => {
                                        setCustomerSearch(e.target.value);
                                        setIsCustomerSearchOpen(true);
                                    }}
                                    onFocus={() => setIsCustomerSearchOpen(true)}
                                />
                            </div>
                            <button 
                              onClick={() => {
                                setDrawerSearch('');
                                setIsCustomerDrawerOpen(true);
                              }}
                              className="bg-[#2dd4bf] text-white p-2.5 rounded-lg hover:bg-[#25b5a3] transition-colors shadow-sm"
                              title="Selecionar Cliente"
                            >
                                <UserPlus size={18} />
                            </button>
                        </div>
                        
                        {isCustomerSearchOpen && customerSearch && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                {quickFilteredCustomers.length > 0 ? (
                                    quickFilteredCustomers.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                onSelectCustomer(c);
                                                setCustomerSearch('');
                                                setIsCustomerSearchOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                                                {c.avatarText || 'US'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">{c.name}</p>
                                                <p className="text-xs text-gray-400">{c.cpf || 'Sem CPF'}</p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-400 text-sm">Nenhum cliente encontrado</div>
                                )}
                            </div>
                        )}
                        {isCustomerSearchOpen && (
                            <div className="fixed inset-0 z-10" onClick={() => setIsCustomerSearchOpen(false)} />
                        )}
                    </div>
                )}
            </div>

            {/* Items List */}
            <div className="space-y-4">
                {items.length === 0 ? (
                    <div className="text-center py-10">
                        <ShoppingCart size={48} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-medium">Seu carrinho está vazio</p>
                        <p className="text-sm text-gray-300 mt-1">Adicione produtos para começar a venda</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className={`flex gap-4 p-4 bg-white border rounded-xl shadow-sm transition-all group ${item.subscriptionReconciliationId ? 'border-indigo-200 bg-indigo-50/20' : 'border-gray-100 hover:border-[#2dd4bf]/30'}`}>
                            <div className="w-16 h-16 bg-gray-50 rounded-lg flex-shrink-0 overflow-hidden border border-gray-100">
                                <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight flex items-center gap-2">
                                        {item.subscriptionReconciliationId && <CalendarCheck size={14} className="text-indigo-600 flex-shrink-0" />}
                                        {item.name}
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-1">Unit: {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    {item.period_name && <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded font-black mt-1 inline-block uppercase tracking-wider">{item.period_name}</span>}
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                    <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                                        <button 
                                            onClick={() => updateQuantity(item.id, -1)} 
                                            disabled={!!item.subscriptionReconciliationId} // Assinatura é sempre 1 unidade
                                            className={`p-1.5 transition-colors ${item.subscriptionReconciliationId ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-500'}`}
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                                        <button 
                                            onClick={() => updateQuantity(item.id, 1)} 
                                            disabled={!!item.subscriptionReconciliationId} // Assinatura é sempre 1 unidade
                                            className={`p-1.5 transition-colors ${item.subscriptionReconciliationId ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-50 text-gray-500'}`}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)] z-10 flex-shrink-0">
            <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 text-xs font-medium uppercase">Subtotal</span>
                <span className="text-gray-500 text-xs font-bold">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            
            <div className="flex justify-between items-center mb-4 h-6">
                {discount > 0 ? (
                    <>
                        <span className="text-red-500 text-xs font-bold uppercase">Desconto</span>
                        <div className="flex items-center gap-2">
                            <span className="text-red-500 text-xs font-bold">- {discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            <button onClick={() => setIsDiscountModalOpen(true)} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 rounded">
                                <Edit2 size={10} />
                            </button>
                        </div>
                    </>
                ) : (
                    <button 
                        onClick={() => setIsDiscountModalOpen(true)} 
                        disabled={items.length === 0}
                        className="text-[#2dd4bf] text-[10px] font-black uppercase hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        + Aplicar desconto
                    </button>
                )}
            </div>

            <div className="flex justify-between items-end mb-6">
                <span className="text-gray-800 font-black text-base uppercase">Total a Pagar</span>
                <span className="text-3xl font-black text-gray-900 tracking-tighter">
                    {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>

            <button 
                onClick={onCheckout} 
                disabled={items.length === 0} 
                className={`w-full py-4 rounded-xl font-black text-base uppercase flex items-center justify-center gap-2 transition-all shadow-sm ${items.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#2dd4bf] hover:bg-[#5eead4] text-white'}`}
            >
                IR PARA PAGAMENTO <ChevronRight size={20} strokeWidth={3} />
            </button>
        </div>
      </div>

      {/* GAVETA LATERAL DE SELEÇÃO DE CLIENTE */}
      {isCustomerDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-[2px]" onClick={() => setIsCustomerDrawerOpen(false)} />
          <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[110] transform transition-transform duration-300 ease-out flex flex-col animate-in slide-in-from-right duration-300`}>
            
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4 bg-white sticky top-0 z-10">
                <button onClick={() => setIsCustomerDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X size={24} />
                </button>
                
                <div className="flex-1 relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2dd4bf] transition-colors" size={20} />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Buscar cliente (Nome, CPF, Tel)" 
                      className="w-full bg-gray-50 border border-teal-400/30 rounded-xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:border-[#2dd4bf] focus:ring-4 focus:ring-teal-50 transition-all"
                      value={drawerSearch}
                      onChange={(e) => setDrawerSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-4">
                            <User size={32} />
                        </div>
                        <p className="text-gray-500 font-bold">Nenhum cliente encontrado</p>
                        <p className="text-xs text-gray-400 mt-1">Tente pesquisar por outros termos.</p>
                        
                        <button 
                          onClick={() => setIsQuickAddOpen(true)}
                          className="mt-6 text-[#2dd4bf] font-black uppercase text-xs hover:underline flex items-center gap-1"
                        >
                            <Plus size={14} /> Cadastrar Novo
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredCustomers.map(c => (
                            <button
                                key={c.id}
                                onClick={() => {
                                    onSelectCustomer(c);
                                    setIsCustomerDrawerOpen(false);
                                }}
                                className="w-full text-left px-6 py-4 hover:bg-teal-50/30 transition-colors flex items-center gap-4 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-200 group-hover:border-teal-200 transition-colors">
                                    {c.avatarText || 'US'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 uppercase truncate group-hover:text-teal-600 transition-colors">{c.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {c.cpf && <span className="text-[10px] font-mono text-gray-400 tracking-tighter">{c.cpf}</span>}
                                        {c.cpf && c.phone && <span className="w-1 h-1 bg-gray-300 rounded-full"></span>}
                                        {c.phone && <span className="text-[10px] text-gray-400 font-medium">{c.phone}</span>}
                                    </div>
                                </div>
                                {c.isSubscriber && <CalendarCheck size={16} className="text-indigo-400 mr-2" />}
                                <ChevronRight size={18} className="text-gray-300 group-hover:text-teal-400 transition-colors" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                <button 
                  onClick={() => setIsQuickAddOpen(true)}
                  className="w-full py-4 bg-white border border-[#2dd4bf] text-[#2dd4bf] font-black text-xs uppercase rounded-xl shadow-sm hover:bg-teal-50 transition-all flex items-center justify-center gap-2"
                >
                    <UserPlus size={18} /> Adicionar Novo Cliente
                </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Cadastro Rápido de Cliente */}
      {isQuickAddOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[150] backdrop-blur-sm" onClick={() => setIsQuickAddOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-[160] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-black text-gray-800 uppercase text-sm tracking-widest">Cadastro Rápido</h3>
              <button onClick={() => setIsQuickAddOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Completo *</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-[#2dd4bf] transition-all"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                />
              </div>
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">CPF / CNPJ</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:border-[#2dd4bf] transition-all"
                  value={quickCpf}
                  onChange={(e) => setQuickCpf(maskCpf(e.target.value))}
                />
              </div>
              
              <button 
                onClick={handleQuickRegister}
                disabled={isSavingCustomer || !quickName.trim()}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all shadow-lg ${isSavingCustomer || !quickName.trim() ? 'bg-gray-200 text-gray-400' : 'bg-[#2dd4bf] hover:bg-[#14b8a6] text-white shadow-teal-100'}`}
              >
                {isSavingCustomer ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} strokeWidth={4} />}
                {isSavingCustomer ? 'Salvando...' : 'Cadastrar e Selecionar'}
              </button>
            </div>
          </div>
        </>
      )}

      <DiscountModal 
        isOpen={isDiscountModalOpen} 
        onClose={() => setIsDiscountModalOpen(false)} 
        onApply={onApplyDiscount} 
        subtotal={subtotal} 
        initialDiscount={discount}
      />
    </>
  );
};

export default Cart;
