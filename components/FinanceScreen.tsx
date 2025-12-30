
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  List, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  DollarSign, 
  Eye, 
  EyeOff, 
  Landmark, 
  CreditCard, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Folder, 
  MoreVertical, 
  Loader2, 
  Search, 
  RefreshCw, 
  Scale, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Layers, 
  Info, 
  Palette, 
  Utensils, 
  Coffee, 
  Car, 
  ShoppingBasket, 
  Shirt, 
  Scan, 
  Home, 
  Zap, 
  Book,
  Paperclip, 
  CheckCircle2, 
  ArrowRightLeft,
  BarChart3,
  Target
} from 'lucide-react';
import { Wallet as WalletType, FinanceCategory, FinanceTransaction, UserProfile } from '../types';
import UserMenu from './UserMenu';
import { supabase } from '../supabaseClient';

const walletColors = [
  { id: 'bg-[#2dd4bf]', hex: '#2dd4bf' },
  { id: 'bg-[#3b82f6]', hex: '#3b82f6' },
  { id: 'bg-[#a855f7]', hex: '#a855f7' },
  { id: 'bg-[#f97316]', hex: '#f97316' },
  { id: 'bg-[#f43f5e]', hex: '#f43f5e' },
  { id: 'bg-[#475569]', hex: '#475569' },
];

const categoryColors = [
  { id: 'blue', hex: '#0099ff', class: 'bg-[#0099ff]' },
  { id: 'purple', hex: '#9933cc', class: 'bg-[#9933cc]' },
  { id: 'green', hex: '#669900', class: 'bg-[#669900]' },
  { id: 'orange', hex: '#ff8800', class: 'bg-[#ff8800]' },
  { id: 'red', hex: '#ef4444', class: 'bg-[#ef4444]' },
  { id: 'teal', hex: '#14b8a6', class: 'bg-[#14b8a6]' },
];

const categoryIcons = [
  { id: 'food', icon: Utensils },
  { id: 'coffee', icon: Coffee },
  { id: 'transport', icon: Car },
  { id: 'shopping', icon: ShoppingBasket },
  { id: 'clothing', icon: Shirt },
  { id: 'services', icon: Scan },
  { id: 'home', icon: Home },
  { id: 'bills', icon: Zap },
  { id: 'education', icon: Book },
];

const FinanceScreen: React.FC<{ toggleSidebar?: () => void; userProfile: UserProfile }> = ({ toggleSidebar, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'wallets' | 'categories'>('dashboard'); 
  const [isLoading, setIsLoading] = useState(false);
  
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [showValues, setShowValues] = useState(true);

  const [viewDate, setViewDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false); 
  const [categoryViewType, setCategoryViewType] = useState<'expense' | 'income'>('expense');
  const [searchQuery, setSearchQuery] = useState('');

  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false); 
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  const [walletForm, setWalletForm] = useState({ name: '', type: 'bank', balance: '', color: 'bg-[#2dd4bf]' });
  
  const [categoryForm, setCategoryForm] = useState({ 
      name: '', 
      type: 'expense' as 'income' | 'expense',
      color: categoryColors[0].hex,
      icon: 'food',
  });
  
  const [txForm, setTxForm] = useState({
      description: '', 
      amount: '', 
      type: 'expense' as 'income' | 'expense' | 'transfer',
      walletId: '', 
      categoryId: '', 
      date: new Date().toISOString().split('T')[0], 
      status: 'paid' as 'paid' | 'pending'
  });

  const fetchData = useCallback(async () => {
      if (!userProfile?.company_id) return;
      setIsLoading(true);
      try {
          const [wRes, cRes, tRes] = await Promise.all([
              supabase.from('wallets').select('*').eq('company_id', userProfile.company_id),
              supabase.from('finance_categories').select('*').eq('company_id', userProfile.company_id).order('created_at', { ascending: true }),
              supabase.from('finance_transactions').select('*').eq('company_id', userProfile.company_id).order('date', { ascending: false })
          ]);
          if (wRes.data) setWallets((wRes.data as any[]).map((w: any) => ({ ...w, balance: Number(w.balance || 0) })));
          if (cRes.data) setCategories(cRes.data as FinanceCategory[]);
          if (tRes.data) setTransactions((tRes.data as any[]).map((t: any) => ({ ...t, amount: Number(t.amount || 0) })));
      } catch (err) {
          console.error("Error fetching data", err);
      } finally { setIsLoading(false); }
  }, [userProfile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetTxForm = () => {
      setTxForm({
          description: '', 
          amount: '', 
          type: 'expense',
          walletId: '', 
          categoryId: '', 
          date: new Date().toISOString().split('T')[0], 
          status: 'paid'
      });
      setEditingTxId(null);
  };

  const calculateWalletBalances = useCallback((targetWalletId: string) => {
      const w = wallets.find(wal => wal.id === targetWalletId);
      if (!w) return { current: 0, predicted: 0 };
      const walletTxs = transactions.filter(t => t.wallet_id === targetWalletId && t.status !== 'cancelled');
      const current = w.balance;
      const pendingIn = walletTxs.filter(t => t.type === 'income' && t.status === 'pending').reduce((a, b) => a + b.amount, 0);
      const pendingOut = walletTxs.filter(t => t.type === 'expense' && t.status === 'pending').reduce((a, b) => a + b.amount, 0);
      const predicted = current + pendingIn - pendingOut;
      return { current, predicted };
  }, [wallets, transactions]);

  const getActiveFilterLabel = () => {
    switch (filterType) {
      case 'expense': return 'Despesas';
      case 'income': return 'Receitas';
      case 'transfer': return 'Transferências';
      default: return 'Transações';
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
      const newDate = new Date(viewDate);
      newDate.setMonth(monthIndex);
      setViewDate(newDate);
      setIsDatePickerOpen(false);
  };

  const handleYearChange = (delta: number) => {
      const newDate = new Date(viewDate);
      newDate.setFullYear(newDate.getFullYear() + delta);
      setViewDate(newDate);
  };

  const dashboardData = useMemo(() => {
      const currentYear = viewDate.getFullYear();
      
      const monthlyData = Array(12).fill(0).map((_, idx) => {
          const monthTxs = transactions.filter(t => {
              const d = new Date(t.date);
              return d.getFullYear() === currentYear && d.getMonth() === idx && t.status === 'paid';
          });
          const income = monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
          const expense = monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
          return { name: new Date(currentYear, idx).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''), income, expense, balance: income - expense };
      });

      const currentMonthTxs = transactions.filter(t => {
          const d = new Date(t.date);
          return d.getFullYear() === currentYear && d.getMonth() === viewDate.getMonth() && t.status === 'paid' && t.type === 'expense';
      });

      const totalExpenseMonth = currentMonthTxs.reduce((acc, t) => acc + t.amount, 0);

      const categoryMap: Record<string, { 
          id: string, 
          name: string, 
          amount: number, 
          color: string
      }> = {};

      currentMonthTxs.forEach(t => {
          const catId = t.category_id || 'uncategorized';
          if (!categoryMap[catId]) {
              const category = categories.find(c => c.id === catId);
              categoryMap[catId] = { 
                  id: catId, 
                  name: category?.name || 'Sem Categoria', 
                  amount: 0, 
                  color: category?.color || '#9ca3af'
              };
          }
          categoryMap[catId].amount += t.amount;
      });

      const expensesByCategory = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);

      return { monthlyData, expensesByCategory, totalExpenseMonth };
  }, [transactions, viewDate, categories]);

  const stats = useMemo(() => {
    const viewYear = viewDate.getFullYear();
    const viewMonth = viewDate.getMonth();

    const monthTxs = transactions.filter(t => {
        if (!t.date) return false;
        const parts = t.date.split('T')[0].split('-');
        if (parts.length < 2) return false;
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1; 
        return y === viewYear && m === viewMonth;
    });

    const income = monthTxs.filter(t => t.type === 'income' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const expense = monthTxs.filter(t => t.type === 'expense' && t.status === 'paid').reduce((a, b) => a + b.amount, 0);
    const currentBalance = wallets.reduce((a, b) => a + b.balance, 0);
    const pendingIn = transactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((a, b) => a + b.amount, 0);
    const pendingOut = transactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((a, b) => a + b.amount, 0);
    
    return { income, expense, monthBalance: income - expense, currentBalance, predictedBalance: currentBalance + pendingIn - pendingOut };
  }, [transactions, wallets, viewDate]);

  const filteredTransactions = useMemo(() => {
      let filtered = transactions;
      const targetYear = viewDate.getFullYear();
      const targetMonth = viewDate.getMonth();
      
      filtered = filtered.filter(t => {
          if (!t.date) return false;
          const parts = t.date.split('T')[0].split('-');
          if (parts.length < 3) return false;
          const y = parseInt(parts[0]);
          const m = parseInt(parts[1]) - 1;
          return y === targetYear && m === targetMonth;
      });

      if (filterType !== 'all') {
          filtered = filtered.filter(t => t.type === filterType);
      }
      if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(t => 
              t.description.toLowerCase().includes(query) ||
              wallets.find(w => w.id === t.wallet_id)?.name.toLowerCase().includes(query)
          );
      }
      return filtered;
  }, [transactions, searchQuery, wallets, filterType, viewDate]);

  const formatCurrency = (val: number) => showValues ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ ••••••';

  const handleSaveWallet = async () => { 
    if (!walletForm.name) return;
    const balance = parseFloat(walletForm.balance.replace(',', '.')) || 0;
    const data = { name: walletForm.name, type: walletForm.type, color: walletForm.color, balance, company_id: userProfile.company_id };
    if (editingWallet) await supabase.from('wallets').update(data).eq('id', editingWallet.id);
    else await supabase.from('wallets').insert([{ ...data, initial_balance: balance }]);
    fetchData();
    setIsWalletModalOpen(false);
  };

  const handleSaveCategory = async () => {
      if (!categoryForm.name) return;
      setIsLoading(true);
      const payload = { name: categoryForm.name, type: categoryViewType, company_id: userProfile.company_id, color: categoryForm.color, icon: categoryForm.icon };
      try {
          if (editingCategory) {
              await supabase.from('finance_categories').update(payload).eq('id', editingCategory.id);
          } else {
              await supabase.from('finance_categories').insert([payload]);
          }
          await fetchData();
          setIsCategoryModalOpen(false);
      } catch (err: any) { alert(`Erro: ${err.message}`); } finally { setIsLoading(false); }
  };

  const handleSaveTransaction = async () => {
      if (!txForm.amount || !txForm.walletId) return;
      const amount = parseFloat(txForm.amount.replace(',', '.')) || 0;
      const data = { 
          description: txForm.description,
          amount, 
          type: txForm.type,
          wallet_id: txForm.walletId, 
          category_id: txForm.categoryId || null,
          date: txForm.date,
          status: txForm.status,
          company_id: userProfile.company_id 
      };
      try {
          if (editingTxId) await supabase.from('finance_transactions').update(data).eq('id', editingTxId);
          else await supabase.from('finance_transactions').insert([data]);
          await fetchData();
          setIsTxModalOpen(false);
          resetTxForm();
      } catch (err: any) { alert("Erro ao salvar: " + err.message); }
  };

  const handleDeleteTransaction = async (id: string) => {
      if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
      try {
          await supabase.from('finance_transactions').delete().eq('id', id);
          fetchData();
      } catch (e) { console.error(e); }
  };

  const handleEditTransaction = (t: FinanceTransaction) => {
      setEditingTxId(t.id);
      setTxForm({ description: t.description, amount: t.amount.toString(), type: t.type as any, walletId: t.wallet_id, categoryId: t.category_id || '', date: t.date, status: t.status as any });
      setIsTxModalOpen(true);
  };

  const handleOpenAddTransaction = () => { resetTxForm(); setIsTxModalOpen(true); };
  const handleOpenAddExpense = (walletId: string) => { resetTxForm(); setTxForm(prev => ({ ...prev, type: 'expense', walletId, status: 'pending' })); setIsTxModalOpen(true); };
  const openNewCategoryModal = () => { setEditingCategory(null); setCategoryForm({ name: '', type: categoryViewType, color: categoryColors[0].hex, icon: 'food' }); setIsCategoryModalOpen(true); };
  const openEditCategoryModal = (c: FinanceCategory) => { setEditingCategory(c); setCategoryForm({ name: c.name, type: c.type, color: c.color || categoryColors[0].hex, icon: c.icon || 'food' }); setIsCategoryModalOpen(true); };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f3f4f6] font-sans">
      {/* Header com z-index reduzido (z-10) para ficar abaixo da Sidebar */}
      <header className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => toggleSidebar?.()} 
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <List size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                Gestão Financeira
                <button onClick={() => setShowValues(!showValues)} className="text-gray-400 hover:text-gray-600 transition-colors ml-1">
                    {showValues ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
            </h2>
        </div>
        <UserMenu />
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative">
          {isLoading && <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-sm"><Loader2 className="animate-spin text-purple-600" size={32} /></div>}

          {/* BARRA DE CONTROLES ABAIXO DA HEADER */}
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
              <nav className="flex bg-white p-1 rounded-2xl gap-1 border border-gray-100 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                  {[
                      { id: 'dashboard', label: 'Visão Geral', icon: PieChart },
                      { id: 'transactions', label: 'Lançamentos', icon: List },
                      { id: 'wallets', label: 'Carteiras', icon: Wallet },
                      { id: 'categories', label: 'Categorias', icon: Folder },
                  ].map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[#6200ee] text-white shadow-lg shadow-purple-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}>
                          <tab.icon size={14} strokeWidth={2.5} /> {tab.label}
                      </button>
                  ))}
              </nav>

              <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:flex-none">
                      <button onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white rounded-2xl text-xs font-bold text-gray-600 border border-gray-100 hover:bg-gray-50 transition-all shadow-sm">
                          {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })} <ChevronDown size={14} />
                      </button>
                      {isDatePickerOpen && (
                          <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)} />
                              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 w-64 animate-in fade-in zoom-in-95 origin-top-right">
                                  <div className="flex justify-between items-center mb-4">
                                      <button onClick={() => handleYearChange(-1)} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"><ChevronLeft size={16}/></button>
                                      <span className="font-bold text-gray-800">{viewDate.getFullYear()}</span>
                                      <button onClick={() => handleYearChange(1)} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"><ChevronRight size={16}/></button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                      {Array.from({ length: 12 }).map((_, i) => (
                                          <button key={i} onClick={() => handleMonthSelect(i)} className={`py-2 text-xs font-bold rounded-lg transition-colors ${viewDate.getMonth() === i ? 'bg-[#6200ee] text-white shadow-md' : 'hover:bg-gray-50 text-gray-600'}`}>{new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '')}</button>
                                      ))}
                                  </div>
                              </div>
                          </>
                      )}
                  </div>
                  <button 
                    onClick={handleOpenAddTransaction} 
                    className="flex-1 md:flex-none bg-gradient-to-r from-[#2dd4bf] to-[#06b6d4] hover:brightness-105 text-white font-black py-3 px-8 rounded-2xl shadow-xl shadow-teal-100 flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition-transform active:scale-95"
                  >
                    <Plus size={18} strokeWidth={3} /> Novo Lançamento
                  </button>
              </div>
          </div>

          {activeTab === 'dashboard' && (
              <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex items-center justify-between">
                          <div>
                              <div className="flex items-center gap-2 text-emerald-500 mb-1 font-bold text-xs uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full w-fit"><ArrowUpCircle size={14} /> Receitas</div>
                              <p className="text-3xl font-black text-gray-800 tracking-tight mt-2">{formatCurrency(stats.income)}</p>
                          </div>
                      </div>
                      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex items-center justify-between">
                          <div>
                              <div className="flex items-center gap-2 text-rose-500 mb-1 font-bold text-xs uppercase tracking-wide bg-rose-50 px-2 py-0.5 rounded-full w-fit"><ArrowDownCircle size={14} /> Despesas</div>
                              <p className="text-3xl font-black text-gray-800 tracking-tight mt-2">{formatCurrency(stats.expense)}</p>
                          </div>
                      </div>
                      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex items-center justify-between">
                          <div>
                              <div className="flex items-center gap-2 text-blue-500 mb-1 font-bold text-xs uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded-full w-fit"><Scale size={14} /> Saldo Mês</div>
                              <p className={`text-3xl font-black tracking-tight mt-2 ${stats.monthBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(stats.monthBalance)}</p>
                          </div>
                      </div>
                      <div className="bg-[#6200ee] p-6 rounded-[2rem] shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
                          <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-2 font-bold text-[10px] uppercase tracking-widest opacity-80"><Landmark size={14} /> Saldo Atual (Todas)</div>
                              <p className="text-3xl font-black tracking-tight">{formatCurrency(stats.currentBalance)}</p>
                              <p className="text-[10px] mt-1 opacity-60">Previsto: {formatCurrency(stats.predictedBalance)}</p>
                          </div>
                          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white opacity-10 rounded-full"></div>
                      </div>
                  </div>

                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col min-h-[450px]">
                      <h3 className="text-lg font-bold text-gray-800 mb-8 flex items-center gap-2">
                          <BarChart3 size={20} className="text-[#6200ee]" />
                          Análise Financeira Mensal
                      </h3>
                      
                      <div className="flex-1 relative mt-4">
                          <div className="absolute -left-2 inset-y-0 flex flex-col justify-between text-[10px] text-gray-300 font-bold pointer-events-none pr-2">
                              <span></span><span></span><span></span><span></span><span></span>
                          </div>

                          <div className="w-full h-64 flex items-end justify-between px-4 relative border-b border-gray-100 pb-2">
                               <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                   {[1,2,3,4].map(i => <div key={i} className="w-full border-t border-gray-50 border-dashed h-0"></div>)}
                               </div>

                               <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 100" preserveAspectRatio="none">
                                   <path 
                                       d={(() => {
                                           const maxVal = Math.max(...dashboardData.monthlyData.flatMap(d => [d.income, d.expense, Math.abs(d.balance)]), 100);
                                           const points = dashboardData.monthlyData.map((d, i) => {
                                               const x = (i * (1000/11));
                                               const y = 100 - ((d.balance / maxVal) * 50 + 50); 
                                               return `${x},${y}`;
                                           });
                                           return `M ${points.join(' L ')}`;
                                       })()}
                                       fill="none" 
                                       stroke="#9ca3af" 
                                       strokeWidth="1.5" 
                                       className="opacity-50"
                                   />
                               </svg>

                               {dashboardData.monthlyData.map((data, i) => {
                                   const maxVal = Math.max(...dashboardData.monthlyData.flatMap(d => [d.income, d.expense, Math.abs(d.balance)]), 100);
                                   const incH = (data.income / maxVal) * 100;
                                   const expH = (data.expense / maxVal) * 100;

                                   return (
                                       <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                           <div className="flex gap-1 items-end h-full">
                                                <div 
                                                    className="w-2.5 bg-blue-400 rounded-t-sm transition-all duration-500 hover:brightness-110 shadow-sm"
                                                    style={{ height: `${Math.max(incH, 2)}%` }}
                                                    title={`Entrada: ${formatCurrency(data.income)}`}
                                                ></div>
                                                <div 
                                                    className="w-2.5 bg-orange-400 rounded-t-sm transition-all duration-500 hover:brightness-110 shadow-sm"
                                                    style={{ height: `${Math.max(expH, 2)}%` }}
                                                    title={`Saída: ${formatCurrency(data.expense)}`}
                                                ></div>
                                           </div>
                                           <div 
                                               className="absolute w-2 h-2 rounded-full bg-gray-400 border-2 border-white z-10 transition-transform group-hover:scale-125" 
                                               style={{ bottom: `${((data.balance / maxVal) * 50 + 50)}%` }}
                                           ></div>
                                           <span className="mt-4 text-[9px] font-black text-gray-400 uppercase tracking-tighter">{data.name}</span>
                                       </div>
                                   );
                               })}
                          </div>
                      </div>

                      <div className="flex justify-center items-center gap-8 mt-12 py-4">
                          <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Entradas</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Saídas</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Geração de Caixa</span>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-50 flex flex-col">
                          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Target size={20} className="text-gray-400" /> Gastos por Categoria</h3>
                          <div className="space-y-6 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                              {dashboardData.expensesByCategory.length === 0 ? <p className="text-gray-400 text-sm text-center py-10">Nenhuma despesa este mês.</p> : dashboardData.expensesByCategory.map((cat, idx) => {
                                  const total = dashboardData.totalExpenseMonth > 0 ? dashboardData.totalExpenseMonth : 1;
                                  const widthPercent = (cat.amount / total) * 100;
                                  return (
                                      <div key={idx} className="group">
                                          <div className="flex justify-between items-center mb-2 text-xs font-bold uppercase tracking-wide">
                                              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></div><span className="text-gray-700 font-extrabold">{cat.name}</span></div>
                                              <span className="text-gray-900 font-black">{formatCurrency(cat.amount)}</span>
                                          </div>
                                          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden relative"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${widthPercent}%`, backgroundColor: cat.color }} title={`${cat.name}: ${formatCurrency(cat.amount)}`}></div></div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-50 flex flex-col h-full">
                          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Wallet size={20} className="text-gray-400" /> Resumo por Conta</h3>
                          <div className="space-y-4">{wallets.map(w => (
                              <div key={w.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ${w.color || 'bg-gray-500'}`}><Landmark size={18} /></div>
                                      <div><p className="font-bold text-gray-800 text-sm uppercase">{w.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{w.type === 'bank' ? 'Conta Bancária' : w.type === 'wallet' ? 'Carteira Física' : 'Outro'}</p></div>
                                  </div>
                                  <span className={`font-bold ${w.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(w.balance)}</span>
                              </div>
                          ))}</div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'transactions' && (
              <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
                  <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-gray-50 overflow-hidden self-start">
                      <div className="p-4 border-b border-gray-50 flex gap-4">
                          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Pesquisar..." className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-200" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                          <div className="relative">
                            <button onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)} className="flex items-center gap-2 px-5 py-2.5 bg-[#6200ee] text-white text-xs font-bold rounded-full transition-transform active:scale-95 shadow-lg shadow-purple-200"><ChevronDown size={14} className={`transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} /> {getActiveFilterLabel()}</button>
                            {isTypeDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsTypeDropdownOpen(false)} />
                                    <div className="absolute top-full right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-40 w-48 animate-in fade-in zoom-in-95 origin-top-right">
                                        {[{ id: 'all', label: 'Transações', color: 'bg-purple-600' }, { id: 'expense', label: 'Despesas', color: 'bg-rose-500' }, { id: 'income', label: 'Receitas', color: 'bg-emerald-500' }, { id: 'transfer', label: 'Transferências', color: 'bg-blue-500' }].map((opt) => (
                                            <button key={opt.id} onClick={() => { setFilterType(opt.id as any); setIsTypeDropdownOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors hover:bg-gray-50 ${filterType === opt.id ? 'text-[#6200ee] font-bold' : 'text-gray-600'}`}><div className={`w-3 h-3 rounded-full ${opt.color}`} /> {opt.label}</button>
                                        ))}
                                    </div>
                                </>
                            )}
                          </div>
                      </div>
                      <table className="w-full text-left text-xs"><thead className="bg-white text-gray-400 font-bold uppercase tracking-wider"><tr className="border-b border-gray-100"><th className="px-6 py-5">Situação</th><th className="px-6 py-5">Data</th><th className="px-6 py-5">Descrição</th><th className="px-6 py-5">Categoria</th><th className="px-6 py-5">Conta</th><th className="px-6 py-5 text-right">Valor</th><th className="px-6 py-5 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-50">
                          {filteredTransactions.length === 0 ? <tr><td colSpan={7} className="p-12 text-center text-gray-400 italic">Nenhum lançamento encontrado neste período.</td></tr> : filteredTransactions.map(t => (
                              <tr key={t.id} className="hover:bg-gray-50/50 group transition-colors"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full flex items-center justify-center ${t.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>{t.status === 'paid' ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <Check size={14} />}</div><div className="text-gray-400">{t.type === 'transfer' ? <ArrowRightLeft size={16} /> : <CreditCard size={16} />}</div></div></td><td className="px-6 py-4 text-gray-500 font-medium">{new Date(t.date).toLocaleDateString('pt-BR')}</td><td className="px-6 py-4"><span className="font-bold text-gray-800 text-sm block truncate max-w-[200px]">{t.description}</span></td><td className="px-6 py-4"><div className="flex items-center gap-2">{categories.find(c => c.id === t.category_id) && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categories.find(c => c.id === t.category_id)?.color || '#ccc' }}></div>}<span className="text-gray-500 capitalize">{categories.find(c => c.id === t.category_id)?.name || 'Geral'}</span></div></td><td className="px-6 py-4 text-gray-500">{wallets.find(w => w.id === t.wallet_id)?.name || '-'}</td><td className={`px-6 py-4 text-right font-black text-sm ${t.type === 'income' ? 'text-emerald-500' : t.type === 'expense' ? 'text-rose-500' : 'text-blue-500'}`}>{t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} {formatCurrency(t.amount)}</td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditTransaction(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><Edit2 size={16} /></button><button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"><Paperclip size={16} /></button><button onClick={() => handleDeleteTransaction(t.id)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors"><Trash2 size={16} /></button></div></td></tr>
                          ))}
                      </tbody></table>
                  </div>
              </div>
          )}

          {activeTab === 'wallets' && (
              <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                  <h3 className="text-3xl font-bold text-gray-800 mb-8 px-1">Contas</h3>
                  <div className="flex flex-col lg:flex-row gap-8 items-start"><div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full"><button onClick={() => { setEditingWallet(null); setWalletForm({ name: '', type: 'bank', balance: '', color: 'bg-[#2dd4bf]' }); setIsWalletModalOpen(true); }} className="h-[200px] rounded-[2rem] border-2 border-dashed border-gray-300 bg-transparent flex flex-col items-center justify-center gap-4 group hover:border-[#6200ee] hover:bg-purple-50/10 transition-all duration-300"><div className="w-14 h-14 rounded-full border-2 border-[#6200ee] flex items-center justify-center text-[#6200ee] group-hover:scale-110 transition-transform bg-white"><Plus size={28} strokeWidth={2.5}/></div><span className="font-bold text-[#6200ee] text-lg">Nova conta</span></button>
                      {wallets.map(w => {
                          const balances = calculateWalletBalances(w.id);
                          return (
                              <div key={w.id} className="h-[200px] rounded-[2rem] bg-white shadow-sm hover:shadow-md border border-gray-100 p-6 flex flex-col justify-between relative group transition-all"><div className="flex justify-between items-start"><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ${w.color || 'bg-gray-500'}`}><Landmark size={18}/></div><h4 className="font-bold text-lg text-gray-800 tracking-tight uppercase">{w.name}</h4></div><button onClick={() => { setEditingWallet(w); setWalletForm({ name: w.name, type: w.type, color: w.color || 'bg-[#2dd4bf]', balance: w.balance.toString() }); setIsWalletModalOpen(true); }} className="text-gray-300 hover:text-gray-600 transition-colors"><MoreVertical size={20}/></button></div><div className="space-y-3 mt-2"><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium">Saldo atual</span><span className={`font-bold ${balances.current >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(balances.current)}</span></div><div className="flex justify-between items-center text-sm"><span className="text-gray-500 font-medium flex items-center gap-1">Saldo previsto <Info size={12} className="text-gray-300" /></span><span className={`font-bold ${balances.predicted >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(balances.predicted)}</span></div></div><div className="pt-4 mt-2 border-t border-gray-50 flex justify-center"><button onClick={() => handleOpenAddExpense(w.id)} className="text-[#6200ee] text-xs font-bold uppercase tracking-wider hover:opacity-80 transition-opacity">ADICIONAR DESPESA</button></div></div>
                          );
                      })}
                  </div></div>
              </div>
          )}

          {activeTab === 'categories' && (
              <div className="max-w-5xl mx-auto animate-in fade-in duration-500"><div className="flex justify-between items-center mb-8"><button onClick={() => setCategoryViewType(categoryViewType === 'expense' ? 'income' : 'expense')} className={`flex items-center gap-3 px-8 py-3.5 rounded-full font-black text-xs text-white shadow-xl transition-all hover:scale-105 active:scale-95 ${categoryViewType === 'expense' ? 'bg-rose-500 shadow-rose-200' : 'bg-emerald-500 shadow-emerald-200'}`}><ChevronDown size={18} strokeWidth={3} /> CATEGORIA DE {categoryViewType === 'expense' ? 'DESPESAS' : 'RECEITAS'}</button><div className="flex gap-3"><button onClick={openNewCategoryModal} className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-purple-600 transition-colors"><Plus size={24}/></button><button onClick={fetchData} className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-purple-600 transition-colors"><RefreshCw size={24}/></button></div></div><div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden"><table className="w-full text-left text-xs"><thead className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider"><tr className="border-b border-gray-100"><th className="px-10 py-5">Nome</th><th className="px-10 py-5">Ícone</th><th className="px-10 py-5">Cor</th><th className="px-10 py-5 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-50">
                  {categories.filter(c => c.type === categoryViewType && !c.parent_id).map(c => {
                      const IconComponent = categoryIcons.find(i => i.id === c.icon)?.icon || Utensils;
                      return (
                          <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group"><td className="px-10 py-6 font-bold text-gray-800 uppercase tracking-tight text-sm">{c.name}</td><td className="px-10 py-6"><div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400"><IconComponent size={18} /></div></td><td className="px-10 py-6"><div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: c.color || '#ccc' }}></div></td><td className="px-10 py-6 text-right"><div className="flex justify-end gap-3"><button onClick={() => openEditCategoryModal(c)} className="p-2.5 text-gray-300 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"><Edit2 size={18}/></button><button onClick={async () => { if(confirm('Excluir categoria?')) { await supabase.from('finance_categories').delete().eq('id', c.id); fetchData(); } }} className="p-2.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button></div></td></tr>
                      )
                  })}
              </tbody></table></div></div>
          )}
      </div>

      {isTxModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"><div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95"><div className="p-8 border-b border-gray-100 flex justify-between items-center"><h3 className="font-black text-gray-900 text-xl tracking-tight">Novo Lançamento</h3><button onClick={() => setIsTxModalOpen(false)}><X size={20} className="text-gray-400" /></button></div><div className="p-10 space-y-6"><div className="flex bg-gray-100 p-1.5 rounded-2xl">{['expense', 'income', 'transfer'].map(t => <button key={t} onClick={() => setTxForm({...txForm, type: t as any})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${txForm.type === t ? 'bg-white text-purple-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>{t === 'expense' ? 'Despesa' : t === 'income' ? 'Receita' : 'Transferência'}</button>)}</div><div className="grid grid-cols-2 gap-6"><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Valor *</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 font-black text-lg" placeholder="0,00" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} /></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Data</label><input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 font-bold text-xs" value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} /></div></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Descrição *</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 font-bold" value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} /></div><div className="grid grid-cols-2 gap-6"><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Conta *</label><select className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 font-bold text-sm" value={txForm.walletId} onChange={e => setTxForm({...txForm, walletId: e.target.value})}><option value="">Selecione...</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoria</label><select className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 font-bold text-sm" value={txForm.categoryId} onChange={e => setTxForm({...txForm, categoryId: e.target.value})}><option value="">Geral</option>{categories.filter(c => c.type === txForm.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div><div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 cursor-pointer group" onClick={() => setTxForm({...txForm, status: txForm.status === 'paid' ? 'pending' : 'paid'})}><div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${txForm.status === 'paid' ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>{txForm.status === 'paid' && <Check size={14} className="text-white" strokeWidth={4} />}</div><span className="text-xs font-black text-gray-600 uppercase tracking-wide">Lançamento Efetivado</span></div></div><div className="p-8 bg-gray-50/50 flex gap-4"><button onClick={() => setIsTxModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold text-sm bg-white rounded-2xl border border-gray-200">Cancelar</button><button onClick={handleSaveTransaction} className="flex-1 py-4 bg-[#6200ee] text-white font-black rounded-2xl text-sm shadow-xl shadow-purple-200">Confirmar</button></div></div></div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"><div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95"><div className="p-8 border-b border-gray-100 flex justify-between items-center"><h3 className="font-black text-gray-900 text-xl tracking-tight">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3><button onClick={() => setIsCategoryModalOpen(false)}><X size={20} className="text-gray-400" /></button></div><div className="p-8 space-y-6"><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nome</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 font-bold" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} autoFocus /></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Ícone</label><div className="flex gap-2 flex-wrap">{categoryIcons.map(item => (<button key={item.id} onClick={() => setCategoryForm({...categoryForm, icon: item.id})} className={`p-3 rounded-xl transition-all ${categoryForm.icon === item.id ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}><item.icon size={18} /></button>))}</div></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cor</label><div className="flex gap-2 flex-wrap">{categoryColors.map(c => (<button key={c.id} onClick={() => setCategoryForm({...categoryForm, color: c.hex})} className={`w-8 h-8 rounded-full transition-all ${categoryForm.color === c.hex ? 'ring-2 ring-offset-2 ring-purple-500 scale-110' : ''}`} style={{ backgroundColor: c.hex }}></button>))}</div></div></div><div className="p-8 bg-gray-50/50 flex gap-4"><button onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold text-sm bg-white rounded-2xl border border-gray-200">Cancelar</button><button onClick={handleSaveCategory} className="flex-1 py-4 bg-[#6200ee] text-white font-black rounded-2xl text-sm shadow-xl shadow-purple-200">Salvar</button></div></div></div>
      )}

      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"><div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95"><div className="p-8 border-b border-gray-100 flex justify-between items-center"><h3 className="font-black text-gray-900 text-xl tracking-tight">{editingWallet ? 'Editar Conta' : 'Nova Conta'}</h3><button onClick={() => setIsWalletModalOpen(false)}><X size={20} className="text-gray-400" /></button></div><div className="p-8 space-y-6"><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nome</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 font-bold" value={walletForm.name} onChange={e => setWalletForm({...walletForm, name: e.target.value})} autoFocus /></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Tipo</label><select className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 font-bold text-sm" value={walletForm.type} onChange={e => setWalletForm({...walletForm, type: e.target.value})}><option value="bank">Conta Bancária</option><option value="wallet">Carteira Física</option><option value="investment">Investimento</option><option value="other">Outro</option></select></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Saldo Inicial</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 outline-none focus:border-purple-500 font-black text-lg" value={walletForm.balance} onChange={e => setWalletForm({...walletForm, balance: e.target.value})} placeholder="0,00" /></div><div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cor</label><div className="flex gap-2 flex-wrap">{walletColors.map(c => (<button key={c.id} onClick={() => setWalletForm({...walletForm, color: c.id})} className={`w-8 h-8 rounded-full transition-all ${walletForm.color === c.id ? 'ring-2 ring-offset-2 ring-purple-500 scale-110' : ''}`} style={{ backgroundColor: c.hex }}></button>))}</div></div></div><div className="p-8 bg-gray-50/50 flex gap-4"><button onClick={() => setIsWalletModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold text-sm bg-white rounded-2xl border border-gray-200">Cancelar</button><button onClick={handleSaveWallet} className="flex-1 py-4 bg-[#6200ee] text-white font-black rounded-2xl text-sm shadow-xl shadow-purple-200">Salvar</button></div></div></div>
      )}
    </div>
  );
};

export default FinanceScreen;
