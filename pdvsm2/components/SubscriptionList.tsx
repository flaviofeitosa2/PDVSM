import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  CheckCircle2, 
  AlertOctagon, 
  Clock, 
  TrendingUp, 
  Users, 
  CalendarRange, 
  Filter, 
  RefreshCcw, 
  Ban, 
  Wallet, 
  Settings, 
  ArrowRight, 
  UserPlus, 
  Calendar, 
  XCircle, 
  History,
  Check,
  List
} from 'lucide-react';
import { Subscription, Customer } from '../types';
import { supabase } from '../supabaseClient';
import SubscriptionForm from './SubscriptionForm';
import UserMenu from './UserMenu';

interface SubscriptionListProps {
  customers: Customer[];
  companyId?: string;
  toggleSidebar?: () => void;
  refreshTrigger?: number; 
}

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getLocalISOString = (dateObj: Date = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getSafeDateObj = (val: string) => {
    if (!val) return null;
    const cleanVal = val.split('T')[0];
    const parts = cleanVal.split('-');
    if (parts.length < 3) return null;
    
    const [y, m, d] = parts.map(Number);
    // Cria data ao meio-dia UTC para evitar problemas de fuso local
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
};

// Added parseSafeDate helper function to fix missing name error.
// It uses the same logic as getSafeDateObj for consistency.
const parseSafeDate = (dateStr: string) => {
    if (!dateStr) return null;
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length < 3) return null;
    const [y, m, d] = parts.map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
};

const formatDate = (val: string) => {
    if (!val) return '-';
    const d = getSafeDateObj(val);
    if (!d) return '-';
    
    const day = d.getUTCDate().toString().padStart(2, '0');
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const month = months[d.getUTCMonth()];
    return `${day} de ${month}. de ${d.getUTCFullYear()}`;
};

// Badge de data IDÊNTICO ao CustomersScreen (usando UTC)
const getDateBadge = (dateStr?: string) => {
    if (!dateStr) return { day: '--', month: '---' };
    const date = getSafeDateObj(dateStr);
    if (!date || isNaN(date.getTime())) return { day: '--', month: '---' };
    
    const day = date.getUTCDate().toString().padStart(2, '0');
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const month = months[date.getUTCMonth()];
    
    return { day, month };
};

const getStatusColor = (sub: Subscription & { _isGhost?: boolean }) => {
    if (sub._isGhost) return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Configurar', icon: Settings, border: 'border-amber-200' };
    if (sub.status === 'cancelled') return { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelado', icon: XCircle, border: 'border-gray-200' };

    if (!sub.end_date) return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Sem Data', icon: Settings, border: 'border-gray-200' };

    const today = new Date();
    today.setHours(0,0,0,0);
    
    const end = getSafeDateObj(sub.end_date);
    if (end) end.setHours(23, 59, 59);

    const isPaid = !!sub.payment_date;

    if (isPaid) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Pago', icon: CheckCircle2, border: 'border-emerald-200' };
    if (end && today > end) return { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Vencido', icon: AlertOctagon, border: 'border-rose-200' };
    return { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Aguardando', icon: Clock, border: 'border-indigo-100' };
};

const SubscriptionList: React.FC<SubscriptionListProps> = ({ customers, companyId, toggleSidebar, refreshTrigger }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [portalUserIds, setPortalUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'overdue' | 'paid' | 'pending_setup' | 'cancelled'>('all');
  const [selectedMonth, setSelectedMonth] = useState('all'); 
  const [showHistory, setShowHistory] = useState(false); 
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);

  const months = [
      { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' },
      { value: '2', label: 'Março' }, { value: '3', label: 'Abril' },
      { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
      { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' },
      { value: '8', label: 'Setembro' }, { value: '9', label: 'Outubro' },
      { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' },
  ];

  const fetchSubscriptions = async () => {
    if (!companyId) return;
    setLoading(true);
    
    const [subRes, profileRes] = await Promise.all([
        supabase.from('subscriptions').select('*').eq('company_id', companyId).order('end_date', { ascending: true }),
        supabase.from('profiles').select('customer_id').eq('company_id', companyId).eq('role', 'customer')
    ]);

    if (!subRes.error && subRes.data) {
      const enriched = subRes.data.map((sub: any) => {
        const customer = customers.find(c => c.id === sub.customer_id);
        return {
          ...sub,
          customer_name: customer?.name || 'Cliente Desconhecido',
          customer_fantasy: customer?.fantasyName, 
          customer_avatar: customer?.avatarText,
          customer_phone: customer?.phone,
          customer_email: customer?.email,
          customer_cpf: customer?.cpf 
        };
      });
      setSubscriptions(enriched);
    }

    if (!profileRes.error && profileRes.data) {
        const ids = new Set(profileRes.data.map((p: any) => p.customer_id).filter(Boolean));
        setPortalUserIds(ids);
    }

    setLoading(false);
  };

  useEffect(() => { 
      fetchSubscriptions(); 
  }, [customers, companyId, refreshTrigger]);

  const mergedSubscriptions = useMemo(() => {
      const subscriberCustomerIds = new Set(subscriptions.map(s => s.customer_id));
      const pendingSetupCustomers = customers.filter(c => c.isSubscriber && !subscriberCustomerIds.has(c.id));

      const ghostSubs = pendingSetupCustomers.map(c => {
          const regDate = c.createdAt || new Date().toISOString(); 
          return {
            id: `ghost-${c.id}`, 
            customer_id: c.id,
            customer_name: c.name,
            customer_fantasy: c.fantasyName,
            customer_avatar: c.avatarText,
            customer_phone: c.phone,
            /* Fixed duplicate property 'customer_email' here */
            customer_email: c.email,
            customer_cpf: c.cpf,
            provider: 'Não Configurado',
            value: 0,
            frequency: 'Mensal',
            start_date: regDate,
            end_date: '', // Vazio para forçar cálculo no formulário
            status: 'active',
            _isGhost: true 
          } as unknown as Subscription & { _isGhost: boolean };
      });

      const allSubs = [...ghostSubs, ...subscriptions];

      if (!showHistory) {
          const groupedMap = new Map<string, any[]>();
          
          const sortedAll = [...allSubs].sort((a, b) => {
              const dateA = new Date(a.end_date || '1970-01-01').getTime();
              const dateB = new Date(b.end_date || '1970-01-01').getTime();
              return dateA - dateB; 
          });

          sortedAll.forEach((sub: any) => {
              const uniqueKey = `${sub.customer_id}-${(sub.provider || 'default').trim().toLowerCase()}`;
              if (!groupedMap.has(uniqueKey)) groupedMap.set(uniqueKey, []);
              groupedMap.get(uniqueKey)?.push(sub);
          });
          
          const result: any[] = [];
          groupedMap.forEach((group) => {
              const latest = group[group.length - 1];
              const lastPaid = [...group].reverse().find(s => !!s.payment_date);
              result.push({
                  ...latest,
                  _lastPaidDate: lastPaid ? lastPaid.payment_date : null
              });
          });
          return result;
      }
      return allSubs;
  }, [customers, subscriptions, showHistory]);

  const metrics = useMemo(() => {
      const validSubs = mergedSubscriptions.filter((s: any) => !s._isGhost && s.status !== 'cancelled');
      const totalMRR = validSubs.reduce((acc: number, sub: any) => acc + (sub.value || 0), 0); 
      const activeCount = validSubs.length; 
      const paidCount = validSubs.filter((s: any) => !!s.payment_date).length;
      
      const today = new Date(); today.setHours(0,0,0,0);
      const overdueCount = validSubs.filter((s: any) => {
          if (s.payment_date || !s.end_date) return false;
          const end = getSafeDateObj(s.end_date);
          if (end) end.setHours(23, 59, 59);
          return end && end < today;
      }).length;

      const pendingSetupCount = mergedSubscriptions.filter((s: any) => s._isGhost).length;
      return { totalMRR, activeCount, paidCount, overdueCount, pendingSetupCount };
  }, [mergedSubscriptions]);

  const filteredSubscriptions = useMemo(() => {
    return mergedSubscriptions.filter((sub: any) => {
      const matchesSearch = 
        (sub.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         sub.customer_fantasy?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        sub.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.customer_cpf?.includes(searchQuery);
      
      if (!matchesSearch) return false;

      if (selectedMonth !== 'all') {
          if (!sub.end_date) return false;
          const date = getSafeDateObj(sub.end_date);
          if (date && date.getUTCMonth().toString() !== selectedMonth) return false;
      }

      if (activeTab === 'cancelled') return sub.status === 'cancelled';
      if (activeTab !== 'all' && sub.status === 'cancelled') return false;

      const status = getStatusColor(sub);
      if (activeTab === 'active') return status.label === 'Aguardando' || status.label === 'Pago' || status.label === 'Vencido';
      if (activeTab === 'overdue') return status.label === 'Vencido';
      if (activeTab === 'paid') return status.label === 'Pago';
      if (activeTab === 'pending_setup') return sub._isGhost;

      return true;
    }).sort((a: any, b: any) => {
        const statusA = getStatusColor(a).label;
        const statusB = getStatusColor(b).label;
        const priority = { 'Vencido': 1, 'Aguardando': 2, 'Configurar': 3, 'Pago': 4, 'Cancelado': 5, 'Sem Data': 6 };
        const scoreA = priority[statusA as keyof typeof priority] || 99;
        const scoreB = priority[statusB as keyof typeof priority] || 99;
        if (scoreA !== scoreB) return scoreA - scoreB;
        const dateA = new Date(a.end_date || '2099-01-01').getTime();
        const dateB = new Date(b.end_date || '2099-01-01').getTime();
        return dateA - dateB;
    });
  }, [mergedSubscriptions, searchQuery, activeTab, selectedMonth]);

  const handleSave = async (subData: Partial<Subscription>) => {
      try {
          const payload = { ...subData, company_id: companyId };
          if (editingSubscription && editingSubscription.id && !editingSubscription.id.startsWith('ghost-') && !isRenewing) {
             const { error } = await supabase.from('subscriptions').update(payload).eq('id', editingSubscription.id);
             if (error) throw error;
          } else {
             const { error } = await supabase.from('subscriptions').insert([payload]);
             if (error) throw error;
          }
          await fetchSubscriptions();
          setIsFormOpen(false);
          setEditingSubscription(null);
          setIsRenewing(false);
      } catch (error: any) {
          console.error("Erro ao salvar", error);
          alert(`Erro ao salvar assinatura: ${error.message || 'Verifique sua conexão'}`);
      }
  };

  const handleDelete = async (id: string) => {
      if (id.startsWith('ghost-')) {
          const customerId = id.replace('ghost-', '');
          if (window.confirm("Remover status de assinante deste cliente?")) {
              await supabase.from('customers').update({ is_subscriber: false }).eq('id', customerId);
              window.location.reload(); 
          }
          return;
      }
      if (window.confirm("Deseja excluir permanentemente este registro?")) {
          await supabase.from('subscriptions').delete().eq('id', id);
          fetchSubscriptions();
      }
  };

  const handleRenovarClick = (sub: Subscription) => {
      const oldEndStr = sub.end_date?.split('T')[0];
      if (!oldEndStr) return;
      
      const newStart = parseSafeDate(oldEndStr)!;
      const newEnd = new Date(newStart);
      
      if (sub.frequency === 'Anual') newEnd.setUTCFullYear(newEnd.getUTCFullYear() + 1);
      else newEnd.setUTCMonth(newEnd.getUTCMonth() + 1);
      
      setEditingSubscription({ 
          ...sub, 
          id: '', 
          start_date: oldEndStr, 
          end_date: newEnd.toISOString().split('T')[0], 
          payment_date: null, 
          commission_payment_date: null, 
          status: 'active' 
      }); 
      setIsRenewing(true); 
      setIsFormOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-hidden relative">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-8 py-5 flex justify-between items-center sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
              <button 
                  onClick={() => toggleSidebar?.()} 
                  className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                  <List size={24} />
              </button>
              <div className="hidden sm:flex bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200 shrink-0">
                  <CalendarRange size={24} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight truncate">Assinaturas</h1>
                  <p className="hidden md:block text-xs text-gray-500 font-medium mt-0.5">Controle recorrente e renovações</p>
              </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
              <div className="hidden lg:flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                  <div className="text-right"><span className="block text-[10px] uppercase font-bold text-gray-400">Receita Prevista</span><span className="block text-sm font-bold text-gray-800">{formatCurrency(metrics.totalMRR)}</span></div>
                  <div className="h-8 w-px bg-gray-200"></div>
                  <div className="text-right"><span className="block text-[10px] uppercase font-bold text-gray-400">Pendências</span><div className="flex gap-2">{metrics.overdueCount > 0 && <span className="text-xs font-bold text-rose-600">{metrics.overdueCount} Vencidos</span>}{metrics.pendingSetupCount > 0 && <span className="text-xs font-bold text-gray-500">{metrics.pendingSetupCount} Configurar</span>}{metrics.overdueCount === 0 && metrics.pendingSetupCount === 0 && <span className="text-xs font-bold text-emerald-600">Tudo em dia</span>}</div></div>
              </div>
              <button 
                  onClick={() => { setEditingSubscription(null); setIsRenewing(false); setIsFormOpen(true); }} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-3 sm:py-2.5 sm:px-5 rounded-lg shadow-md shadow-indigo-100 flex items-center gap-2 transition-all transform active:scale-95 text-xs sm:text-sm whitespace-nowrap"
              >
                  <Plus size={18} strokeWidth={3} />
                  <span className="hidden sm:inline">Nova Assinatura</span>
                  <span className="sm:hidden">Nova</span>
              </button>
              <UserMenu />
          </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between group"><div className="relative z-10"><p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Ativos</p><h3 className="text-3xl font-extrabold text-gray-800">{metrics.activeCount}</h3><p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1"><TrendingUp size={12} /> {metrics.paidCount} Assinantes em dia</p></div><div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform"><Users size={24} /></div></div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between group"><div className="relative z-10"><p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Atenção Necessária</p><h3 className="text-3xl font-extrabold text-rose-600">{metrics.overdueCount + metrics.pendingSetupCount}</h3><p className="text-xs text-rose-400 font-bold mt-2 flex items-center gap-1"><AlertOctagon size={12} /> {metrics.overdueCount} Vencidos / {metrics.pendingSetupCount} Novos</p></div><div className="p-3 bg-rose-50 rounded-xl text-rose-600 group-hover:scale-110 transition-transform"><Ban size={24} /></div></div>
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-5 rounded-2xl shadow-lg shadow-indigo-200 text-white flex items-start justify-between"><div className="relative z-10"><p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Valor Contratos</p><h3 className="text-3xl font-extrabold">{formatCurrency(metrics.totalMRR)}</h3><p className="text-xs text-indigo-100 mt-2 opacity-80">Receita total recorrente (Ativa)</p></div><div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl text-white"><Wallet size={24} /></div></div>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  <div className="relative w-full sm:w-64 group"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" /></div><input type="text" className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all shadow-sm" placeholder="Buscar assinante..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button onClick={() => setShowHistory(!showHistory)} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${showHistory ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}><History size={16} /> <span className="whitespace-nowrap">{showHistory ? 'Ocultar Histórico' : 'Ver Histórico'}</span></button>
                    <div className="relative flex-1 sm:flex-none min-w-[140px] sm:min-w-[160px]"><select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="appearance-none block w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white text-gray-700 font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer"><option value="all">Todos os Meses</option>{months.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}</select><div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"><Calendar size={16} /></div></div>
                  </div>
              </div>
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-w-full no-scrollbar">
                  {[{ id: 'all', label: 'Todos' }, { id: 'active', label: 'Em Aberto' }, { id: 'overdue', label: 'Vencidos' }, { id: 'pending_setup', label: 'Configurar' }, { id: 'paid', label: 'Pagos' }, { id: 'cancelled', label: 'Cancelados' }].map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{tab.label} {tab.id === 'pending_setup' && metrics.pendingSetupCount > 0 && `(${metrics.pendingSetupCount})`}</button>
                  ))}
              </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/50">
                          <tr>
                              <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider w-24">Vencimento</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plano</th>
                              <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Ciclo</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Indicação</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                          {loading ? (
                              <tr><td colSpan={9} className="p-10 text-center text-gray-400">Carregando dados...</td></tr>
                          ) : filteredSubscriptions.length === 0 ? (
                              <tr><td colSpan={9} className="p-16 text-center"><div className="flex flex-col items-center justify-center text-gray-300"><Filter size={48} className="mb-4 opacity-20" /><p className="text-sm font-medium text-gray-500">Nenhuma assinatura encontrada.</p></div></td></tr>
                          ) : (
                              filteredSubscriptions.map((sub: any) => {
                                  const statusColor = getStatusColor(sub);
                                  const dateBadge = getDateBadge(sub.end_date);
                                  const isCancelled = sub.status === 'cancelled';
                                  const hasPortal = portalUserIds.has(sub.customer_id);
                                  
                                  let progress = 0;
                                  if (sub.start_date && sub.end_date) {
                                      const start = parseSafeDate(sub.start_date)?.getTime() || 0;
                                      const end = parseSafeDate(sub.end_date)?.getTime() || 0;
                                      const now = new Date().getTime();
                                      if (end > start) {
                                          progress = Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
                                      }
                                  }

                                  return (
                                      <tr key={sub.id} className={`group transition-colors cursor-default ${sub._isGhost ? 'bg-amber-50/10 hover:bg-amber-50/30' : isCancelled ? 'bg-gray-50 opacity-70' : 'hover:bg-gray-50/80'}`}>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              <div className="flex items-center gap-3 justify-center">
                                                  {hasPortal && (
                                                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse shrink-0" title="Possui conta no portal" />
                                                  )}
                                                  <div className={`flex flex-col items-center justify-center rounded-xl w-14 h-14 border shadow-sm transition-colors ${sub._isGhost ? 'bg-amber-50 text-amber-600 border-amber-100' : isCancelled ? 'bg-gray-100 text-gray-400 border-gray-200' : statusColor.label === 'Vencido' ? 'bg-rose-50 text-rose-700 border-rose-100' : statusColor.label === 'Pago' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}><span className="text-xl font-extrabold leading-none tracking-tight">{dateBadge.day}</span><span className="text-[10px] font-bold leading-none mt-1 uppercase tracking-wide opacity-80">{dateBadge.month}</span></div>
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-col min-w-0 max-w-[320px]"><div className={`text-sm font-bold uppercase truncate ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{sub.customer_fantasy || sub.customer_name}</div>{sub.customer_fantasy && <span className="uppercase text-xs text-gray-400 font-medium truncate">{sub.customer_name}</span>}</div></td>
                                          <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-col"><span className="text-sm font-medium text-gray-700 truncate max-w-[180px]" title={sub.customer_email}>{sub.customer_email || '-'}</span><span className="text-xs text-gray-500 mt-0.5">{sub.customer_phone || '-'}</span></div></td>
                                          <td className="px-6 py-4 whitespace-nowrap">{sub.provider && !sub._isGhost ? <div className="flex flex-col items-start gap-1"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wide">{sub.provider}</span><span className="text-[10px] text-gray-400 font-mono hidden xl:block">{sub.customer_cpf}</span></div> : <span className="text-gray-300 font-medium">-</span>}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-center"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}><statusColor.icon size={14} strokeWidth={2.5} /> {statusColor.label}</span></td>
                                          <td className="px-6 py-4 whitespace-nowrap">{sub._isGhost ? <div className="text-xs text-gray-400 italic">Configurar ciclo</div> : <div className="w-32"><div className="flex justify-between text-xs text-gray-500 mb-1 font-medium"><span>Início: {formatDate(sub.start_date)}</span></div><div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className={`h-1.5 rounded-full ${isCancelled ? 'bg-gray-300' : statusColor.label === 'Vencido' ? 'bg-rose-500' : statusColor.label === 'Pago' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${isCancelled ? 100 : progress}%` }}></div></div></div>}</td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                              {sub._isGhost ? <span className="text-gray-300 font-bold">-</span> : 
                                              <div className="flex flex-col">
                                                  <div className="text-sm font-bold text-gray-900">{formatCurrency(sub.value)}</div>
                                                  {sub.payment_date ? (
                                                      <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                                                          <Check size={10} /> Pago em {formatDate(sub.payment_date)}
                                                      </div>
                                                  ) : sub._lastPaidDate ? (
                                                      <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded w-fit" title="Fatura anterior foi paga">
                                                          <Check size={10} /> Último pagto: {formatDate(sub._lastPaidDate)}
                                                      </div>
                                                  ) : null}
                                              </div>}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">{sub.referral ? <div className="flex flex-col"><span className="text-sm font-bold text-gray-700 flex items-center gap-1"><UserPlus size={12} className="text-gray-400"/> {sub.referral}</span><div className="flex items-center gap-2 mt-1"><span className="text-xs font-medium text-gray-500">{formatCurrency(sub.commission_value || 0)}</span><span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${sub.commission_payment_date ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{sub.commission_payment_date ? 'Paga' : 'Pendente'}</span></div></div> : <span className="text-gray-300">-</span>}</td>
                                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><div className="flex justify-end gap-2">{sub._isGhost ? <button onClick={() => { setEditingSubscription({ ...sub, id: '', start_date: sub.start_date, value: 0, payment_date: '', end_date: '' }); setIsRenewing(false); setIsFormOpen(true); }} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 text-xs font-bold shadow-md shadow-indigo-200">Configurar <ArrowRight size={12} /></button> : <div className="flex gap-2">{!isCancelled && <button onClick={() => handleRenovarClick(sub)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Renovar Assinatura"><RefreshCcw size={18} /></button>}<button onClick={() => { setEditingSubscription(sub); setIsRenewing(false); setIsFormOpen(true); }} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors" title="Editar"><MoreHorizontal size={18} /></button></div>}</div></td>
                                      </tr>
                                  );
                              })
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </main>

      <SubscriptionForm 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        customers={customers}
        onSave={handleSave}
        initialData={editingSubscription}
        isRenewing={isRenewing}
        companyId={companyId}
        onDelete={editingSubscription && editingSubscription.id && !editingSubscription.id.startsWith('ghost-') && !isRenewing ? () => handleDelete(editingSubscription.id) : undefined}
      />
    </div>
  );
};

export default SubscriptionList;