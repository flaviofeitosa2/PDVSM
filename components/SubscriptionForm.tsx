
import React, { useState, useEffect } from 'react';
import { X, User, Save, Trash2, DollarSign, Layers, Edit2, CheckCircle, Loader2, UserPlus } from 'lucide-react';
import { Customer, Subscription, SubscriptionPlan, Product } from '../types';
import { supabase } from '../supabaseClient';

interface SubscriptionFormProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSave: (data: Partial<Subscription>) => void;
  initialData?: Subscription | null;
  isRenewing?: boolean;
  onDelete?: () => void;
  companyId?: string; 
}

// Helper seguro para obter string YYYY-MM-DD local sem deslocamento
const getLocalISOString = (dateObj: Date = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Converte string YYYY-MM-DD para objeto Date ancorado no meio-dia UTC para evitar problemas de fuso
const parseSafeDate = (dateStr: string) => {
    if (!dateStr) return null;
    const cleanDate = dateStr.split('T')[0];
    const [y, m, d] = cleanDate.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
};

const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  isOpen,
  onClose,
  customers,
  onSave,
  initialData,
  isRenewing,
  onDelete,
  companyId
}) => {
  const [customerId, setCustomerId] = useState('');
  const [provider, setProvider] = useState(''); 
  const [frequency, setFrequency] = useState('Mensal');
  const [startDate, setStartDate] = useState(getLocalISOString());
  const [endDate, setEndDate] = useState('');
  const [valor, setValor] = useState('');
  const [dataDePagamento, setDataDePagamento] = useState('');
  const [status, setStatus] = useState('ativo');
  const [encaminhamento, setEncaminhamento] = useState('');
  const [valorDaComissao, setValorDaComissao] = useState('');
  const [dataPagtoComissao, setDataPagtoComissao] = useState('');

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptionProducts, setSubscriptionProducts] = useState<Product[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isManagingPlan, setIsManagingPlan] = useState<'create' | 'edit' | null>(null);
  const [planNameInput, setPlanNameInput] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCustomerId(initialData.customer_id || '');
        setProvider(initialData.provider || '');
        setFrequency(initialData.frequency || 'Mensal');
        
        const safeStart = initialData.start_date ? initialData.start_date.split('T')[0] : getLocalISOString();
        const safeEnd = initialData.end_date ? initialData.end_date.split('T')[0] : '';
        const safePayment = initialData.payment_date ? initialData.payment_date.split('T')[0] : '';
        const safeCommPayment = initialData.commission_payment_date ? initialData.commission_payment_date.split('T')[0] : '';

        setStartDate(safeStart);
        setEndDate(safeEnd); 
        setValor(initialData.value?.toString() || '');
        setDataDePagamento(safePayment);
        setStatus(initialData.status || 'ativo');
        setEncaminhamento(initialData.referral || '');
        setValorDaComissao(initialData.commission_value?.toString() || '');
        setDataPagtoComissao(safeCommPayment);
      } else {
        setCustomerId(''); 
        setProvider(''); 
        setFrequency('Mensal'); 
        setValor(''); 
        setStatus('ativo');
        setStartDate(getLocalISOString());
        setEndDate(''); 
        setDataDePagamento(''); 
        setEncaminhamento(''); 
        setValorDaComissao(''); 
        setDataPagtoComissao('');
      }
      setIsManagingPlan(null); 
      setPlanNameInput('');
    }
  }, [isOpen, initialData]);

  // Recalculo Automático do Ciclo (Mensal/Anual)
  useEffect(() => {
    if (startDate && isOpen) {
        const dateObj = parseSafeDate(startDate);
        if (dateObj) {
            if (frequency === 'Anual') {
                dateObj.setUTCFullYear(dateObj.getUTCFullYear() + 1);
            } else {
                dateObj.setUTCMonth(dateObj.getUTCMonth() + 1);
            }
            
            const calculatedEnd = dateObj.toISOString().split('T')[0];
            
            // Só sobrescreve se for um novo cadastro, renovação ou se o usuário não tiver alterado manualmente o vencimento ainda
            const isInitialLoad = initialData?.end_date?.split('T')[0] === endDate;
            if (!initialData || isRenewing || !endDate) {
                setEndDate(calculatedEnd);
            }
        }
    }
  }, [startDate, frequency, isOpen]);

  const fetchPlansAndProducts = async () => {
    if (!companyId) return;
    setLoadingPlans(true);
    try {
      const { data: planData } = await supabase.from('subscription_plans').select('*').eq('id_da_empresa', companyId).order('name');
      if (planData) setPlans(planData);
      
      const { data: prodData } = await supabase.from('products').select('*').eq('company_id', companyId).order('name');
      if (prodData) {
          const triggers = prodData.filter((p: any) => p.is_subscription_trigger === true);
          setSubscriptionProducts(triggers);
      }
    } catch (err) { console.error(err); } 
    finally { setLoadingPlans(false); }
  };

  useEffect(() => { if (isOpen) fetchPlansAndProducts(); }, [isOpen, companyId]);

  const handleCreateNewPlan = async () => {
    if (!planNameInput.trim() || !companyId) return;
    setLoadingPlans(true);
    const upperName = planNameInput.trim().toUpperCase();
    const { data, error } = await supabase.from('subscription_plans').insert([{ name: upperName, id_da_empresa: companyId }]).select().single();
    if (!error && data) {
      setPlans(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setProvider(data.name); setSelectedPlanId(data.id); setIsManagingPlan(null); setPlanNameInput('');
    }
    setLoadingPlans(false);
  };

  const handleUpdatePlanName = async () => {
    if (!planNameInput.trim() || !selectedPlanId || !companyId) return;
    setLoadingPlans(true);
    const newName = planNameInput.trim().toUpperCase();
    const oldName = provider;
    try {
      await supabase.from('subscription_plans').update({ name: newName }).eq('id', selectedPlanId);
      await supabase.from('subscriptions').update({ provider: newName }).eq('provider', oldName).eq('company_id', companyId);
      setPlans(prev => prev.map(p => p.id === selectedPlanId ? { ...p, name: newName } : p).sort((a, b) => a.name.localeCompare(b.name)));
      setProvider(newName); setIsManagingPlan(null); setPlanNameInput('');
    } catch (err: any) { alert("Erro ao atualizar plano."); } 
    finally { setLoadingPlans(false); }
  };

  const handleSelectProvider = (val: string) => {
      setProvider(val);
      const prod = subscriptionProducts.find(p => p.name === val);
      if (prod) setValor(prod.price.toString());
  };

  const handleSubmitSubscription = () => {
    if (!customerId || !provider || !valor) return alert("Preencha os campos obrigatórios.");
    
    onSave({
        customer_id: customerId, 
        provider, 
        frequency, 
        start_date: startDate, 
        end_date: endDate || startDate, 
        value: parseFloat(valor.replace(',', '.')), 
        status: status as any, 
        payment_date: dataDePagamento || null,
        referral: encaminhamento, 
        commission_value: parseFloat(valorDaComissao.replace(',', '.')) || 0,
        commission_payment_date: dataPagtoComissao || null
    });
  };

  return (
    <>
      <div className={`fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[80] transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[90] transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-8 border-b border-gray-100 flex justify-between items-start">
              <div><h2 className="text-2xl font-bold text-gray-900">{initialData?.id && !isRenewing && !initialData.id.startsWith('ghost-') ? 'Editar Assinatura' : 'Nova Assinatura'}</h2><p className="text-sm text-gray-500">Contrato e faturamento recorrente.</p></div>
              <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-colors"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/20">
              <section className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><User size={14} /> Dados do Contrato</h3>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cliente *</label>
                          <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all" value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="">Selecione o Cliente...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                      </div>
                      <div>
                          <div className="flex justify-between items-center mb-2">
                              <label className="text-xs font-bold text-gray-500 uppercase">Plano Selecionado *</label>
                              <div className="flex gap-4">
                                {provider && !subscriptionProducts.some(p => p.name === provider) && !isManagingPlan && (
                                    <button type="button" onClick={() => { setPlanNameInput(provider); setIsManagingPlan('edit'); }} className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-1 hover:underline"><Edit2 size={10} /> Editar Nome</button>
                                )}
                                {!isManagingPlan && (
                                    <button type="button" onClick={() => { setPlanNameInput(''); setIsManagingPlan('create'); }} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Criar Novo +</button>
                                )}
                              </div>
                          </div>
                          {isManagingPlan ? (
                              <div className="flex gap-2 animate-in slide-in-from-top-1 duration-200">
                                  <input type="text" placeholder={isManagingPlan === 'edit' ? "NOVO NOME..." : "NOME DO PLANO..."} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm uppercase outline-none focus:border-indigo-500" value={planNameInput} onChange={e => setPlanNameInput(e.target.value)} autoFocus />
                                  <button onClick={isManagingPlan === 'edit' ? handleUpdatePlanName : handleCreateNewPlan} disabled={loadingPlans} className="bg-indigo-600 text-white px-4 rounded-xl shadow-lg shadow-indigo-100 disabled:opacity-50">{loadingPlans ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}</button>
                                  <button onClick={() => setIsManagingPlan(null)} className="bg-gray-100 text-gray-400 px-3 rounded-xl hover:bg-gray-200"><X size={20} /></button>
                              </div>
                          ) : (
                              <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm uppercase outline-none focus:border-indigo-500 focus:bg-white transition-all" value={provider} onChange={e => handleSelectProvider(e.target.value)}>
                                  <option value="">SELECIONE O PLANO...</option>
                                  {subscriptionProducts.length > 0 && <optgroup label="Produtos do Catálogo">{subscriptionProducts.map(p => <option key={p.id} value={p.name}>{p.name} (Catálogo)</option>)}</optgroup>}
                                  {plans.length > 0 && <optgroup label="Planos Registrados">{plans.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}</optgroup>}
                              </select>
                          )}
                      </div>
                  </div>
              </section>
              <section className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14} /> Ciclo e Valores</h3>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Frequência</label><div className="flex bg-gray-100 p-1 rounded-xl">{['Mensal', 'Anual'].map(f => (<button key={f} onClick={() => setFrequency(f)} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${frequency === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{f}</button>))}</div></div>
                          <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Valor (R$) *</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-sm">$</span><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none" value={valor} onChange={e => setValor(e.target.value)} placeholder="150" /></div></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Início</label><input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-indigo-500" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                          <div><label className="block text-[10px] font-black text-indigo-400 uppercase mb-2">Vencimento</label><input type="date" className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 font-bold text-xs text-indigo-700 outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                      </div>
                      <div className={`p-4 rounded-2xl border flex justify-between items-center transition-colors ${dataDePagamento ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-200'}`}><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${dataDePagamento ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-300'}`}><DollarSign size={20} /></div><span className="text-xs font-black text-gray-700">Pagamento Realizado</span></div><input type="date" className="bg-white border rounded-lg px-2 py-1 text-[10px] font-bold outline-none border-gray-200 focus:border-emerald-500" value={dataDePagamento} onChange={e => setDataDePagamento(e.target.value)} /></div>
                  </div>
              </section>
              <section className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><UserPlus size={14} /> Indicação e Comissões</h3>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                      <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Indicado por (Parceiro)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-sm"><User size={14}/></span><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none" value={encaminhamento} onChange={e => setEncaminhamento(e.target.value)} placeholder="Nome do parceiro..." /></div></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Valor Comissão (R$)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-sm">$</span><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none" value={valorDaComissao} onChange={e => setValorDaComissao(e.target.value)} placeholder="0,00" /></div></div>
                          <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Pagamento Comissão</label><input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-indigo-500" value={dataPagtoComissao} onChange={e => setDataPagtoComissao(e.target.value)} /></div>
                      </div>
                  </div>
              </section>
          </div>
          <div className="p-8 border-t border-gray-100 flex justify-between items-center bg-white">{onDelete && <button onClick={onDelete} className="text-rose-500 hover:bg-rose-50 p-3 rounded-xl transition-colors"><Trash2 size={20} /></button>}<div className="flex gap-4 ml-auto"><button onClick={onClose} className="px-8 py-3 border border-gray-200 rounded-xl text-gray-500 font-bold text-sm hover:bg-gray-50 transition-colors">Cancelar</button><button onClick={handleSubmitSubscription} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-100 transform active:scale-95 transition-all"><Save size={18} /> Salvar Contrato</button></div></div>
      </div>
    </>
  );
};

export default SubscriptionForm;
