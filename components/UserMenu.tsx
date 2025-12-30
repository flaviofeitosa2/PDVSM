
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';

const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [userInfo, setUserInfo] = useState({
    name: 'Carregando...',
    email: '',
    initials: '...'
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Tenta buscar do perfil primeiro (fonte da verdade)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const fullName = profile?.full_name || user.user_metadata?.full_name || 'Usuário';
        const firstName = fullName.split(' ')[0]; // Pega apenas o primeiro nome
        const email = user.email || '';
        const initials = fullName.substring(0, 2).toUpperCase();

        setUserInfo({
          name: firstName,
          email: email,
          initials: initials
        });
      }
    };
    
    fetchUser();

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    // O App.tsx detectará o evento SIGNED_OUT e redirecionará
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        className="flex items-center gap-2 text-left hover:bg-gray-100 p-1 -mr-1 rounded-lg transition-colors outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold uppercase">
          {userInfo.initials}
        </div>
        <div className="hidden sm:block text-sm leading-tight">
          <p className="font-semibold text-gray-900">{userInfo.name}</p>
          <p className="text-gray-500 text-xs truncate max-w-[140px]" title={userInfo.email}>
            {userInfo.email}
          </p>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[#2d3748] rounded-lg shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right border border-gray-700">
           
           <div className="px-5 py-3 border-b border-gray-600 mb-1">
              <p className="text-white font-bold text-sm truncate">{userInfo.name}</p>
              <p className="text-gray-400 text-xs truncate">{userInfo.email}</p>
           </div>
           
           <div className="px-5 py-2">
              <button className="text-gray-300 font-medium text-sm hover:text-white w-full text-left transition-colors">
                  Gerenciar assinatura
              </button>
           </div>
           
           <div className="px-5 py-2 pb-3">
              <button 
                onClick={handleSignOut}
                className="text-red-400 font-bold text-sm hover:text-red-300 w-full text-left transition-colors"
              >
                  Sair
              </button>
           </div>

           <div className="border-t border-gray-600 my-1 mx-5"></div>

           <div className="px-5 py-3">
               <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-wide">EM BREVE</p>
               <button className="text-gray-500 text-sm font-medium cursor-not-allowed w-full text-left" disabled>
                  Redefinir senha
               </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
