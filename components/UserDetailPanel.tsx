
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  HelpCircle, 
  User, 
  Mail, 
  Loader2,
  Info
} from 'lucide-react';
import UserMenu from './UserMenu';
import { UserProfile, Sale } from '../types';
import { supabase } from '../supabaseClient';

interface UserDetailPanelProps {
  user: UserProfile;       // O usuário sendo visualizado
  currentUser: UserProfile; // O usuário logado que está vendo a tela
  onBack: () => void;
  companyId: string;
}

const UserDetailPanel: React.FC<UserDetailPanelProps> = ({ user, currentUser, onBack, companyId }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState(user.full_name || '');
  const [formEmail, setFormEmail] = useState(user.email || '');
  
  // Verifica se quem está vendo tem poder de admin (Dono ou Admin)
  const isViewerAdmin = currentUser.role === 'owner' || currentUser.role === 'admin';

  // Mock Permissions State (In a real app, this would be in the user.permissions object from DB)
  const [permissions, setPermissions] = useState({
      isAdmin: user.role === 'admin' || user.role === 'owner',
      canUseMobile: true,
      canViewOthers: user.role !== 'operator',
      canDiscount: false,
      canManageProducts: user.role !== 'operator',
      canManageStock: false,
      canTab: false
  });

  const roleLabel = user.role === 'owner' ? 'Dono' : user.role === 'admin' ? 'Admin' : 'Operador';
  const roleColor = user.role === 'owner' ? 'bg-amber-100 text-amber-800' : user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600';

  // Efeito para carregar dados frescos do perfil
  useEffect(() => {
      const fetchProfileData = async () => {
          try {
              const { data, error } = await supabase
                  .from('profiles')
                  .select('email, full_name')
                  .eq('id', user.id)
                  .single();
              
              if (data && !error) {
                  if (data.email) setFormEmail(data.email);
                  if (data.full_name) setFormName(data.full_name);
              }
          } catch (e) {
              console.error("Erro ao atualizar perfil:", e);
          }
      };
      
      fetchProfileData();
  }, [user.id]);

  useEffect(() => {
      const initData = async () => {
          setLoadingSales(true);

          if (!formEmail && !user.email) {
             const { data: { user: authUser } } = await supabase.auth.getUser();
             if (authUser && authUser.id === user.id) {
                 setFormEmail(authUser.email || '');
             }
          }

          const { data } = await supabase
            .from('sales')
            .select('*')
            .eq('company_id', companyId)
            .ilike('seller_name', user.full_name || '')
            .order('date', { ascending: false })
            .limit(50);

          if (data) {
              setSales(data.map((s: any) => ({
                  ...s,
                  items: s.items || [], 
              } as Sale)));
          }
          setLoadingSales(false);
      };
      
      initData();
  }, [user, companyId]); 

  const stats = useMemo(() => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      const isSameDay = (d1: Date, d2: Date) => 
        d1.getDate() === d2.getDate() && 
        d1.getMonth() === d2.getMonth() && 
        d1.getFullYear() === d2.getFullYear();

      const todayTotal = sales.filter(s => isSameDay(new Date(s.date), today)).length;
      const yesterdayTotal = sales.filter(s => isSameDay(new Date(s.date), yesterday)).length;
      const thisMonth = sales.filter(s => new Date(s.date).getMonth() === today.getMonth()).length;
      const thirtyDaysRevenue = sales.reduce((acc, curr) => acc + (curr.total || 0), 0);

      return { today: todayTotal, yesterday: yesterdayTotal, week: 0, month: thisMonth, thirtyDays: thirtyDaysRevenue };
  }, [sales]);

  const handleSave = async () => {
      setSaving(true);
      try {
          const { error } = await supabase
            .from('profiles')
            .update({ 
                full_name: formName,
                email: formEmail
            }) 
            .eq('id', user.id);
          
          if (error) throw error;
          alert('Dados atualizados com sucesso!');
      } catch (err) {
          console.error(err);
          alert('Erro ao atualizar usuário');
      } finally {
          setSaving(false);
      }
  };

  const ToggleItem = ({ label, desc, checked, onChange, disabled }: any) => (
      <div className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
          <div className="pr-4">
              <p className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={checked} 
                onChange={(e) => onChange(e.target.checked)} 
                disabled={disabled}
            />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${checked ? 'peer-checked:bg-teal-500' : ''} ${disabled ? 'opacity-50' : ''}`}></div>
          </label>
      </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-bold text-gray-800">{formName || 'Usuário'}</h2>
             <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${roleColor}`}>
                 {roleLabel}
             </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-gray-600">
          <button className="flex items-center gap-1 hover:text-gray-900 text-sm font-medium">
            <HelpCircle size={18} />
            <span className="hidden sm:inline">Ajuda</span>
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex gap-8 text-sm">
              <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-bold">Hoje:</span>
                  <span className="text-gray-700 font-medium">{stats.today} vendas</span>
              </div>
              <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-bold">Ontem:</span>
                  <span className="text-gray-700 font-medium">{stats.yesterday} vendas</span>
              </div>
              <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-bold">Esta semana:</span>
                  <span className="text-gray-700 font-medium">{stats.month} vendas</span>
              </div>
              <div className="flex flex-col">
                  <span className="text-gray-500 text-xs font-bold">Este mês:</span>
                  <span className="text-gray-700 font-medium">{stats.month} vendas</span>
              </div>
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
              
              {/* Left Column: Settings */}
              <div className="space-y-6">
                  
                  {/* User Data Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-base font-bold text-gray-800 mb-4">Dados do usuário</h3>
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">Nome</label>
                              <div className="relative">
                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                  <input 
                                    type="text" 
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 font-medium focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1 uppercase">
                                  Email
                              </label>
                              <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                  <input 
                                    type="email" 
                                    value={formEmail}
                                    onChange={e => setFormEmail(e.target.value)}
                                    readOnly
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 font-medium focus:outline-none cursor-not-allowed"
                                    placeholder="Digite o email do usuário"
                                  />
                              </div>
                              <div className="flex gap-2 mt-2 bg-blue-50 text-blue-700 p-2 rounded border border-blue-100">
                                  <Info size={14} className="flex-shrink-0 mt-0.5" />
                                  <p className="text-[10px] leading-tight">
                                      O email não pode ser alterado pois é utilizado para login.
                                  </p>
                              </div>
                          </div>
                          
                          <div className="flex justify-end pt-2">
                              <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors flex items-center gap-2"
                              >
                                  {saving && <Loader2 size={14} className="animate-spin" />}
                                  Salvar Alterações
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Permissions Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-base font-bold text-gray-800 mb-1">Permissões</h3>
                      <p className="text-xs text-gray-400 mb-4">Controle o que este usuário pode fazer.</p>
                      
                      {!isViewerAdmin && (
                          <div className="bg-yellow-50 border border-yellow-100 rounded p-2 mb-4 text-xs text-yellow-700">
                              Você não tem permissão para alterar configurações de acesso.
                          </div>
                      )}

                      <div className="space-y-1">
                          <ToggleItem 
                            label="Administrador" 
                            desc="Dá acesso a todas as funcionalidades do sistema." 
                            checked={permissions.isAdmin}
                            onChange={(v: boolean) => setPermissions(p => ({...p, isAdmin: v}))}
                            disabled={!isViewerAdmin || user.role === 'owner'} 
                          />
                          <ToggleItem 
                            label="Permitir uso em celular pessoal" 
                            desc="Permite que o usuário faça login de qualquer dispositivo." 
                            checked={permissions.canUseMobile}
                            onChange={(v: boolean) => setPermissions(p => ({...p, canUseMobile: v}))}
                            disabled={!isViewerAdmin}
                          />
                          <ToggleItem 
                            label="Ver transações de outros usuários" 
                            desc="Permite ver todos os pedidos e vendas, inclusive o catálogo online." 
                            checked={permissions.canViewOthers}
                            onChange={(v: boolean) => setPermissions(p => ({...p, canViewOthers: v}))}
                            disabled={!isViewerAdmin}
                          />
                          <ToggleItem 
                            label="Dar desconto em vendas" 
                            desc="Permite aplicar descontos tanto no valor dos produtos quanto no total." 
                            checked={permissions.canDiscount}
                            onChange={(v: boolean) => setPermissions(p => ({...p, canDiscount: v}))}
                            disabled={!isViewerAdmin}
                          />
                          <ToggleItem 
                            label="Cadastrar/Alterar produtos" 
                            desc="Permite que o usuário edite os dados dos produtos." 
                            checked={permissions.canManageProducts}
                            onChange={(v: boolean) => setPermissions(p => ({...p, canManageProducts: v}))}
                            disabled={!isViewerAdmin}
                          />
                          <ToggleItem 
                            label="Gerenciar estoque" 
                            desc="Permite alterar o estoque atual dos produtos e mínimo." 
                            checked={permissions.canManageStock}
                            onChange={(v: boolean) => setPermissions(p => ({...p, canManageStock: v}))}
                            disabled={!isViewerAdmin}
                          />
                          <ToggleItem 
                            label="Ativar Fiado" 
                            desc="Permite liberar o pagamento com fiado para clientes." 
                            checked={permissions.canTab}
                            onChange={(v: boolean) => setPermissions(p => ({...p, canTab: v}))}
                            disabled={!isViewerAdmin}
                          />
                      </div>
                  </div>

              </div>

              {/* Right Column: Stats & Sales */}
              <div className="space-y-6">
                  
                  {/* 30 Days Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center flex flex-col items-center justify-center min-h-[180px]">
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Últimos 30 dias</span>
                      <span className="text-xs text-gray-400 mb-4">{sales.length} VENDAS</span>
                      <span className="text-4xl lg:text-5xl font-bold text-gray-800">
                          {stats.thirtyDays.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                  </div>

                  {/* Recent Orders Card */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[500px]">
                      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                          <h3 className="font-bold text-gray-800">Últimos pedidos</h3>
                          <button className="text-teal-500 text-sm font-bold hover:underline">Ver todos</button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto">
                          {loadingSales ? (
                              <div className="flex items-center justify-center h-full text-gray-400">
                                  <Loader2 className="animate-spin mr-2" size={20} /> Carregando vendas...
                              </div>
                          ) : sales.length === 0 ? (
                              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                  Nenhuma venda recente encontrada para este usuário.
                              </div>
                          ) : (
                              sales.map((sale) => (
                                  <div key={sale.id} className="flex justify-between items-center p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                      <div>
                                          <div className="text-xs text-gray-500 font-bold mb-0.5">
                                              {new Date(sale.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </div>
                                          <div className="text-sm text-gray-400">
                                              #{sale.code} • {sale.paymentMethod === 'credit' ? 'Crédito' : sale.paymentMethod === 'debit' ? 'Débito' : sale.paymentMethod === 'money' ? 'Dinheiro' : 'Pix'}
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <div className="font-bold text-gray-800 text-sm">
                                              {sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </div>
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>

              </div>
          </div>
      </div>
    </div>
  );
};

export default UserDetailPanel;
