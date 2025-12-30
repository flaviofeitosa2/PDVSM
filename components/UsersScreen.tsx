
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  HelpCircle, 
  Plus, 
  List,
  User as UserIcon,
  Shield,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import UserPanel from './UserPanel';
import UserDetailPanel from './UserDetailPanel';
import UserMenu from './UserMenu';
import { UserProfile, Sale } from '../types';
import { supabase } from '../supabaseClient';

interface UsersScreenProps {
  toggleSidebar?: () => void;
  userProfile: UserProfile;
}

const UsersScreen: React.FC<UsersScreenProps> = ({ toggleSidebar, userProfile }) => {
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Verifica permissão administrativa
  const hasAdminAccess = ['admin', 'owner', 'master', 'mestre'].includes(userProfile.role);

  const fetchData = useCallback(async () => {
        if (!userProfile?.company_id) return;
        setLoading(true);

        try {
            // 1. Fetch Users - FILTRADO PARA APENAS STAFF (Master, Admin, Operator)
            let usersList: UserProfile[] = [];
            if (!hasAdminAccess) {
                usersList = [userProfile];
            } else {
                const { data: uData, error: uError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('company_id', userProfile.company_id)
                    .in('role', ['master', 'mestre', 'admin', 'owner', 'operator', 'operador'])
                    .order('full_name');
                if (!uError && uData) usersList = uData as UserProfile[];
            }
            setUsers(usersList);

            // 2. Fetch Sales
            let query = supabase
                .from('sales')
                .select('seller_name, total, date')
                .eq('company_id', userProfile.company_id)
                .neq('status', 'cancelled');

            if (!hasAdminAccess) {
                query = query.ilike('seller_name', userProfile.full_name);
            }

            const { data: sData, error: sError } = await query;
            
            if (!sError && sData) {
                setSalesData(sData as any[]);
            }

        } catch (err) {
            console.error("Error fetching users/stats:", err);
        } finally {
            setLoading(false);
        }
  }, [userProfile, hasAdminAccess]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Statistics Calculation ---
  const userStats = useMemo(() => {
      const statsMap = new Map<string, { revenue: number; count: number }>();
      let totalRevenue = 0;

      users.forEach(u => {
          const nameKey = (u.full_name || u.email || 'sem nome').trim().toLowerCase();
          statsMap.set(nameKey, { revenue: 0, count: 0 });
      });

      salesData.forEach(sale => {
          const rawName = (sale as any).seller_name || (sale as any).sellerName;
          const val = Number((sale as any).total) || 0;
          
          if (rawName) {
              const key = rawName.trim().toLowerCase();
              if (statsMap.has(key)) {
                  const current = statsMap.get(key)!;
                  statsMap.set(key, { 
                      revenue: current.revenue + val, 
                      count: current.count + 1 
                  });
                  totalRevenue += val;
              } 
          }
      });

      return users.map(user => {
          const key = (user.full_name || user.email || '').trim().toLowerCase();
          const stat = statsMap.get(key) || { revenue: 0, count: 0 };
          const percent = totalRevenue > 0 ? (stat.revenue / totalRevenue) * 100 : 0;
          
          return {
              ...user,
              revenue: stat.revenue,
              count: stat.count,
              percent: percent
          };
      }).sort((a, b) => b.revenue - a.revenue);

  }, [users, salesData]);

  const grandTotalRevenue = userStats.reduce((acc, u) => acc + u.revenue, 0);
  const grandTotalSales = userStats.reduce((acc, u) => acc + u.count, 0);

  const chartGradient = useMemo(() => {
      if (userStats.length === 0) return 'conic-gradient(#e5e7eb 0% 100%)';
      let currentDeg = 0;
      const colors = ['#2dd4bf', '#818cf8', '#fbbf24', '#f472b6', '#34d399', '#60a5fa', '#a78bfa'];
      const segments = userStats.map((u, i) => {
          const deg = (u.percent / 100) * 360;
          const color = colors[i % colors.length];
          const start = currentDeg;
          const end = currentDeg + deg;
          currentDeg = end;
          return `${color} ${start}deg ${end}deg`;
      });
      if (currentDeg < 360) segments.push(`transparent ${currentDeg}deg 360deg`);
      return `conic-gradient(${segments.join(', ')})`;
  }, [userStats]);

  const colors = ['#2dd4bf', '#818cf8', '#fbbf24', '#f472b6', '#34d399', '#60a5fa', '#a78bfa'];

  if (selectedUser) {
      return (
          <UserDetailPanel 
            user={selectedUser}
            currentUser={userProfile}
            onBack={() => {
                setSelectedUser(null);
                fetchData();
            }}
            companyId={userProfile.company_id}
          />
      );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8f9fa] relative">
      <header className="bg-[#f8f9fa] px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
             <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 hover:bg-gray-200 rounded">
                <List size={20} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Usuários</h2>
        </div>
        <div className="flex items-center gap-4 text-gray-600">
          <button className="flex items-center gap-1 hover:text-gray-900">
            <HelpCircle size={18} />
            <span className="text-sm font-medium">Ajuda</span>
          </button>
          <UserMenu />
        </div>
      </header>

      <div className="px-6 pb-6">
        <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex ${hasAdminAccess ? 'justify-end' : 'justify-between'} items-center min-h-[70px]`}>
             {!hasAdminAccess && (
                 <span className="text-sm text-gray-500 italic pl-2">Visualizando seu desempenho individual.</span>
             )}
             {hasAdminAccess && (
                 <button 
                    onClick={() => setIsUserPanelOpen(true)}
                    className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold text-sm px-6 py-2.5 rounded transition-colors flex items-center gap-2"
                 >
                    <Plus size={18} />
                    Adicionar Usuário
                </button>
             )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col h-full min-h-[400px]">
                    <div className="w-full text-left mb-6">
                        <h3 className="text-gray-800 font-bold text-lg">Faturamento por usuário</h3>
                        <p className="text-gray-500 text-xs">Desempenho de vendas (Total)</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center mb-6 relative">
                        <div 
                            className="w-48 h-48 rounded-full shadow-inner relative flex items-center justify-center transition-all duration-1000"
                            style={{ background: chartGradient }}
                        >
                            <div className="w-36 h-36 bg-white rounded-full flex flex-col items-center justify-center shadow-sm z-10">
                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider text-center">PESSOAS ATENDIDAS</span>
                                <span className="text-gray-800 text-2xl font-bold mt-1">
                                    {grandTotalSales}
                                </span>
                                <span className="text-[#2dd4bf] text-sm font-bold mt-1">
                                    {grandTotalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="w-full">
                        <button className="flex items-center justify-center gap-2 text-[#2dd4bf] hover:text-[#14b8a6] text-sm font-bold w-full p-2 hover:bg-teal-50 rounded transition-colors">
                            <TrendingUp size={16} />
                            Ver mais estatísticas
                        </button>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2">
                 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-12 text-xs font-bold text-gray-400 border-b border-gray-200 px-6 py-4 bg-gray-50/50 uppercase tracking-wider">
                        <div className="col-span-5">Nome</div>
                        <div className="col-span-3 text-right">Faturamento</div>
                        <div className="col-span-2 text-right">Vendas</div>
                        <div className="col-span-2 text-right">%</div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Carregando...</div>
                        ) : userStats.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Nenhum usuário encontrado.</div>
                        ) : (
                            userStats.map((user, idx) => {
                                const isMe = user.id === userProfile.id;
                                
                                // Normaliza os papéis para exibição
                                let roleLabel = '';
                                let roleStyle = '';
                                const role = (user.role || '').toLowerCase();

                                if (role === 'owner') {
                                    roleLabel = 'OWNER';
                                    roleStyle = 'bg-teal-100 text-teal-800';
                                } else if (role === 'admin') {
                                    roleLabel = 'ADMIN';
                                    roleStyle = 'bg-blue-100 text-blue-800';
                                } else if (role === 'master' || role === 'mestre') {
                                    roleLabel = 'MASTER';
                                    roleStyle = 'bg-purple-100 text-purple-800';
                                } else if (role === 'operator' || role === 'operador') {
                                    roleLabel = 'OPERADOR'; 
                                    roleStyle = 'bg-slate-100 text-slate-600';
                                }
                                
                                return (
                                    <div 
                                        key={user.id} 
                                        onClick={() => setSelectedUser(user)}
                                        className={`grid grid-cols-12 items-center px-6 py-5 text-sm hover:bg-gray-50 transition-colors cursor-pointer group ${isMe ? 'bg-teal-50/30' : ''}`}
                                    >
                                        <div className="col-span-5 flex items-center gap-3">
                                            <div 
                                                className="w-2 h-2 rounded-full flex-shrink-0" 
                                                style={{ backgroundColor: colors[idx % colors.length] }}
                                            ></div>
                                            
                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase flex-shrink-0">
                                                {user.full_name?.substring(0, 2) || user.email?.substring(0,2).toUpperCase() || 'US'}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="font-bold text-gray-700 block truncate group-hover:text-[#2dd4bf] transition-colors">
                                                    {user.full_name || user.email || 'Sem nome'}
                                                </span>
                                                {roleLabel && (
                                                    <div className="mt-0.5">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${roleStyle}`}>
                                                            {roleLabel}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-span-3 text-right font-medium text-gray-600">
                                            {user.revenue > 0 ? user.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                        </div>

                                        <div className="col-span-2 text-right font-medium text-gray-600">
                                            {user.count > 0 ? user.count : '-'}
                                        </div>

                                        <div className="col-span-2 text-right font-medium text-gray-500">
                                            {user.percent > 0 ? `${user.percent.toFixed(1)}%` : '-'}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                 </div>
            </div>
        </div>
      </div>

      {hasAdminAccess && (
          <UserPanel 
            isOpen={isUserPanelOpen}
            onClose={() => setIsUserPanelOpen(false)}
            companyId={userProfile.company_id}
            onUserAdded={fetchData}
          />
      )}
    </div>
  );
};

export default UsersScreen;
