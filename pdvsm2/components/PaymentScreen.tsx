
import React, { useState, useEffect, useMemo } from 'react';
/* Added missing icon imports: ShoppingBag, ChevronRight, List */
import { 
  ArrowLeft, 
  HelpCircle, 
  ChevronDown, 
  Plus, 
  ChevronUp, 
  Banknote, 
  CreditCard, 
  MoreHorizontal, 
  QrCode, 
  ArrowDownToLine, 
  Link as LinkIcon,
  Save,
  CheckCircle,
  AlertCircle,
  X,
  User,
  Search,
  UserPlus,
  Loader2,
  CalendarCheck,
  Calendar,
  Wallet,
  ArrowRight,
  HandCoins,
  ShoppingBag,
  ChevronRight,
  List
} from 'lucide-react';
import { CartItem, PaymentMethod, PaymentDetail, Customer, Subscription } from '../types';
import { supabase } from '../supabaseClient';
import UserMenu from './UserMenu';
import DiscountModal from './DiscountModal';

interface PaymentScreenProps {
  cartItems: CartItem[];
  subtotal: number;
  onBack: () => void;
  onComplete: (payments: PaymentDetail[], change: number, notes: string) => Promise<void> | void;
  onSaveOrder: (notes: string) => void;
  onDiscard: () => void;
  discount: number;
  onEditDiscount: (value: number) => void;
  customer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  allCustomers: Customer[];
  onRegisterCustomer: (customer: Customer) => Promise<Customer | null>;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({ 
  cartItems, 
  subtotal, 
  onBack, 
  onComplete,
  onSaveOrder,
  onDiscard,
  discount,
  onEditDiscount,
  customer,
  onSelectCustomer,
  allCustomers,
  onRegisterCustomer
}) => {
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [subscriptionItems, setSubscriptionItems] = useState<CartItem[]>([]);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerModalView, setCustomerModalView] = useState<'search' | 'create'>('search');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [newCustomerData, setNewCustomerData] = useState({ name: '', cpf: '', phone: '', email: '' });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const total = Number(Math.max(0, subtotal - discount).toFixed(2));
  
  // Estados para Pagamento
  const [primaryMethod, setPrimaryMethod] = useState<PaymentMethod>('money');
  const [primaryAmount, setPrimaryAmount] = useState<number>(total);
  const [secondaryMethod, setSecondaryMethod] = useState<PaymentMethod | null>(null);

  // Efeito para ajustar o valor inicial quando o total muda (ex: desconto aplicado)
  useEffect(() => {
    setPrimaryAmount(total);
    setSecondaryMethod(null);
  }, [total]);

  // Cálculos de saldo e troco em tempo real
  const remainingAmount = Number(Math.max(0, total - primaryAmount).toFixed(2));
  const change = primaryMethod === 'money' && primaryAmount > total ? Number((primaryAmount - total).toFixed(2)) : 0;
  
  const isSplitPayment = remainingAmount > 0;
  const isValid = !isSplitPayment || (isSplitPayment && secondaryMethod !== null);

  useEffect(() => {
    const subs = cartItems.filter(i => i.subscriptionReconciliationId);
    setSubscriptionItems(subs);
  }, [cartItems]);

  const handleFinish = async () => {
    if (!isValid || isProcessing) return;
    setIsProcessing(true);
    
    const payments: PaymentDetail[] = [];
    
    if (isSplitPayment) {
        payments.push({ method: primaryMethod, amount: primaryAmount });
        if (secondaryMethod) {
            payments.push({ method: secondaryMethod, amount: remainingAmount });
        }
    } else {
        payments.push({ method: primaryMethod, amount: Math.min(primaryAmount, total) });
    }
    
    try {
        await onComplete(payments, change, notes);
    } catch (error) {
        console.error(error);
        setIsProcessing(false);
    }
  };

  const handleQuickAmount = (val: number) => {
      setPrimaryAmount(val);
  };

  const maskCpfCnpj = (v: string) => {
    v = v.replace(/\D/g, '');
    if (v.length <= 11) return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return v.substring(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  };

  const handleQuickSaveCustomer = async () => {
      if (!newCustomerData.name.trim() || !newCustomerData.cpf.trim()) return alert("Preencha os campos obrigatórios.");
      setIsCreatingCustomer(true);
      try {
          const newCust = await onRegisterCustomer({ id: Math.random().toString(36).substr(2, 9), name: newCustomerData.name, cpf: newCustomerData.cpf, phone: newCustomerData.phone, email: newCustomerData.email, avatarText: newCustomerData.name.substring(0, 2).toUpperCase(), balance: 0, createdAt: new Date().toISOString() } as any);
          if (newCust) { onSelectCustomer(newCust); setIsCustomerModalOpen(false); setCustomerModalView('search'); }
      } finally { setIsCreatingCustomer(false); }
  };

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
    { id: 'money', label: 'Dinheiro', icon: Banknote }, 
    { id: 'pix', label: 'Pix', icon: QrCode },
    { id: 'debit', label: 'Débito', icon: CreditCard },
    { id: 'credit', label: 'Crédito', icon: CreditCard }, 
    { id: 'credit_tab', label: 'Fiado', icon: ArrowDownToLine },
    { id: 'link', label: 'Link', icon: LinkIcon },
    { id: 'others', label: 'Outros', icon: MoreHorizontal },
  ];

  const quickCashValues = useMemo(() => {
      const base = [total];
      [10, 20, 50, 100].forEach(v => {
          if (v > total) base.push(v);
      });
      return [...new Set(base)].sort((a, b) => a - b);
  }, [total]);

  return (
    <div className="flex flex-col h-full bg-[#f3f4f6] overflow-hidden relative">
      
      {isCustomerModalOpen && (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-40 z-[60]" onClick={() => setIsCustomerModalOpen(false)} />
            <div className={`fixed inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl z-[70] transform transition-transform duration-300 flex flex-col ${isCustomerModalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50"><h2 className="text-lg font-bold text-gray-800">{customerModalView === 'search' ? 'Selecionar Cliente' : 'Novo Cliente Rápido'}</h2><button onClick={() => setIsCustomerModalOpen(false)}><X size={20} /></button></div>
                <div className="flex-1 overflow-y-auto p-5">
                    {customerModalView === 'search' ? (
                        <><div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:border-[#2dd4bf]" value={customerSearchQuery} onChange={(e) => setCustomerSearchQuery(e.target.value)} autoFocus /></div><button onClick={() => setCustomerModalView('create')} className="w-full flex items-center justify-center gap-2 py-3 bg-[#2dd4bf] text-white font-bold rounded-lg mb-6 shadow-sm"><UserPlus size={18} /> Cadastrar Novo</button><div className="space-y-2">{allCustomers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())).map(c => (<div key={c.id} onClick={() => { onSelectCustomer(c); setIsCustomerModalOpen(false); }} className="flex items-center gap-3 p-3 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">{c.avatarText || (c.name ? c.name.substring(0, 2).toUpperCase() : '??')}</div><div className="min-w-0"><p className="font-bold text-gray-800 text-sm truncate">{c.name}</p><p className="text-xs text-gray-500 truncate">{c.cpf || 'Sem documento'}</p></div></div>))}</div></>
                    ) : (
                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-gray-500 block mb-1">Nome*</label><input className="w-full border rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2dd4bf]" value={newCustomerData.name} onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})} /></div>
                            <div><label className="text-xs font-bold text-gray-500 block mb-1">CPF*</label><input className="w-full border rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2dd4bf]" value={newCustomerData.cpf} onChange={(e) => setNewCustomerData({...newCustomerData, cpf: maskCpfCnpj(e.target.value)})} maxLength={18} /></div>
                            <div><label className="text-xs font-bold text-gray-500 block mb-1">E-mail</label><input type="email" className="w-full border rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2dd4bf]" value={newCustomerData.email} onChange={(e) => setNewCustomerData({...newCustomerData, email: e.target.value})} /></div>
                            <div className="pt-4 flex gap-3"><button onClick={() => setCustomerModalView('search')} className="flex-1 py-3 bg-white border rounded-lg">Voltar</button><button onClick={handleQuickSaveCustomer} disabled={isCreatingCustomer} className="flex-1 py-3 bg-[#2dd4bf] text-white font-bold rounded-lg flex items-center justify-center">{isCreatingCustomer ? <Loader2 className="animate-spin" /> : 'Salvar'}</button></div>
                        </div>
                    )}
                </div>
            </div>
        </>
      )}

      <DiscountModal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} onApply={onEditDiscount} subtotal={subtotal} initialDiscount={discount} />

      <header className="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-4"><button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600"><ArrowLeft size={24} /></button><h2 className="text-xl font-bold text-gray-800 uppercase tracking-tight">Finalizar Venda</h2></div>
        <UserMenu />
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Coluna da Esquerda: Resumo e Dados */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Bloco de Valor Total - Destaque Principal */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-gray-100 relative overflow-hidden group">
                <div className="relative z-10">
                    <span className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2 block">Total da Venda</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-300 italic">R$</span>
                        <h2 className="text-6xl font-black text-gray-900 tracking-tighter leading-none">
                            {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[0]}
                            <span className="text-3xl">,{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[1]}</span>
                        </h2>
                    </div>
                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-dashed border-gray-100">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Subtotal</span>
                            <span className="font-bold text-gray-700">{subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-rose-400 uppercase">Desconto</span>
                                <span className="font-bold text-rose-500">-{discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        )}
                        <button onClick={() => setIsDiscountModalOpen(true)} className="p-2 bg-gray-50 rounded-xl hover:bg-teal-50 text-teal-600 transition-colors"><Plus size={20}/></button>
                    </div>
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                    <ShoppingBag size={120} />
                </div>
            </div>

            {/* Cliente */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex justify-between items-center group hover:border-teal-200 transition-all">
              <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${!customer ? 'border-dashed border-gray-200 text-gray-300' : 'border-teal-100 bg-teal-50 text-teal-600'}`}>
                      <User size={24} />
                  </div>
                  <div>
                      <span className="text-gray-400 font-bold block text-[10px] uppercase tracking-widest">Cliente</span>
                      <span className={`font-black text-lg ${!customer ? 'text-gray-300 italic' : 'text-gray-800'}`}>{customer ? customer.name : 'Venda Rápida'}</span>
                  </div>
              </div>
              <button onClick={() => { setCustomerModalView('search'); setIsCustomerModalOpen(true); }} className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all shadow-sm">
                  <ChevronRight size={24} strokeWidth={3} />
              </button>
            </div>

            {/* Itens (Recolhível) */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <button onClick={() => setIsItemsExpanded(!isItemsExpanded)} className="w-full p-6 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                        <List size={20} className="text-gray-400" />
                        <span className="font-bold text-gray-700 text-sm uppercase tracking-widest">{cartItems.reduce((acc, item) => acc + item.quantity, 0)} itens</span>
                    </div>
                    {isItemsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {isItemsExpanded && (
                    <div className="border-t border-gray-50 bg-gray-50/30 p-6 space-y-3 max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2">
                        {cartItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                                <div className="flex flex-col">
                                    <span className="text-gray-800 font-bold uppercase text-xs">{item.name}</span>
                                    <span className="text-[10px] text-gray-400 font-medium">{item.quantity} x {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <span className="text-gray-800 font-black">{(item.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <label className="text-gray-400 font-bold text-[10px] uppercase tracking-widest block mb-2 ml-1">Observações do Pedido</label>
              <textarea 
                className="w-full border border-gray-100 bg-gray-50 rounded-2xl p-4 text-sm focus:outline-none focus:border-teal-500 focus:bg-white transition-all resize-none placeholder:text-gray-300 font-medium" 
                placeholder="Ex: Entregar para Maria..." 
                rows={2} 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
              />
            </div>
          </div>
          
          {/* Coluna da Direita: Pagamento */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-gray-50">
                <h3 className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <HandCoins size={14} /> Selecione o método de pagamento
                </h3>
                
                {/* Seleção de Meio Primário */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {paymentMethods.map(m => (
                        <button 
                            key={m.id} 
                            onClick={() => {
                                setPrimaryMethod(m.id);
                                if (m.id !== 'money') setPrimaryAmount(total);
                                setSecondaryMethod(null);
                            }} 
                            className={`flex flex-col items-center justify-center p-5 rounded-[1.5rem] border-2 transition-all active:scale-95 ${primaryMethod === m.id ? 'border-teal-500 bg-teal-50 text-teal-600 shadow-lg shadow-teal-500/10' : 'border-gray-100 bg-white text-gray-400 hover:border-teal-100 hover:text-gray-500'}`}
                        >
                            <m.icon size={26} className="mb-2" strokeWidth={2.5}/>
                            <span className="text-[10px] uppercase font-black tracking-tighter">{m.label}</span>
                        </button>
                    ))}
                </div>

                {/* Input de Valor Recebido */}
                <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                    <div className="flex justify-between items-center mb-4">
                        <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest ml-2">
                            {primaryMethod === 'money' ? 'Valor Entregue pelo Cliente' : 'Confirmar Valor do Lançamento'}
                        </label>
                        {primaryMethod === 'money' && (
                            <div className="flex gap-2">
                                {quickCashValues.map(v => (
                                    <button 
                                        key={v} 
                                        onClick={() => handleQuickAmount(v)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${primaryAmount === v ? 'bg-teal-600 text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-teal-500'}`}
                                    >
                                        {v === total ? 'Exato' : v}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-3xl font-black italic">R$</span>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={primaryAmount} 
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPrimaryAmount(val);
                                if (val >= total) setSecondaryMethod(null);
                            }}
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-6 pl-16 text-4xl font-black text-slate-800 outline-none focus:border-teal-500 transition-all shadow-sm" 
                            autoFocus
                            onFocus={(e) => e.target.select()}
                        />
                    </div>
                </div>

                {/* AREA DE RESULTADO: TROCO OU SALDO DEVEDOR */}
                <div className="mt-6">
                    {/* TROCO (Apenas se Dinheiro e valor > total) */}
                    {change > 0 && (
                        <div className="bg-emerald-500 rounded-[2rem] p-8 text-white shadow-2xl shadow-emerald-200 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-80">Troco a Devolver</p>
                                    <h4 className="text-5xl font-black tracking-tighter leading-none">
                                        {change.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[0]}
                                        <span className="text-2xl">,{change.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[1]}</span>
                                    </h4>
                                </div>
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <HandCoins size={36} />
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
                        </div>
                    )}

                    {/* SALDO DEVEDOR (Split Payment) */}
                    {isSplitPayment && (
                        <div className="animate-in slide-in-from-top-4 duration-500 space-y-6">
                            <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-200 border-b-8 border-indigo-800 relative overflow-hidden group">
                                <div className="relative z-10">
                                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em] mb-1 flex items-center gap-2">
                                        <AlertCircle size={14} /> Saldo Restante
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-white text-2xl font-black opacity-50 italic">R$</span>
                                        <h4 className="text-5xl font-black tracking-tighter leading-none">
                                            {remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[0]}
                                            <span className="text-2xl">,{remainingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[1]}</span>
                                        </h4>
                                    </div>
                                    <div className="mt-6 flex items-center gap-3">
                                        <div className="h-1.5 bg-white/20 flex-1 rounded-full overflow-hidden">
                                            <div className="h-full bg-white w-2/3 animate-pulse"></div>
                                        </div>
                                        <span className="text-white text-[9px] font-black uppercase tracking-widest bg-white/10 px-4 py-1.5 rounded-full">Aguardando Segundo Meio</span>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform rotate-12">
                                    <Wallet size={120} />
                                </div>
                            </div>

                            {/* Seleção do SEGUNDO meio */}
                            <div className="pt-6 border-t-2 border-dashed border-slate-100">
                                <h4 className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                                   <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px]">2</div> Pagar o restante com:
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {paymentMethods.filter(m => m.id !== 'money').map(m => (
                                        <button 
                                            key={`sec-${m.id}`} 
                                            onClick={() => setSecondaryMethod(m.id)} 
                                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95 ${secondaryMethod === m.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-black shadow-lg -translate-y-1' : 'border-slate-100 bg-white text-slate-400 hover:border-indigo-200'}`}
                                        >
                                            <m.icon size={22} strokeWidth={2.5}/>
                                            <span className="text-[9px] font-black uppercase tracking-tighter mt-1.5">{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Ações Inferiores Desktop */}
            <div className="hidden lg:flex gap-4">
                <button onClick={onDiscard} className="px-8 py-5 bg-white text-gray-400 font-black uppercase text-xs tracking-widest rounded-3xl border border-gray-200 hover:bg-gray-50 transition-colors">Descartar</button>
                <button onClick={() => onSaveOrder(notes)} className="px-8 py-5 bg-white text-gray-600 font-black uppercase text-xs tracking-widest rounded-3xl border border-gray-200 hover:bg-gray-50 transition-colors flex-1 flex items-center justify-center gap-3"><Save size={20}/> Salvar Pedido</button>
                <button 
                  onClick={handleFinish} 
                  disabled={!isValid || isProcessing} 
                  className={`flex-[2] py-5 text-white font-black uppercase tracking-[0.2em] rounded-3xl flex items-center justify-center gap-3 transition-all shadow-2xl shadow-teal-500/20 active:scale-[0.98] ${isValid && !isProcessing ? 'bg-teal-500 hover:bg-teal-600 hover:scale-[1.02]' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} strokeWidth={3}/>}
                  CONCLUIR VENDA
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Fixo Mobile */}
      <footer className="lg:hidden bg-white p-4 border-t border-gray-200 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="flex gap-2 mb-3">
            <button onClick={onDiscard} className="flex-1 py-3.5 bg-gray-50 text-gray-400 text-[10px] font-black uppercase rounded-2xl">Descartar</button>
            <button onClick={() => onSaveOrder(notes)} className="flex-[2] py-3.5 bg-white text-gray-600 text-[10px] font-black uppercase rounded-2xl border border-gray-200">Salvar Pedido</button>
          </div>
          <button 
              onClick={handleFinish} 
              disabled={!isValid || isProcessing} 
              className={`w-full py-5 text-white text-sm font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl ${isValid && !isProcessing ? 'bg-teal-500 shadow-teal-500/30' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
          >
              {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} strokeWidth={3}/>}
              {isProcessing ? 'PROCESSANDO...' : 'CONCLUIR VENDA'}
          </button>
      </footer>
    </div>
  );
};

export default PaymentScreen;
