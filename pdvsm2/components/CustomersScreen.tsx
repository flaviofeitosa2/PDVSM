
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Upload, 
  UserPlus, 
  Phone, 
  Mail, 
  Loader2, 
  Edit2, 
  Trash2, 
  UserX, 
  AlertTriangle,
  Calendar,
  HelpCircle,
  List
} from 'lucide-react';
import { Customer } from '../types';
import UserMenu from './UserMenu';
import CustomerForm from './CustomerForm';
import CustomerImportModal from './CustomerImportModal';
import Toast from './Toast';

interface CustomersScreenProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => Promise<Customer | null>;
  onUpdateCustomer: (customer: Customer, silent?: boolean) => Promise<void>;
  onImportCustomers: (customers: Customer[]) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  toggleSidebar: () => void;
}

const CustomersScreen: React.FC<CustomersScreenProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onImportCustomers,
  onDeleteCustomer,
  toggleSidebar
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // States para o Modal de Exclusão
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCustomers = useMemo(() => {
      return customers.filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (c.fantasyName && c.fantasyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (c.cpf && c.cpf.includes(searchQuery)) ||
          (c.phone && c.phone.includes(searchQuery))
      ).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }, [customers, searchQuery]);

  const newThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return customers.filter(c => c.createdAt && new Date(c.createdAt) >= startOfMonth).length;
  }, [customers]);

  const handleDeleteClick = (e: React.MouseEvent, customer: Customer) => {
      e.stopPropagation();
      setCustomerToDelete({ id: customer.id, name: customer.name });
  };

  const handleConfirmDelete = async () => {
      if (!customerToDelete) return;
      setIsDeleting(true);
      try {
          await onDeleteCustomer(customerToDelete.id);
          setCustomerToDelete(null);
          setToastMessage("Cliente excluído com sucesso!");
          setShowToast(true);
      } catch (error) {
          console.error("Erro ao excluir:", error);
      } finally {
          setIsDeleting(false);
      }
  };

  const handleToggleSubscriber = async (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    const updated = { ...customer, isSubscriber: !customer.isSubscriber };
    await onUpdateCustomer(updated, true);
  };

  const getDateBadge = (dateStr?: string) => {
    if (!dateStr) return { day: '--', month: '---' };
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return { day: '--', month: '---' };
        
        // Usamos getUTCDate para evitar que fusos horários locais alterem o dia original do banco
        const day = date.getUTCDate().toString().padStart(2, '0');
        
        const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const month = months[date.getUTCMonth()];
        
        return { day, month };
    } catch {
        return { day: '--', month: '---' };
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f0f2f5] relative font-sans">
       
       {customerToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                          <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Cliente?</h3>
                      <p className="text-gray-500 text-sm mb-6">
                          Você vai excluir <span className="font-bold text-gray-800">"{customerToDelete.name}"</span>. 
                      </p>
                      <div className="flex gap-3 w-full">
                          <button onClick={() => setCustomerToDelete(null)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors" disabled={isDeleting}>Cancelar</button>
                          <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2" disabled={isDeleting}>
                              {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Excluir
                          </button>
                      </div>
                  </div>
              </div>
          </div>
       )}

       <CustomerImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImport={async (list) => { await onImportCustomers(list); setIsImportOpen(false); }} existingCustomers={customers} />

       {isFormOpen ? (
          <CustomerForm onBack={() => setIsFormOpen(false)} onSave={async (c) => { if (editingCustomer) await onUpdateCustomer(c); else await onAddCustomer(c); setIsFormOpen(false); }} initialData={editingCustomer || undefined} />
       ) : (
          <>
            <div className="bg-[#2ebc7d] text-white shadow-md flex-shrink-0 relative z-20 px-8 py-6">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-3">
                        {/* Botão de Menu para Mobile */}
                        <button 
                            onClick={toggleSidebar} 
                            className="lg:hidden p-2 text-white/80 hover:bg-white/10 rounded transition-colors"
                        >
                            <List size={24} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight uppercase leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>CLIENTES</h2>
                            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">GESTÃO DE RELACIONAMENTO</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors backdrop-blur-sm">
                            <HelpCircle size={14} /> Ajuda
                        </button>
                        <UserMenu />
                    </div>
                </div>

                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10">
                            <Users size={28} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-4xl font-black leading-none">{customers.length}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-90 mt-1">TOTAL DE CLIENTES</span>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/20"></div>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10">
                            <Calendar size={28} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-4xl font-black leading-none">+{newThisMonth}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest opacity-90 mt-1">NOVOS ESTE MÊS</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border-b border-gray-100 px-8 py-4 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-10">
                <div className="relative flex-1 max-w-lg">
                    <input 
                      type="text" 
                      placeholder="BUSCAR CLIENTE..." 
                      className="w-full pl-10 pr-4 py-2.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#2ebc7d]/30 transition-all font-medium" 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={() => {}} className="p-2.5 text-gray-400 hover:text-[#2ebc7d] hover:bg-gray-50 rounded-lg border border-gray-200 transition-all"><Download size={18} /></button>
                    <button onClick={() => setIsImportOpen(true)} className="p-2.5 text-gray-400 hover:text-[#2ebc7d] hover:bg-gray-50 rounded-lg border border-gray-200 transition-all"><Upload size={18} /></button>
                    <button 
                        onClick={() => { setEditingCustomer(null); setIsFormOpen(true); }} 
                        className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-black text-xs px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 uppercase transition-all active:scale-95"
                    >
                        <UserPlus size={18} strokeWidth={3} /> NOVO CLIENTE
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white text-gray-400 font-bold text-[10px] uppercase tracking-widest border-b border-gray-50">
                                <tr>
                                    <th className="px-6 py-5 w-24">DATA</th>
                                    <th className="px-6 py-5">CLIENTE</th>
                                    <th className="px-6 py-5">CPF/CNPJ</th>
                                    <th className="px-6 py-5">CONTATO</th>
                                    <th className="px-6 py-5">E-MAIL</th>
                                    <th className="px-6 py-5 text-center">ASSINANTE</th>
                                    <th className="px-6 py-5 text-right">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-20 text-center flex flex-col items-center justify-center text-gray-400">
                                            <UserX size={48} className="mb-4 opacity-20" />
                                            <p className="font-bold text-sm">Nenhum cliente encontrado.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map((customer) => {
                                        const { day, month } = getDateBadge(customer.createdAt);
                                        const waLink = customer.phone ? `https://wa.me/${customer.phone.replace(/\D/g, '')}` : '#';
                                        const avatarText = customer.avatarText || (customer.name ? customer.name.substring(0, 2).toUpperCase() : '??');
                                        
                                        return (
                                            <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group cursor-default">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col items-center justify-center rounded-lg w-12 h-12 border border-blue-100 bg-blue-50/50">
                                                        <span className="text-lg font-bold text-blue-900 leading-none">{day}</span>
                                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mt-0.5">{month}</span>
                                                    </div>
                                                </td>
                                                
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-[#f0f2f5] flex items-center justify-center text-slate-500 font-bold text-xs border border-gray-100">
                                                            {avatarText}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="font-semibold text-gray-700 text-sm tracking-tight">{customer.name}</div>
                                                            {(customer.fantasyName || customer.socialReason) && (
                                                                <div className="text-[11px] text-gray-400 font-medium uppercase truncate max-w-[200px] mt-0.5">
                                                                    {customer.fantasyName || customer.socialReason}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                
                                                <td className="px-6 py-4 text-xs text-gray-500 font-medium tracking-wide">
                                                    {customer.cpf || '-'}
                                                </td>
                                                
                                                <td className="px-6 py-4">
                                                    {customer.phone ? (
                                                        <a 
                                                          href={waLink} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer"
                                                          className="flex items-center gap-2 text-[#2ebc7d] hover:text-[#259c68] hover:underline font-semibold text-xs transition-colors"
                                                        >
                                                            <Phone size={14} className="fill-current" />
                                                            {customer.phone}
                                                        </a>
                                                    ) : '-'}
                                                </td>
                                                
                                                <td className="px-6 py-4">
                                                    {customer.email ? (
                                                        <div className="flex items-center gap-2 text-gray-500 font-medium text-xs">
                                                            <Mail size={14} className="text-gray-300" />
                                                            {customer.email}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                
                                                <td className="px-6 py-4 text-center">
                                                    <div 
                                                        onClick={(e) => handleToggleSubscriber(e, customer)}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer border ${customer.isSubscriber ? 'bg-[#2ebc7d] border-[#2ebc7d]' : 'bg-gray-200 border-gray-300'}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${customer.isSubscriber ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </div>
                                                </td>
                                                
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button 
                                                            onClick={() => { setEditingCustomer(customer); setIsFormOpen(true); }} 
                                                            className="p-2 text-gray-400 hover:text-[#2ebc7d] hover:bg-emerald-50 rounded-lg transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDeleteClick(e, customer)} 
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="mt-6 text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">
                    EXIBINDO {filteredCustomers.length} REGISTROS
                </div>
            </div>
          </>
       )}
       <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default CustomersScreen;
