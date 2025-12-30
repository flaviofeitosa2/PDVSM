
import React, { useState, useEffect } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey, supabase as mainSupabase } from '../supabaseClient';
import { UserRole } from '../types';

interface UserPanelProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onUserAdded: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({ isOpen, onClose, companyId, onUserAdded }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields when panel opens/closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setRole('operator');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
      if (!name || !email || !password) return;
      if (password.length < 6) {
          setError("A senha deve ter no mínimo 6 caracteres.");
          return;
      }

      setLoading(true);
      setError(null);

      try {
          // CRITICAL FIX: Create a temporary client that DOES NOT persist the session.
          // This prevents the new user's login from overwriting the current Admin's session in localStorage.
          const tempClient = createClient(supabaseUrl, supabaseKey, {
              auth: {
                  persistSession: false,
                  autoRefreshToken: false,
                  detectSessionInUrl: false
              }
          });

          // 1. Create Auth User
          const { data: authData, error: authError } = await tempClient.auth.signUp({
              email,
              password,
              options: {
                  data: {
                      full_name: name
                  }
              }
          });

          if (authError) throw authError;

          if (authData.user) {
              // 2. Insert/Upsert Profile (Using the MAIN authenticated client which has Admin permissions)
              // We use upsert to prevent errors if a Database Trigger already created a skeleton profile.
              const { error: profileError } = await mainSupabase
                  .from('profiles')
                  .upsert({
                      id: authData.user.id,
                      full_name: name,
                      role: role,
                      company_id: companyId,
                      email: email // Saving email in profile for easy listing
                  })
                  .select();

              if (profileError) {
                   console.error("Profile creation error:", profileError);
                   // Detailed error for debugging RLS issues
                   throw new Error(`Erro ao vincular perfil: ${profileError.message}`);
              }

              // Success!
              onUserAdded();
              onClose();
          } else {
              throw new Error("O usuário foi criado, mas não houve retorno de dados. Verifique se a confirmação de e-mail está ativada.");
          }

      } catch (err: any) {
          console.error(err);
          setError(err.message || "Erro desconhecido ao criar usuário.");
      } finally {
          setLoading(false);
      }
  };

  const isValid = name.trim().length > 0 && email.trim().length > 0 && password.trim().length >= 6;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 z-50 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">Adicionar usuário</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
           
           {error && (
               <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">
                   {error}
               </div>
           )}

           <div className="relative">
              <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-medium text-gray-500 transition-colors peer-focus:text-[#2dd4bf]">
                Nome Completo
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all"
                autoFocus
                placeholder="Ex: Maria Silva"
              />
           </div>

           <div className="relative">
              <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-medium text-gray-500 transition-colors peer-focus:text-[#2dd4bf]">
                Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all"
                placeholder="Ex: maria@empresa.com"
              />
           </div>

           <div className="relative">
              <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-medium text-gray-500 transition-colors peer-focus:text-[#2dd4bf]">
                Senha
              </label>
              <div className="relative">
                <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 pr-10 text-gray-700 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all"
                    placeholder="Mínimo 6 caracteres"
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
           </div>

           <div className="relative">
              <label className="absolute -top-2 left-2 bg-white px-1 text-xs font-medium text-gray-500 transition-colors">
                Função (Permissão)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-700 outline-none focus:border-[#2dd4bf] focus:ring-1 focus:ring-[#2dd4bf] transition-all bg-white"
              >
                  <option value="operator">Operador (Acesso PDV)</option>
                  <option value="admin">Administrador (Acesso Total)</option>
              </select>
           </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0">
           <div className="flex justify-end gap-3">
               <button 
                 onClick={onClose}
                 className="px-6 py-2.5 border border-gray-300 rounded text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
                 disabled={loading}
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleSubmit}
                 disabled={!isValid || loading}
                 className={`px-6 py-2.5 rounded font-bold text-sm transition-colors flex items-center gap-2 ${
                   isValid && !loading
                    ? 'bg-[#2dd4bf] hover:bg-[#14b8a6] text-white cursor-pointer shadow-lg shadow-teal-500/30' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                 }`}
               >
                 {loading && <Loader2 size={16} className="animate-spin" />}
                 Salvar Usuário
               </button>
           </div>
        </div>
      </div>
    </>
  );
};

export default UserPanel;
