
// ... imports permanecem os mesmos ...
import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  Store, 
  Lock, 
  MapPin, 
  List,
  Receipt,
  User,
  Loader2,
  Wallet,
  CreditCard,
  Banknote,
  QrCode,
  Link as LinkIcon,
  ArrowRightLeft,
  AlertCircle,
  Shield,
  Phone,
  Instagram,
  Mail,
  Image as ImageIcon,
  CheckCircle2,
  LayoutGrid,
  ShoppingBag,
  Users,
  CalendarCheck,
  History,
  DollarSign,
  BarChart2,
  Settings,
  PieChart
} from 'lucide-react';
import UserMenu from './UserMenu';
import { UserProfile, Company, Wallet as WalletType, OperatorPermissions } from '../types';
import { supabase } from '../supabaseClient';
import Toast from './Toast';

// ... FloatingInput e PermissionToggle permanecem iguais ...
interface FloatingInputProps {
    label: string;
    value: any;
    onChange: (e: any) => void;
    readOnly?: boolean;
    icon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    type?: string;
    prefix?: React.ReactNode;
    multiline?: boolean;
}

const FloatingInput = ({ 
    label, 
    value, 
    readOnly = false, 
    icon = null, 
    rightIcon = <HelpCircle size={18} className="text-gray-400" />,
    type = "text",
    prefix = null,
    onChange,
    multiline = false
}: FloatingInputProps) => (
    <div className="relative mb-4">
      <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500 z-10 font-bold uppercase">
        {label}
      </label>
      <div className={`flex w-full border border-gray-300 rounded p-3 bg-white focus-within:border-[#2dd4bf] focus-within:ring-1 focus-within:ring-[#2dd4bf] transition-all ${multiline ? 'items-start' : 'items-center'}`}>
        {prefix && <span className="mr-2 text-gray-500">{prefix}</span>}
        {icon && <div className="mr-3 text-gray-400">{icon}</div>}
        
        {multiline ? (
            <textarea
                value={value ?? ''}
                readOnly={readOnly}
                onChange={onChange}
                rows={3}
                className={`flex-1 outline-none text-gray-700 text-sm bg-transparent resize-none ${readOnly ? 'cursor-not-allowed text-gray-500' : ''}`}
            />
        ) : (
            <input 
                type={type}
                value={value ?? ''}
                readOnly={readOnly}
                disabled={readOnly}
                onChange={onChange}
                className={`flex-1 outline-none text-gray-700 text-sm bg-transparent ${readOnly ? 'cursor-not-allowed text-gray-500' : ''}`}
            />
        )}
        
        {readOnly && <Lock size={16} className="text-gray-400 ml-2" />}
        {!readOnly && rightIcon && <div className="ml-2">{rightIcon}</div>}
      </div>
    </div>
);

interface PermissionToggleProps {
    label: string;
    description?: string;
    icon?: React.ElementType;
    isChecked: boolean;
    onToggle: () => void;
}

const PermissionToggle: React.FC<PermissionToggleProps> = ({ label, description, icon: Icon, isChecked, onToggle }) => (
    <div 
        onClick={onToggle}
        className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all duration-200 group ${isChecked ? 'border-[#2dd4bf] bg-teal-50/30' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
    >
        <div className="flex items-center gap-3">
            {Icon && (
                <div className={`p-2 rounded-lg ${isChecked ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400 group-hover:text-gray-600'}`}>
                    <Icon size={18} />
                </div>
            )}
            <div>
                <span className={`text-sm font-bold block ${isChecked ? 'text-gray-800' : 'text-gray-500'}`}>{label}</span>
                {description && <span className="text-xs text-gray-400">{description}</span>}
            </div>
        </div>
        
        <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out flex-shrink-0 ${isChecked ? 'bg-[#2dd4bf]' : 'bg-gray-300'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${isChecked ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
    </div>
);

// --- ESTRUTURA DO MENU (ESPELHO DO SIDEBAR) ---
const MENU_PERMISSIONS_MAPPING = [
    { key: 'dashboard', label: 'Dashboard', icon: PieChart, desc: 'Visão geral e gráficos' },
    { key: 'pos', label: 'Vender (PDV)', icon: CheckCircle2, desc: 'Frente de caixa' },
    { key: 'orders', label: 'Pedidos', icon: ShoppingBag, desc: 'Gerenciamento de vendas' },
    { key: 'products', label: 'Produtos', icon: LayoutGrid, desc: 'Catálogo de itens' },
    { key: 'customers', label: 'Clientes', icon: Users, desc: 'Base de contatos' },
    { key: 'subscriptions', label: 'Assinaturas', icon: CalendarCheck, desc: 'Cobrança recorrente' },
    { key: 'history', label: 'Histórico', icon: History, desc: 'Registro de vendas' },
    { key: 'finance', label: 'Finanças', icon: DollarSign, desc: 'Fluxo de caixa' },
    { key: 'stats', label: 'Estatísticas', icon: BarChart2, desc: 'Relatórios detalhados' },
    { key: 'users', label: 'Usuários', icon: User, desc: 'Gestão da equipe' },
    { key: 'settings', label: 'Configurações', icon: Settings, desc: 'Dados da empresa' },
];

// --- COMPONENTE PRINCIPAL ---

interface SettingsScreenProps {
  toggleSidebar?: () => void;
  userProfile: UserProfile;
  onCompanyUpdate?: (name: string) => void;
  onPermissionsUpdate?: () => void; 
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ toggleSidebar, userProfile, onCompanyUpdate, onPermissionsUpdate }) => {
  const [activeTab, setActiveTab] = useState('GERAL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // General Tab Form State
  const [generalForm, setGeneralForm] = useState<Partial<Company>>({
      name: '',
      social_reason: '',
      cnpj: '',
      description: '',
      phone: '',
      whatsapp: '',
      instagram: '',
      email: '',
      address: '',
      complement: '',
      currency: 'BRL',
      show_decimals: true,
      logo_url: '',
      cancelled_sales_visibility: 'strike'
  });
  
  // Wallets Association State
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [walletAssociations, setWalletAssociations] = useState<Record<string, string>>({});

  // Permissions State
  const [opPermissions, setOpPermissions] = useState<OperatorPermissions>({
      dashboard: true, pos: true, orders: true, products: true, stock: true,
      customers: true, finance: false, history: true, users: false, settings: false, subscriptions: false, stats: false
  });

  const tabs = [
    'GERAL', 
    'CARTEIRAS',
    'PERMISSÕES', 
    'PEDIDOS E VENDAS', 
    'RECIBO'
  ];

  const paymentMethodsList = [
      { id: 'money', label: 'Dinheiro', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { id: 'pix', label: 'PIX', icon: QrCode, color: 'text-teal-600', bg: 'bg-teal-50' },
      { id: 'debit', label: 'Cartão de Débito', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
      { id: 'credit', label: 'Cartão de Crédito', icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-50' },
      { id: 'credit_tab', label: 'Venda Fiado', icon: User, color: 'text-amber-600', bg: 'bg-amber-50' },
      { id: 'link', label: 'Link de Pagamento', icon: LinkIcon, color: 'text-purple-600', bg: 'bg-purple-50' },
      { id: 'others', label: 'Outros', icon: ArrowRightLeft, color: 'text-gray-600', bg: 'bg-gray-50' },
  ];

  useEffect(() => {
      const fetchData = async () => {
          if(!userProfile.company_id) return;
          setLoading(true);
          
          // 1. Fetch Company Data (Try loading permissions gracefully)
          try {
              const { data: compData, error: compError } = await supabase
                .from('companies')
                .select('*') // Select ALL columns, avoiding specific column error if missing
                .eq('id', userProfile.company_id)
                .single();
              
              if (!compError && compData) {
                  setGeneralForm({
                      name: compData.name || '',
                      social_reason: compData.social_reason || '',
                      cnpj: compData.cnpj || '',
                      description: compData.description || '',
                      phone: compData.phone || '',
                      whatsapp: compData.whatsapp || '',
                      instagram: compData.instagram || '',
                      email: compData.email || '',
                      address: compData.address || '',
                      complement: compData.complement || '',
                      currency: compData.currency || 'BRL',
                      show_decimals: compData.show_decimals ?? true,
                      logo_url: compData.logo_url || '',
                      cancelled_sales_visibility: compData.cancelled_sales_visibility || 'strike'
                  });

                  if (compData.wallet_settings) {
                      setWalletAssociations(compData.wallet_settings);
                  }
                  
                  // Load Permissions only if column exists
                  if (compData.permissions && compData.permissions.operator) {
                      setOpPermissions(prev => ({ ...prev, ...compData.permissions!.operator }));
                  }
              }
          } catch(e) {
              console.warn("Failed to load company settings fully", e);
          }

          // 2. Fetch Wallets
          const { data: walletData, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('company_id', userProfile.company_id);

          if (!walletError && walletData) {
              setWallets(walletData);
          }

          setLoading(false);
      };
      fetchData();
  }, [userProfile]);

  // ... (Masks e handleGeneralChange - igual)
  const maskCpfCnpj = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 11) {
      return v.replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return v.substring(0, 14).replace(/^(\d{2})(\d)/, '$1.$2')
              .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
              .replace(/\.(\d{3})(\d)/, '.$1/$2')
              .replace(/(\d{4})(\d)/, '$1-$2');
    }
  };

  const maskPhone = (value: string) => {
    let v = value.replace(/\D/g, '');
    v = v.substring(0, 11);
    if (v.length > 10) {
       return v.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (v.length > 5) {
       return v.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2) {
       return v.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
    } else {
       return v.replace(/^(\d*)/, "($1");
    }
  };

  const handleGeneralChange = (field: keyof Company, value: any) => {
      let finalValue = value;
      if (field === 'cnpj') finalValue = maskCpfCnpj(value);
      if (field === 'phone' || field === 'whatsapp') finalValue = maskPhone(value);
      
      setGeneralForm(prev => ({ ...prev, [field]: finalValue }));

      if (field === 'name' && onCompanyUpdate) {
          onCompanyUpdate(finalValue);
      }
  };

  const handleSaveGeneral = async () => {
      if (!userProfile?.company_id) return;
      setSaving(true);
      setErrorMessage('');

      try {
          const { error } = await supabase
              .from('companies')
              .update(generalForm)
              .eq('id', userProfile.company_id);

          if (error) throw error;
          
          if (onCompanyUpdate && generalForm.name) {
              onCompanyUpdate(generalForm.name);
          }

          setShowToast(true);
      } catch (error: any) {
          console.error(error);
          setErrorMessage("Erro ao salvar dados da empresa.");
      } finally {
          setSaving(false);
      }
  };

  const handleSaveAssociations = async () => {
      if (!userProfile?.company_id) return;
      setSaving(true);
      setErrorMessage('');
      
      try {
          const { error } = await supabase
              .from('companies')
              .update({ wallet_settings: walletAssociations })
              .eq('id', userProfile.company_id);

          if (error) throw error;
          setShowToast(true);
      } catch (error: any) {
          setErrorMessage(error.message || "Erro ao salvar.");
      } finally {
          setSaving(false);
      }
  };

  const handleSavePermissions = async () => {
      if (!userProfile?.company_id) return;
      setSaving(true);
      setErrorMessage('');

      try {
          const permissionsPayload = {
              operator: opPermissions
          };

          const { error } = await supabase
              .from('companies')
              .update({ permissions: permissionsPayload })
              .eq('id', userProfile.company_id);

          if (error) throw error;
          setShowToast(true);
          
          // NOTIFICA O APP PRINCIPAL PARA RECARREGAR
          if (onPermissionsUpdate) {
              onPermissionsUpdate();
          }
      } catch (error: any) {
          console.error(error);
          
          // CHECK ESPECÍFICO DE ERRO DE COLUNA FALTANDO (Postgres Error 42703: undefined_column)
          if (error.code === '42703' || error.message?.includes('column "permissions" of relation "companies" does not exist')) {
             alert("ATENÇÃO: O banco de dados precisa ser atualizado.\n\nA coluna 'permissions' não existe. Por favor, execute o comando SQL fornecido para criar a coluna.");
             setErrorMessage("Erro: Coluna de permissões ausente no banco de dados.");
          } else {
             setErrorMessage("Erro ao salvar permissões.");
          }
      } finally {
          setSaving(false);
      }
  };

  const handleAssociationChange = (methodId: string, walletId: string) => {
      setWalletAssociations(prev => ({
          ...prev,
          [methodId]: walletId
      }));
  };

  const togglePermission = (key: keyof OperatorPermissions) => {
      setOpPermissions(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8f9fa] relative">
      {/* Header */}
      <header className="bg-[#f8f9fa] px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
             <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 hover:bg-gray-200 rounded">
                <List size={20} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">Configurações</h2>
        </div>
        
        <div className="flex items-center gap-4 text-gray-600">
          <button className="flex items-center gap-1 hover:text-gray-900">
            <HelpCircle size={18} />
            <span className="text-sm font-medium">Ajuda</span>
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 pb-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
            {tabs.map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        activeTab === tab 
                        ? 'bg-[#2dd4bf] text-white' 
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        
        {loading ? (
             <div className="flex items-center justify-center h-64 text-gray-400">
                 <Loader2 className="animate-spin mr-2" /> Carregando dados...
             </div>
        ) : (
            <>
                {/* ======================= GERAL TAB ======================= */}
                {activeTab === 'GERAL' && (
                    <>
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center mb-3">
                                <Store size={32} className="text-[#2dd4bf]" />
                            </div>
                            <h3 className="text-gray-800 font-bold text-lg">Informações gerais</h3>
                            <p className="text-gray-500 text-sm">Forneça detalhes sobre seu negócio</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto pb-10">
                            
                            {/* LEFT COLUMN */}
                            <div className="space-y-6">
                                {/* IDENTIFICAÇÃO */}
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                    <h4 className="text-gray-700 font-bold mb-6">Identificação</h4>
                                    <FloatingInput 
                                        label="Nome da Loja" 
                                        value={generalForm.name} 
                                        onChange={(e: any) => handleGeneralChange('name', e.target.value)}
                                    />
                                    <FloatingInput 
                                        label="Razão Social" 
                                        value={generalForm.social_reason} 
                                        onChange={(e: any) => handleGeneralChange('social_reason', e.target.value)}
                                    />
                                    <FloatingInput 
                                        label="CPF ou CNPJ" 
                                        value={generalForm.cnpj} 
                                        onChange={(e: any) => handleGeneralChange('cnpj', e.target.value)}
                                    />
                                    <div className="bg-emerald-50 p-3 rounded-lg text-xs text-emerald-800 border border-emerald-100 mt-2">
                                        Informar o CPF ou CNPJ é uma medida para validar a sua conta e preservar sua privacidade.
                                    </div>
                                </div>

                                {/* CONTATO */}
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                    <h4 className="text-gray-700 font-bold mb-6">Dados de contato</h4>
                                    
                                    <FloatingInput 
                                        label="Telefone" 
                                        value={generalForm.phone} 
                                        prefix={<div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-0"><img src="https://flagcdn.com/w20/br.png" width="16" alt="BR"/></div>}
                                        onChange={(e: any) => handleGeneralChange('phone', e.target.value)}
                                        icon={<Phone size={16}/>}
                                    />
                                    <FloatingInput 
                                        label="Celular/WhatsApp" 
                                        value={generalForm.whatsapp} 
                                        prefix={<div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-0"><img src="https://flagcdn.com/w20/br.png" width="16" alt="BR"/></div>}
                                        onChange={(e: any) => handleGeneralChange('whatsapp', e.target.value)}
                                        icon={<Phone size={16}/>}
                                    />
                                    <FloatingInput 
                                        label="Instagram" 
                                        value={generalForm.instagram} 
                                        prefix="@"
                                        onChange={(e: any) => handleGeneralChange('instagram', e.target.value)}
                                        icon={<Instagram size={16}/>}
                                    />
                                    <FloatingInput 
                                        label="E-mail" 
                                        value={generalForm.email} 
                                        type="email"
                                        onChange={(e: any) => handleGeneralChange('email', e.target.value)}
                                        icon={<Mail size={16}/>}
                                    />
                                </div>

                                {/* ENDEREÇO */}
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="text-gray-700 font-bold">Endereço</h4>
                                        <button className="text-xs text-[#2dd4bf] font-bold hover:underline flex items-center gap-1">
                                            <MapPin size={12}/> Ver no mapa
                                        </button>
                                    </div>
                                    <FloatingInput 
                                        label="Endereço Completo" 
                                        value={generalForm.address} 
                                        onChange={(e: any) => handleGeneralChange('address', e.target.value)}
                                    />
                                    <FloatingInput 
                                        label="Complemento" 
                                        value={generalForm.complement} 
                                        onChange={(e: any) => handleGeneralChange('complement', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="space-y-6">
                                
                                {/* LOGO / BRANDING */}
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center">
                                    {generalForm.logo_url ? (
                                        <img src={generalForm.logo_url} alt="Logo" className="max-h-24 object-contain mb-4" />
                                    ) : (
                                        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-4 text-gray-400">
                                            <ImageIcon size={48} />
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500 mb-2">URL da Logo (Upload em breve)</p>
                                    <input 
                                        type="text"
                                        className="w-full border border-gray-300 rounded p-2 text-xs"
                                        placeholder="https://..."
                                        value={generalForm.logo_url}
                                        onChange={(e) => handleGeneralChange('logo_url', e.target.value)}
                                    />
                                </div>

                                {/* SOBRE A LOJA */}
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                    <h4 className="text-gray-700 font-bold mb-6">Sobre a loja</h4>
                                    <FloatingInput 
                                        label="Informações extras" 
                                        value={generalForm.description} 
                                        multiline
                                        onChange={(e: any) => handleGeneralChange('description', e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-2">
                                        Neste campo você pode adicionar o endereço do seu negócio, horário de funcionamento e o que mais você precisar.
                                    </p>
                                </div>

                                {/* MOEDA & CONFIG */}
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                    <h4 className="text-gray-700 font-bold mb-6">Moeda</h4>
                                    
                                    <div className="mb-4">
                                        <select 
                                            className="w-full border border-gray-300 rounded p-3 bg-white text-sm outline-none focus:border-[#2dd4bf]"
                                            value={generalForm.currency}
                                            onChange={(e) => handleGeneralChange('currency', e.target.value)}
                                        >
                                            <option value="BRL">BR - R$</option>
                                            <option value="USD">US - $</option>
                                            <option value="EUR">EU - €</option>
                                        </select>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-700">Casas decimais</span>
                                        <button 
                                            onClick={() => handleGeneralChange('show_decimals', !generalForm.show_decimals)}
                                            className={`w-10 h-6 rounded-full p-1 transition-colors ${generalForm.show_decimals ? 'bg-[#2dd4bf]' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${generalForm.show_decimals ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                        </button>
                                    </div>
                                </div>

                                {/* OPÇÕES DE EXIBIÇÃO */}
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                    <h4 className="text-gray-700 font-bold mb-6">Opções de exibição</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-bold text-gray-600 mb-2">Transações canceladas</p>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 cursor-pointer" onClick={() => handleGeneralChange('cancelled_sales_visibility', 'strike')}>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${generalForm.cancelled_sales_visibility === 'strike' ? 'border-[#2dd4bf]' : 'border-gray-300'}`}>
                                                        {generalForm.cancelled_sales_visibility === 'strike' && <div className="w-2 h-2 rounded-full bg-[#2dd4bf]"></div>}
                                                    </div>
                                                    <span className={`text-sm font-medium ${generalForm.cancelled_sales_visibility === 'strike' ? 'text-gray-900' : 'text-gray-500'}`}>Exibir riscadas</span>
                                                </label>
                                                
                                                <label className="flex items-center gap-2 cursor-pointer" onClick={() => handleGeneralChange('cancelled_sales_visibility', 'hide')}>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${generalForm.cancelled_sales_visibility === 'hide' ? 'border-[#2dd4bf]' : 'border-gray-300'}`}>
                                                        {generalForm.cancelled_sales_visibility === 'hide' && <div className="w-2 h-2 rounded-full bg-[#2dd4bf]"></div>}
                                                    </div>
                                                    <span className={`text-sm font-medium ${generalForm.cancelled_sales_visibility === 'hide' ? 'text-gray-900' : 'text-gray-500'}`}>Ocultar</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button 
                                        onClick={handleSaveGeneral}
                                        disabled={saving}
                                        className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-teal-500/30 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                                    >
                                        {saving && <Loader2 size={16} className="animate-spin" />}
                                        Salvar Alterações
                                    </button>
                                </div>

                            </div>
                        </div>
                    </>
                )}

                {/* ... (outras tabs permanecem inalteradas) ... */}
                {activeTab === 'CARTEIRAS' && (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Conteúdo da aba CARTEIRAS */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center mb-3">
                                <Wallet size={32} className="text-[#2dd4bf]" />
                            </div>
                            <h3 className="text-gray-800 font-bold text-lg">Associação de Carteiras</h3>
                            <p className="text-gray-500 text-sm text-center max-w-lg">
                                Defina em qual carteira o valor de cada venda será lançado automaticamente.
                            </p>
                        </div>

                        {errorMessage && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
                                <AlertCircle size={20} />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {wallets.length === 0 ? (
                            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
                                <AlertCircle size={48} className="mx-auto text-amber-400 mb-4" />
                                <h3 className="text-gray-800 font-bold text-lg mb-2">Nenhuma carteira encontrada</h3>
                                <p className="text-gray-500 text-sm mb-6">
                                    Você precisa criar carteiras no módulo financeiro antes de fazer as associações.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                    <h4 className="text-gray-800 font-bold flex items-center gap-2">
                                        <ArrowRightLeft size={18} className="text-gray-400" />
                                        Mapeamento de Pagamentos
                                    </h4>
                                </div>
                                
                                <div className="divide-y divide-gray-100">
                                    {paymentMethodsList.map((method) => (
                                        <div key={method.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${method.bg} ${method.color}`}>
                                                    <method.icon size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{method.label}</p>
                                                    <p className="text-xs text-gray-400">Destino do saldo</p>
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-72 relative">
                                                <select
                                                    value={walletAssociations[method.id] || ''}
                                                    onChange={(e) => handleAssociationChange(method.id, e.target.value)}
                                                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-2.5 pl-3 pr-10 text-sm text-gray-700 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all cursor-pointer"
                                                >
                                                    <option value="">Sem carteira vinculada</option>
                                                    {wallets.map(wallet => (
                                                        <option key={wallet.id} value={wallet.id}>
                                                            {wallet.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                                    <button 
                                        onClick={handleSaveAssociations}
                                        disabled={saving}
                                        className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold py-3 px-8 rounded-lg shadow-sm flex items-center gap-2 transition-all"
                                    >
                                        {saving && <Loader2 size={18} className="animate-spin" />}
                                        Salvar Mapeamento
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ================= PERMISSÕES TAB (DINÂMICO) ================= */}
                {activeTab === 'PERMISSÕES' && (
                    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                        
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center mb-3">
                                <Shield size={32} className="text-[#2dd4bf]" />
                            </div>
                            <h3 className="text-gray-800 font-bold text-lg">Controle de Permissões</h3>
                            <p className="text-gray-500 text-sm text-center max-w-lg">
                                Configure qual tela do menu o usuário "Operador" pode acessar.
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide bg-gray-100 px-2 py-0.5 rounded">Nota: Estas configurações não afetam Administradores</p>
                        </div>

                        {errorMessage && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
                                <AlertCircle size={20} />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <h4 className="text-gray-800 font-bold flex items-center gap-2 text-base">
                                    <User size={18} className="text-blue-500" />
                                    Permissões do Operador
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">Oculte ou exiba itens do menu lateral para operadores.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                                {/* Mapeamento Dinâmico baseado na Estrutura do Menu */}
                                {MENU_PERMISSIONS_MAPPING.map(item => (
                                    <PermissionToggle 
                                        key={item.key}
                                        label={item.label}
                                        description={item.desc}
                                        icon={item.icon}
                                        isChecked={opPermissions[item.key as keyof OperatorPermissions]}
                                        onToggle={() => togglePermission(item.key as keyof OperatorPermissions)} 
                                    />
                                ))}
                                
                                {/* Opção extra "Stock" que não está no menu principal mas é uma feature importante */}
                                <PermissionToggle 
                                    label="Controle de Estoque"
                                    description="Acesso a edição de quantidade em Produtos"
                                    icon={LayoutGrid}
                                    isChecked={opPermissions.stock}
                                    onToggle={() => togglePermission('stock')} 
                                />
                            </div>

                            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
                                <button 
                                    onClick={handleSavePermissions}
                                    disabled={saving}
                                    className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold py-3 px-8 rounded-lg shadow-sm flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                                >
                                    {saving && <Loader2 size={18} className="animate-spin" />}
                                    Salvar Permissões
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================= RECIBO TAB (Visual only for now) ======================= */}
                {activeTab === 'RECIBO' && (
                     <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Receipt size={48} className="mb-4 opacity-20" />
                        <p>Visualização de Recibo (Configuração disponível em breve)</p>
                     </div>
                )}
            </>
        )}

      </div>
      <Toast message="Configurações salvas!" isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default SettingsScreen;
