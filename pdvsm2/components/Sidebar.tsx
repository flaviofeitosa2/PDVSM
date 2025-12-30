
import React, { useMemo } from 'react';
import { 
  CheckCircle, 
  ShoppingBag, 
  LayoutGrid, 
  Users, 
  History, 
  DollarSign, 
  BarChart2, 
  User, 
  Settings,
  MessageSquare,
  PieChart,
  Building2,
  Wifi,
  WifiOff,
  CalendarCheck,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import { OperatorPermissions, UserRole } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  currentView: string;
  onNavigate: (view: string) => void;
  companyName?: string;
  isConnected?: boolean;
  pendingOrdersCount?: number;
  userRole?: UserRole;
  permissions?: OperatorPermissions;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  setIsOpen, 
  currentView, 
  onNavigate, 
  companyName, 
  isConnected = true,
  pendingOrdersCount = 0,
  userRole,
  permissions,
  theme,
  toggleTheme
}) => {
  
  const menuItems = useMemo(() => {
      const allItems = [
        { icon: PieChart, label: 'Dashboard', view: 'dashboard' },
        { icon: CheckCircle, label: 'Vender (PDV)', view: 'pos' },
        { icon: ShoppingBag, label: 'Pedidos', view: 'orders' },
        { icon: LayoutGrid, label: 'Produtos', view: 'products' },
        { icon: Users, label: 'Clientes', view: 'customers' },
        { icon: CalendarCheck, label: 'Assinaturas', view: 'subscriptions' },
        { icon: History, label: 'Histórico', view: 'history' },
        { icon: DollarSign, label: 'Finanças', view: 'finance' }, 
        { icon: BarChart2, label: 'Estatísticas', view: 'stats' },
        { icon: User, label: 'Usuários', view: 'users' },
        { icon: Settings, label: 'Configurações', view: 'settings' },
      ];

      if (userRole === 'master') {
          allItems.push({ icon: ShieldCheck, label: 'Painel Master', view: 'admin_master' });
      }

      if (userRole === 'operator') {
          const defaultPermissions: OperatorPermissions = {
              dashboard: true,
              pos: true,
              orders: true,
              products: true,
              stock: true,
              customers: true,
              finance: false,
              history: true,
              users: false,
              settings: false,
              subscriptions: false,
              stats: false
          };
          const effectivePermissions = { ...defaultPermissions, ...(permissions || {}) };
          return allItems.filter(item => {
              const key = item.view as keyof OperatorPermissions;
              return effectivePermissions[key] === true;
          });
      }
      return allItems;
  }, [userRole, permissions]);

  const handleNavigation = (view: string) => {
    const isAllowed = menuItems.some(i => i.view === view);
    if (isAllowed) {
        onNavigate(view);
    }
    if (window.innerWidth < 1024) {
        setIsOpen(false);
    }
  };

  const userRoleLabel = useMemo(() => {
      if (userRole === 'master') return 'MASTER';
      if (userRole === 'owner') return 'DONO';
      if (userRole === 'admin') return 'ADMIN';
      return 'OPERADOR';
  }, [userRole]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[100] lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-[110] w-64 bg-[#374151] dark:bg-[#23243a] text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl
        lg:static lg:translate-x-0 flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-4 mb-5">
            <div className={`p-2.5 rounded-xl border border-white/10 shrink-0 ${userRole === 'master' ? 'bg-blue-500/20' : 'bg-white/5'}`}>
               <Building2 size={24} className={userRole === 'master' ? 'text-blue-400' : 'text-[#c1ff72]'} />
            </div>
            <div className="flex-1 min-w-0">
                <span className="block text-white font-semibold text-lg truncate tracking-tight" title={companyName}>
                    {companyName || 'Carregando...'}
                </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 text-[9px] font-bold text-gray-200 border border-gray-600 bg-gray-800 rounded-full uppercase tracking-widest ${userRole === 'owner' ? 'border-[#c1ff72] text-[#c1ff72]' : userRole === 'master' ? 'border-blue-400 text-blue-400' : ''}`}>
              {userRoleLabel}
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          {menuItems.length === 0 && userRole === 'operator' ? (
              <div className="px-8 py-4 text-center">
                  <p className="text-xs text-gray-400 font-medium">Sem permissões de acesso.</p>
              </div>
          ) : (
              <ul className="space-y-1.5 px-4">
                {menuItems.map((item, index) => {
                  const isActive = currentView === item.view || (currentView === 'payment' && item.view === 'pos');
                  return (
                    <li key={index}>
                      <button 
                        onClick={() => handleNavigation(item.view)}
                        className={`
                          w-full flex items-center px-4 py-3.5 rounded-2xl transition-all duration-200 group
                          ${isActive
                            ? 'bg-[#c1ff72] text-[#1a1b2e] font-semibold shadow-lg shadow-[#c1ff72]/10' 
                            : 'text-gray-400 hover:bg-white/5 hover:text-white font-medium'}
                        `}
                      >
                        <item.icon size={20} className={`mr-3 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105 opacity-60 group-hover:opacity-100'}`} />
                        <span className="text-sm tracking-tight">{item.label}</span>
                        {item.view === 'orders' && pendingOrdersCount > 0 && (
                          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-in fade-in zoom-in duration-300 ${isActive ? 'bg-[#1a1b2e] text-[#c1ff72]' : 'bg-amber-500 text-white'}`}>
                            {pendingOrdersCount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
          )}
        </nav>

        <div className="p-6 bg-gray-800 dark:bg-[#1a1b2e] border-t border-gray-700 dark:border-white/5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 text-[9px] font-bold px-3 py-2 rounded-full tracking-widest ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></div>
                    <span>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
                <button 
                  onClick={toggleTheme}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-gray-400 hover:text-white"
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
            </div>
            <button className="bg-white hover:bg-gray-100 text-[#374151] p-3.5 rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center w-full gap-3 font-bold uppercase text-[10px] tracking-widest">
                <MessageSquare size={18} />
                <span>Central de Suporte</span>
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
