
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
  ShieldCheck
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
  permissions
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
      {/* Overlay for mobile - z-index aumentado para 100 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[100] lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container - z-index aumentado para 110 */}
      <aside className={`
        fixed inset-y-0 left-0 z-[110] w-64 bg-[#374151] text-white transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        lg:static lg:translate-x-0 flex-shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg border border-white/10 shrink-0 ${userRole === 'master' ? 'bg-blue-500/20' : 'bg-white/5'}`}>
               <Building2 size={24} className={userRole === 'master' ? 'text-blue-400' : 'text-[#2dd4bf]'} />
            </div>
            <div className="flex-1 min-w-0">
                <span className="block text-white font-bold text-lg truncate" title={companyName}>
                    {companyName || 'Carregando...'}
                </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold text-gray-200 border border-gray-500 bg-gray-800 rounded-full uppercase ${userRole === 'owner' ? 'border-[#2dd4bf] text-[#2dd4bf]' : userRole === 'master' ? 'border-blue-400 text-blue-400' : ''}`}>
              {userRoleLabel}
            </span>
            {userRole !== 'operator' && (
                <span className="text-xs text-gray-400 cursor-pointer hover:text-white hover:underline transition-colors">Gerenciar</span>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.length === 0 && userRole === 'operator' ? (
              <div className="px-6 py-4 text-center">
                  <p className="text-xs text-gray-400">Nenhuma permissão de acesso configurada.</p>
                  <p className="text-[10px] text-gray-500 mt-2">Contate o administrador.</p>
              </div>
          ) : (
              <ul className="space-y-1">
                {menuItems.map((item, index) => {
                  const isActive = currentView === item.view || (currentView === 'payment' && item.view === 'pos');
                  return (
                    <li key={index}>
                      <button 
                        onClick={() => handleNavigation(item.view)}
                        className={`
                          w-full flex items-center px-6 py-3 transition-all duration-200 group
                          ${isActive
                            ? 'bg-gray-900 text-white border-l-4 font-medium shadow-[inset_0px_2px_4px_rgba(0,0,0,0.3)]' 
                            : 'text-gray-300 hover:bg-gray-600 hover:text-white border-l-4 border-transparent'}
                          ${isActive ? (item.view === 'admin_master' ? 'border-blue-500' : 'border-[#2dd4bf]') : ''}
                        `}
                      >
                        <item.icon size={20} className={`mr-3 transition-transform duration-200 ${isActive ? 'scale-110 ' + (item.view === 'admin_master' ? 'text-blue-400' : 'text-[#2dd4bf]') : 'group-hover:scale-105'}`} />
                        <span className="text-sm">{item.label}</span>
                        {item.view === 'orders' && pendingOrdersCount > 0 && (
                          <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-in fade-in zoom-in duration-300">
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

        <div className="p-4 bg-gray-800 border-t border-gray-700 flex flex-col gap-3">
            <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-md ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{isConnected ? 'SISTEMA ONLINE' : 'SEM CONEXÃO'}</span>
            </div>
            <button className="bg-white hover:bg-gray-100 text-[#374151] p-3 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center w-full gap-2 font-bold text-sm">
                <MessageSquare size={20} />
                <span>Suporte Online</span>
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
