
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  HelpCircle, 
  ChevronDown, 
  Trash2, 
  ShoppingBasket,
  ArrowUp,
  ArrowDown,
  Save,
  Loader2,
  Calendar,
  Wallet,
  MessageCircle,
  Mail,
  Check,
  User,
  List,
  CalendarCheck,
  History,
  FileText,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Send,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Customer, Sale } from '../types';
import UserMenu from './UserMenu';
import { supabase } from '../supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from '../supabaseClient';

interface CustomerFormProps {
  onBack: () => void;
  onSave: (customer: Customer) => void;
  initialData?: Partial<Customer>;
}

let tempAuthClient: any = null;
const getTempClient = () => {
    if (!tempAuthClient) {
        tempAuthClient = createClient(supabaseUrl, supabaseKey, { 
            auth: { 
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storageKey: 'supabase.auth.customer-portal.token'
            } 
        });
    }
    return tempAuthClient;
};

const CustomerForm: React.FC<CustomerFormProps> = ({ onBack, onSave, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const isEditing = !!initialData?.id;
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [hasPortalAccess, setHasPortalAccess] = useState(false);
  const [portalPassword, setPortalPassword] = useState('');
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [managingAccess, setManagingAccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    fantasyName: initialData?.fantasyName || '',
    socialReason: initialData?.socialReason || '',
    cpf: initialData?.cpf || '',
    notes: initialData?.notes || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    complement: initialData?.complement || '',
    allowTab: initialData?.allowTab || false,
    isSubscriber: initialData?.isSubscriber || false, 
    balance: initialData?.balance || 0,
    createdAt: initialData?.createdAt || new Date().toISOString(),
    company_id: (initialData as any)?.company_id || ''
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
      if (initialData?.id) {
          setLoadingHistory(true);
          supabase.from('sales')
              .select('*')
              .eq('customer_id', initialData.id)
              .order('date', { ascending: false })
              .then(({ data }) => {
                  if (data) setSalesHistory(data.map((s: any) => ({ ...s, items: s.items || [] })));
                  setLoadingHistory(false);
              });
          
          // Verifica se já existe um perfil para este cliente específico
          supabase.from('profiles')
              .select('id, email')
              .eq('customer_id', initialData.id)
              .then(({ data }) => {
                  if (data && data.length > 0) setHasPortalAccess(true);
              });
      }
  }, [initialData?.id]);

  const handleEnablePortalAccess = async () => {
      const emailToUse = formData.email.trim().toLowerCase();
      if (!emailToUse || !emailToUse.includes('@')) return alert("E-mail válido é obrigatório para liberar o portal.");
      if (portalPassword.length < 6) return alert("Defina uma senha de no mínimo 6 caracteres.");

      // VERIFICAÇÃO DE INDICAÇÃO/CONFIRMAÇÃO
      if (!isEditing) {
          alert("Aviso: Salve os dados do cliente primeiro antes de liberar o acesso ao portal.");
          return;
      }

      setManagingAccess(true);
      try {
          // 1. Tenta encontrar se o e-mail já existe em algum perfil
          const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, customer_id, full_name')
              .eq('email', emailToUse)
              .maybeSingle();

          if (existingProfile) {
              if (existingProfile.customer_id === initialData?.id) {
                  setHasPortalAccess(true);
                  alert("Este cliente já possui acesso ativo.");
                  return;
              }
              
              const confirmLink = window.confirm(`O e-mail "${emailToUse}" já está em uso pelo perfil "${existingProfile.full_name}". Deseja vincular este acesso ao cliente atual?`);
              if (confirmLink) {
                  const { error: linkError } = await supabase
                      .from('profiles')
                      .update({ customer_id: initialData?.id, role: 'customer' })
                      .eq('id', existingProfile.id);
                  
                  if (linkError) throw linkError;
                  setHasPortalAccess(true);
                  alert("Acesso vinculado com sucesso!");
              }
              return;
          }

          // 2. Cria conta de Autenticação
          const tempClient = getTempClient();
          const { data: authData, error: authError } = await tempClient.auth.signUp({
              email: emailToUse,
              password: portalPassword,
              options: { data: { full_name: formData.name } }
          });

          if (authError) {
              if (authError.message.includes('already registered')) {
                  throw new Error("Este e-mail já possui uma conta de login. Tente usar a função de vincular perfil.");
              }
              throw authError;
          }

          if (authData.user && initialData?.id) {
              // 3. Cria Perfil Vinculado
              const { error: profileError } = await supabase.from('profiles').upsert({
                  id: authData.user.id,
                  full_name: formData.name,
                  role: 'customer',
                  company_id: formData.company_id,
                  customer_id: initialData.id,
                  email: emailToUse
              });

              if (profileError) throw profileError;
              
              setHasPortalAccess(true);
              setPortalPassword('');
              alert("Acesso ao portal liberado com sucesso!");
          }
      } catch (err: any) {
          console.error("Erro ao liberar portal:", err);
          alert(err.message || "Erro desconhecido ao processar acesso.");
      } finally {
          setManagingAccess(false);
      }
  };

  const handleSave = () => {
    const newCustomer: Customer = {
        id: (initialData?.id as string) || Math.random().toString(36).substr(2, 9),
        avatarText: formData.name.substring(0, 2).toUpperCase(),
        name: formData.name,
        fantasyName: formData.fantasyName,
        socialReason: formData.socialReason,
        phone: formData.phone,
        email: formData.email,
        balance: formData.balance,
        cpf: formData.cpf,
        notes: formData.notes,
        address: formData.address,
        complement: formData.complement,
        allowTab: formData.allowTab,
        isSubscriber: formData.isSubscriber,
        createdAt: formData.createdAt,
        company_id: formData.company_id
    };
    onSave(newCustomer);
  };

  return (
    <div className="flex flex-col h-full bg-[#f3f4f6]">
      <header className="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-200 sticky top-0 z-20">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><ArrowLeft size={24} /></button>
          {isEditing ? (
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800 uppercase">{formData.name}</h2>
                  <span className="text-gray-500 text-sm">Saldo: {formData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
          ) : (<h2 className="text-xl font-bold text-gray-800">Cadastrar cliente</h2>)}
        </div>
        <UserMenu />
      </header>

      <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                {isEditing && formData.phone && (<div className="flex items-center gap-2 text-[#2dd4bf] font-medium"><MessageCircle size={16} />{formData.phone}</div>)}
                {hasPortalAccess && (
                    <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full text-xs">
                        <UserCheck size={14} /> Portal Vinculado
                    </div>
                )}
            </div>
            <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                <label className="flex items-center gap-2 cursor-pointer group"><div className="flex flex-col items-end"><span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Status</span><span className="text-sm font-bold text-gray-700">Assinante</span></div><div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out border ${formData.isSubscriber ? 'bg-indigo-600 border-indigo-600' : 'bg-gray-200 border-gray-300'}`}><div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${formData.isSubscriber ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center`}>{formData.isSubscriber && <CalendarCheck size={10} className="text-indigo-600" />}</div></div><input type="checkbox" className="hidden" checked={formData.isSubscriber} onChange={e => handleChange('isSubscriber', e.target.checked)} /></label>
                <div className="h-8 w-px bg-gray-200"></div>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">Permitir fiado<div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${formData.allowTab ? 'bg-[#10b981]' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${formData.allowTab ? 'translate-x-4' : 'translate-x-0'}`}></div></div><input type="checkbox" className="hidden" checked={formData.allowTab} onChange={e => handleChange('allowTab', e.target.checked)} /></label>
            </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex flex-col items-center mb-6"><div className={`w-24 h-24 rounded-full mb-4 flex items-center justify-center text-white text-3xl font-bold border-4 shadow-inner ${formData.isSubscriber ? 'bg-indigo-600 border-indigo-100' : 'bg-slate-600 border-slate-100'}`}>{initialData?.avatarText || formData.name.substring(0, 2).toUpperCase() || 'NO'}</div></div>
                    <div className="space-y-4">
                        <div className="relative"><label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500 font-bold uppercase">Nome do Cliente *</label><input type="text" className="w-full border border-gray-300 rounded p-3 text-gray-700 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] font-medium" value={formData.name} onChange={e => (e.target.value.length <= 60) && setFormData({...formData, name: e.target.value})} /></div>
                        <div className="relative"><label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500 font-bold uppercase">CPF/CNPJ</label><input type="text" placeholder="000.000.000-00" className="w-full border border-gray-300 rounded p-3 text-gray-700 outline-none focus:border-[#2dd4bf] font-mono" value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} maxLength={18} /></div>
                        <div className="relative"><label className="absolute -top-2 left-2 bg-white px-1 text-xs text-gray-500 font-bold uppercase">Observações</label><textarea rows={2} className="w-full border border-gray-300 rounded p-3 text-gray-700 outline-none focus:border-[#2dd4bf] resize-none uppercase text-xs" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea></div>
                    </div>
                </div>
                
                {isEditing && formData.isSubscriber && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-indigo-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 text-indigo-100 pointer-events-none"><ShieldCheck size={48} /></div>
                        <h3 className="text-indigo-900 font-black mb-4 uppercase text-xs tracking-widest flex items-center gap-2">
                            <Key size={14} /> Portal do Assinante
                        </h3>
                        
                        {hasPortalAccess ? (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                    <div className="p-2 bg-emerald-500 text-white rounded-lg"><UserCheck size={16} /></div>
                                    <div>
                                        <p className="text-xs font-black text-emerald-800 uppercase tracking-tight">Vínculo Ativo</p>
                                        <p className="text-[10px] text-emerald-600 font-medium leading-none mt-1">O cliente já pode acessar o portal com seu e-mail.</p>
                                    </div>
                                </div>
                                <button className="flex items-center gap-2 text-indigo-600 font-bold text-xs hover:underline bg-indigo-50 px-4 py-2 rounded-lg">
                                    <Send size={14} /> Reenviar Instruções de Acesso
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Libere o acesso para o cliente pagar via PIX e consultar histórico. 
                                    <strong> Use o e-mail do próprio cliente.</strong>
                                </p>
                                <div className="space-y-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                    <div>
                                        <label className="block text-[10px] font-black text-indigo-400 uppercase mb-1">E-mail de Login do Cliente</label>
                                        <input type="email" className="w-full border border-indigo-100 rounded-lg p-2 text-sm font-bold bg-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="cliente@email.com" />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-indigo-400 uppercase mb-1">Definir Senha Inicial</label>
                                        <input type={showPortalPassword ? "text" : "password"} className="w-full border border-indigo-100 rounded-lg p-2 text-sm font-bold bg-white pr-10" value={portalPassword} onChange={e => setPortalPassword(e.target.value)} placeholder="Mín. 6 dígitos" />
                                        <button onClick={() => setShowPortalPassword(!showPortalPassword)} className="absolute right-3 top-8 text-indigo-300 hover:text-indigo-600">
                                            {showPortalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleEnablePortalAccess}
                                        disabled={managingAccess}
                                        className="w-full bg-indigo-600 text-white font-black text-xs uppercase py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                                    >
                                        {managingAccess ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                        LIBERAR ACESSO AO PORTAL
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-800 font-bold mb-4 uppercase text-sm tracking-widest">Contato</h3>
                    <div className="space-y-4">
                        <div className="relative"><label className={`absolute -top-2 left-2 bg-white px-1 text-xs font-bold uppercase ${emailError ? 'text-red-500' : 'text-gray-500'}`}>E-mail</label><input type="email" placeholder="exemplo@email.com" className={`w-full border rounded p-3 text-gray-700 outline-none transition-colors ${emailError ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#2dd4bf]'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                        <div className="relative"><span className="absolute left-3 top-[-10px] bg-white px-1 text-xs text-gray-500 font-bold uppercase">Telefone</span><div className="flex gap-2"><div className="border border-gray-300 rounded p-3 flex items-center justify-center w-20 bg-gray-50"><span className="text-xl">🇧🇷</span><ChevronDown size={14} className="ml-1 text-gray-500" /></div><input type="text" placeholder="(XX) XXXXX-XXXX" className="flex-1 border border-gray-300 rounded p-3 text-gray-700 outline-none focus:border-[#2dd4bf] font-medium" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} maxLength={15} /></div></div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-[200px] flex flex-col justify-between">
                    <div className="flex justify-between items-start"><h3 className="text-gray-800 font-bold uppercase text-sm tracking-widest">Conta Corrente</h3><button className="flex items-center gap-1 text-[#2dd4bf] text-sm font-bold hover:underline"><List size={16} />Ver extrato</button></div>
                    <div className="text-center"><p className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-widest">Saldo Atual</p><p className={`text-4xl font-bold ${formData.balance >= 0 ? 'text-gray-700' : 'text-red-500'}`}>{formData.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                    <div className="flex justify-center gap-12 text-sm font-bold uppercase tracking-wider"><button className="flex items-center gap-1 text-[#2dd4bf] hover:opacity-80"><ArrowUp size={16} />Adicionar</button><button className="flex items-center gap-1 text-red-500 hover:opacity-80"><ArrowDown size={16} />Subtrair</button></div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-gray-800 font-bold uppercase text-xs tracking-widest flex items-center gap-2"><History size={14} /> Histórico de Vendas</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loadingHistory ? (
                            <div className="flex items-center justify-center h-full text-gray-400 gap-2"><Loader2 className="animate-spin" size={16}/> Carregando...</div>
                        ) : salesHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center p-6"><ShoppingBasket size={32} className="mb-2 opacity-30"/><p className="text-sm">Nenhuma venda registrada.</p></div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {salesHistory.map(sale => (
                                    <div key={sale.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${sale.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100 line-through' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                        #{sale.code}
                                                    </span>
                                                    <span className="text-xs text-gray-500 font-bold">{new Date(sale.date).toLocaleDateString('pt-BR')}</span>
                                                </div>
                                            </div>
                                            <span className={`font-bold ${sale.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                {sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>

       <div className="bg-white border-t border-gray-200 p-6 sticky bottom-0 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
           <div className="flex justify-end gap-4 max-w-6xl mx-auto">
               <button onClick={onBack} className="px-8 py-3 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all uppercase text-xs tracking-widest">Cancelar</button>
               <button onClick={() => { if(!formData.name.trim()) return alert("Nome obrigatório"); handleSave(); }} disabled={loading} className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold py-3 px-10 rounded-xl shadow-lg shadow-teal-500/30 flex items-center gap-2 transition-all transform active:scale-95 uppercase text-xs tracking-widest">{loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />} Salvar Cliente</button>
           </div>
       </div>
    </div>
  );
};

export default CustomerForm;
