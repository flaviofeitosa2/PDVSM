
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, Loader2, ArrowLeft, Building2, AlertCircle, CheckCircle, User, Briefcase, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  initialView?: 'login' | 'register';
  onBack: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ initialView = 'login', onBack }) => {
  const [view, setView] = useState<'login' | 'register'>(initialView);
  const [loginMode, setLoginMode] = useState<'company' | 'customer'>('company');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [fullName, setFullName] = useState('');
  const [cnpj, setCnpj] = useState('');

  const maskCnpj = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const isEmailValid = (email: string) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const translateError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.';
    if (msg.includes('Password should be at least')) return 'A senha deve ter no mínimo 6 caracteres.';
    if (msg.includes('Email not confirmed')) return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    
    if (view === 'register' && !isEmailValid(email)) {
      setError("Por favor, insira um e-mail válido.");
      return;
    }

    setLoading(true);

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // O App.tsx cuidará do redirecionamento pelo onAuthStateChange
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName } }
        });
        
        if (authError) throw authError;

        if (authData.user) {
            const { data: companyData, error: companyError } = await supabase
                .from('companies')
                .insert([{ name: storeName, cnpj: cnpj, owner_id: authData.user.id }])
                .select().single();

            if (companyError) throw companyError;

            await supabase.from('profiles').upsert({
                id: authData.user.id,
                full_name: fullName,
                role: 'owner',
                company_id: companyData.id,
                email: email.trim()
            });
        }

        if (authData.user && !authData.session) {
           setSuccessMsg("Cadastro realizado! Verifique seu e-mail para confirmar seu acesso.");
           setLoading(false);
        }
      }
    } catch (err: any) {
      setError(translateError(err.message || 'Erro na autenticação.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <div className={`lg:w-1/2 p-12 text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-500 ${loginMode === 'customer' ? 'bg-indigo-600' : 'bg-[#2dd4bf]'}`}>
        <div className="relative z-10">
            <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"><ArrowLeft size={20} /> Voltar</button>
            <h1 className="text-4xl lg:text-5xl font-extrabold mb-6 leading-tight animate-in fade-in slide-in-from-left duration-500">
                {view === 'login' 
                    ? (loginMode === 'customer' ? 'Área do Assinante' : 'Painel de Gestão') 
                    : 'Cadastre sua empresa'}
            </h1>
            <p className="text-white/90 text-lg max-w-md animate-in fade-in slide-in-from-left duration-700">
                {loginMode === 'customer' 
                    ? 'Acesse suas faturas, visualize seu histórico de pagamentos e gere boletos PIX de forma rápida.' 
                    : 'O PDV mais moderno para sua empresa. Controle estoque, clientes e vendas em um só lugar.'}
            </p>
        </div>
        
        <div className="relative z-10 mt-12 lg:mt-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-3">Selecione seu tipo de acesso</p>
            <div className="flex bg-black/10 backdrop-blur-md p-1 rounded-xl w-fit">
                <button 
                    onClick={() => { setLoginMode('company'); setError(null); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${loginMode === 'company' ? 'bg-white text-[#2dd4bf] shadow-xl' : 'text-white/60 hover:text-white'}`}
                >
                    <Briefcase size={16} /> Empresa
                </button>
                <button 
                    onClick={() => { setLoginMode('customer'); setError(null); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${loginMode === 'customer' ? 'bg-white text-indigo-600 shadow-xl' : 'text-white/60 hover:text-white'}`}
                >
                    <User size={16} /> Assinante
                </button>
            </div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl lg:shadow-none p-8 border border-gray-100 lg:border-0">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {view === 'login' ? 'Entrar na conta' : 'Crie sua conta'}
                </h2>
                <p className="text-sm text-gray-400 mt-1 font-medium">
                    {loginMode === 'customer' 
                      ? 'Informe os dados fornecidos pelo seu provedor.' 
                      : 'Acesso restrito para administradores e operadores.'}
                </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 flex gap-3 animate-in shake duration-300">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-2xl border border-emerald-100 flex gap-3">
                <CheckCircle size={18} className="shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {view === 'register' && (
                    <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Empresa</label>
                          <input type="text" required placeholder="Nome do seu negócio" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-teal-50 focus:border-[#2dd4bf] outline-none transition-all font-bold text-sm" value={storeName} onChange={e => setStoreName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">CNPJ</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="00.000.000/0000-00" 
                            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-teal-50 focus:border-[#2dd4bf] outline-none transition-all font-mono text-sm" 
                            value={cnpj} 
                            onChange={e => setCnpj(maskCnpj(e.target.value))} 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Seu Nome</label>
                          <input type="text" required placeholder="Nome completo" className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-teal-50 focus:border-[#2dd4bf] outline-none transition-all font-bold text-sm" value={fullName} onChange={e => setFullName(e.target.value)} />
                        </div>
                    </>
                )}
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">E-mail</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-500 transition-colors" size={18} />
                      <input 
                          type="email" 
                          required 
                          placeholder="seu@email.com" 
                          className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 outline-none transition-all font-bold text-sm focus:ring-4 ${loginMode === 'customer' ? 'focus:ring-indigo-50 focus:border-indigo-500' : 'focus:ring-teal-50 focus:border-[#2dd4bf]'}`} 
                          value={email} 
                          onChange={e => setEmail(e.target.value)} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Senha</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-500 transition-colors" size={18} />
                      <input 
                          type={showPassword ? "text" : "password"}
                          required 
                          placeholder="••••••••" 
                          className={`w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-200 outline-none transition-all font-bold text-sm focus:ring-4 ${loginMode === 'customer' ? 'focus:ring-indigo-50 focus:border-indigo-500' : 'focus:ring-teal-50 focus:border-[#2dd4bf]'}`} 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                
                <button 
                    type="submit" 
                    disabled={loading} 
                    className={`w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale ${loginMode === 'customer' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-[#2dd4bf] hover:bg-[#14b8a6] shadow-teal-100'}`}
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : (view === 'login' ? 'ENTRAR AGORA' : 'CRIAR CONTA')}
                </button>
            </form>
            
            {loginMode === 'company' && (
                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(null); setSuccessMsg(null); }} className="text-[#2dd4bf] font-black text-[10px] uppercase tracking-wider hover:underline">
                        {view === 'login' ? 'Quero registrar minha empresa' : 'Já tenho conta empresarial'}
                    </button>
                </div>
            )}

            {loginMode === 'customer' && (
                <div className="mt-8 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase mb-2">Esqueceu sua senha?</p>
                    <button className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline">Recuperar Acesso</button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
