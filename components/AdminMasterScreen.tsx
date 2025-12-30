
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShieldCheck, 
  Building2, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  CreditCard,
  Lock,
  Unlock,
  Eye,
  LogIn,
  List
} from 'lucide-react';
import { Company } from '../types';
import { supabase } from '../supabaseClient';
import UserMenu from './UserMenu';
import Toast from './Toast';

interface AdminMasterScreenProps {
  toggleSidebar: () => void;
}

const AdminMasterScreen: React.FC<AdminMasterScreenProps> = ({ toggleSidebar }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all');
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
          const normalized = data.map((c: any) => ({
              ...c,
              name: c.name || 'Sem Nome', // Previne crash se nome for null
              subscription_status: c.subscription_status || 'active',
              subscription_plan: c.subscription_plan || 'pro',
              next_due_date: c.next_due_date || null
          }));
          setCompanies(normalized);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setToastMessage('Erro ao carregar empresas.');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      // Safe accessors para evitar crash
      const name = c.name ? c.name.toLowerCase() : '';
      const cnpj = c.cnpj || '';
      const email = c.email ? c.email.toLowerCase() : '';
      const query = searchQuery.toLowerCase();

      const matchesSearch = 
        name.includes(query) || 
        cnpj.includes(query) ||
        email.includes(query);
      
      const matchesStatus = statusFilter === 'all' || c.subscription_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, statusFilter]);

  // --- KPIs ---
  const stats = useMemo(() => {
      const total = companies.length;
      const active = companies.filter(c => c.subscription_status === 'active').length;
      const inactive = companies.filter(c => c.subscription_status === 'inactive' || c.subscription_status === 'blocked').length;
      const estimatedUsers = total * 2.5; 
      
      return { total, active, inactive, estimatedUsers };
  }, [companies]);

  // --- Actions ---

  const handleStatusChange = async (company: Company, newStatus: 'active' | 'inactive' | 'blocked') => {
      try {
          const { error } = await supabase
              .from('companies')
              .update({ subscription_status: newStatus })
              .eq('id', company.id);

          if (error) throw error;

          setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, subscription_status: newStatus } : c));
          setToastMessage(`Status atualizado para ${newStatus.toUpperCase()}`);
          setShowToast(true);
      } catch (e) {
          console.error(e);
          setToastMessage('Erro ao atualizar status');
          setShowToast(true);
      }
  };

  const handleAddMonth = async () => {
      if (!editingCompany) return;
      
      const currentDue = editingCompany.next_due_date ? new Date(editingCompany.next_due_date) : new Date();
      currentDue.setDate(currentDue.getDate() + 30);
      const newDateStr = currentDue.toISOString().split('T')[0];

      setEditingCompany({ ...editingCompany, next_due_date: newDateStr, subscription_status: 'active' });
  };

  const handleSaveEdit = async () => {
      if (!editingCompany) return;
      try {
          const { error } = await supabase
              .from('companies')
              .update({ 
                  name: editingCompany.name,
                  email: editingCompany.email,
                  subscription_status: editingCompany.subscription_status,
                  next_due_date: editingCompany.next_due_date
              })
              .eq('id', editingCompany.id);

          if (error) throw error;

          setCompanies(prev => prev.map(c => c.id === editingCompany.id ? editingCompany : c));
          setToastMessage('Dados salvos com sucesso!');
          setShowToast(true);
          setIsEditModalOpen(false);
      } catch (e) {
          console.error(e);
          setToastMessage('Erro ao salvar dados');
          setShowToast(true);
      }
  };

  const getStatusBadge = (status: string | undefined, dueDate?: string) => {
      const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;
      
      if (status === 'blocked') return <span className="inline-flex items-center gap-1 bg-gray-800 text-white px-2 py-1 rounded text-xs font-bold uppercase"><Lock size={10} /> Bloqueado</span>;
      if (status === 'inactive') return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold uppercase"><XCircle size={10} /> Inativa</span>;
      if (status === 'active' && isOverdue) return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold uppercase"><AlertTriangle size={10} /> Vencido</span>;

      return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold uppercase"><CheckCircle2 size={10} /> Ativa</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f3f4f6] relative">
      
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />

      {isEditModalOpen && editingCompany && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                  <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 text-lg">Gerenciar Empresa</h3>
                      <button onClick={() => setIsEditModalOpen(false)}><span className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</span></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Empresa</label>
                          <input 
                              className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#2dd4bf]"
                              value={editingCompany.name} 
                              onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email de Contato</label>
                          <input 
                              className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#2dd4bf]"
                              value={editingCompany.email || ''} 
                              onChange={(e) => setEditingCompany({...editingCompany, email: e.target.value})}
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status do Acesso</label>
                              <select 
                                  className="w-full border border-gray-300 rounded p-2 text-sm bg-white outline-none focus:border-[#2dd4bf]"
                                  value={editingCompany.subscription_status}
                                  onChange={(e) => setEditingCompany({...editingCompany, subscription_status: e.target.value as any})}
                              >
                                  <option value="active">Ativa (Liberado)</option>
                                  <option value="inactive">Inativa (Aviso)</option>
                                  <option value="blocked">Bloqueada (Sem Acesso)</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Próximo Vencimento</label>
                              <input 
                                  type="date"
                                  className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-[#2dd4bf]"
                                  value={editingCompany.next_due_date ? editingCompany.next_due_date.split('T')[0] : ''}
                                  onChange={(e) => setEditingCompany({...editingCompany, next_due_date: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500 font-bold uppercase mb-2">Ações Rápidas</p>
                          <button 
                              onClick={handleAddMonth}
                              className="w-full py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded border border-indigo-200 hover:bg-indigo-100 flex items-center justify-center gap-2 transition-colors"
                          >
                              <CreditCard size={16} /> Confirmar Pagamento (+30 dias)
                          </button>
                      </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                      <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 font-bold text-sm border border-gray-200 rounded hover:bg-white transition-colors">Cancelar</button>
                      <button onClick={handleSaveEdit} className="px-6 py-2 bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold rounded text-sm shadow-sm transition-colors">Salvar Alterações</button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 sm:px-8 py-5 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
             <button 
                onClick={() => toggleSidebar?.()} 
                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
             >
                <List size={24} />
            </button>
            <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                    Painel Administrativo Master
                    <span className="hidden sm:inline-block bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded border border-blue-200 font-bold uppercase">Super Admin</span>
                </h1>
                <p className="hidden sm:block text-sm text-gray-500 mt-0.5">Gerencie empresas, usuários e monitore a performance do sistema</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <UserMenu />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Usuários Ativos (DAU)</p>
                          <h3 className="text-3xl font-extrabold text-gray-800">0</h3>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Users size={20} /></div>
                  </div>
                  <p className="text-xs text-gray-400">Usuários únicos hoje</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Usuários Mensais (MAU)</p>
                          <h3 className="text-3xl font-extrabold text-gray-800">{Math.floor(stats.estimatedUsers)}</h3>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Users size={20} /></div>
                  </div>
                  <p className="text-xs text-gray-400">Usuários únicos este mês</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Taxa de Retenção</p>
                          <h3 className="text-3xl font-extrabold text-gray-800">100%</h3>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><TrendingUp size={20} /></div>
                  </div>
                  <p className="text-xs text-gray-400">Retenção mensal</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Empresas Ativas</p>
                          <h3 className="text-3xl font-extrabold text-gray-800">{stats.active}</h3>
                      </div>
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400"><Building2 size={20} /></div>
                  </div>
                  <p className="text-xs text-gray-400">Com assinatura ativa</p>
              </div>
          </div>

          {/* Main Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Building2 size={20} className="text-gray-400" /> Lista de Empresas Clientes
                  </h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                      <select 
                          className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as any)}
                      >
                          <option value="all">Todos os Status</option>
                          <option value="active">Ativas</option>
                          <option value="inactive">Inativas</option>
                          <option value="blocked">Bloqueadas</option>
                      </select>
                  </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
                          <tr>
                              <th className="px-6 py-4">Nome</th>
                              <th className="px-6 py-4">CNPJ</th>
                              <th className="px-6 py-4">Email</th>
                              <th className="px-6 py-4 text-center">Status</th>
                              <th className="px-6 py-4">Vencimento</th>
                              <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {loading ? (
                              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Carregando...</td></tr>
                          ) : filteredCompanies.length === 0 ? (
                              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Nenhuma empresa encontrada.</td></tr>
                          ) : (
                              filteredCompanies.map(company => (
                                  <tr key={company.id} className="hover:bg-gray-50 transition-colors group">
                                      <td className="px-6 py-4 font-bold text-gray-800">{company.name}</td>
                                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{company.cnpj || '-'}</td>
                                      <td className="px-6 py-4 text-sm text-gray-600">{company.email || 'Não informado'}</td>
                                      <td className="px-6 py-4 text-center">
                                          {getStatusBadge(company.subscription_status, company.next_due_date)}
                                      </td>
                                      <td className={`px-6 py-4 text-sm font-bold ${company.next_due_date && new Date(company.next_due_date) < new Date() ? 'text-red-600' : 'text-gray-600'}`}>
                                          {company.next_due_date ? new Date(company.next_due_date).toLocaleDateString('pt-BR') : '-'}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button 
                                                  onClick={() => {
                                                      setEditingCompany(company);
                                                      setIsEditModalOpen(true);
                                                  }}
                                                  className="p-1.5 border border-amber-200 rounded hover:bg-amber-50 text-amber-600"
                                                  title="Editar / Pagamento"
                                              >
                                                  <CreditCard size={16} />
                                              </button>
                                              {company.subscription_status === 'blocked' ? (
                                                  <button 
                                                      onClick={() => handleStatusChange(company, 'active')}
                                                      className="p-1.5 border border-emerald-200 rounded hover:bg-emerald-50 text-emerald-600"
                                                      title="Desbloquear"
                                                  >
                                                      <Unlock size={16} />
                                                  </button>
                                              ) : (
                                                  <button 
                                                      onClick={() => handleStatusChange(company, 'blocked')}
                                                      className="p-1.5 border border-red-200 rounded hover:bg-red-50 text-red-600"
                                                      title="Bloquear Acesso"
                                                  >
                                                      <Lock size={16} />
                                                  </button>
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AdminMasterScreen;
