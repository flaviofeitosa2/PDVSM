
import React from 'react';
import { CheckCircle, Zap, BarChart2, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      {/* Navbar */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-[#2dd4bf] text-white p-1 rounded font-bold text-xl">SM</div>
            <span className="text-xl font-bold text-gray-800 tracking-tight">SuaMeta</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="text-gray-600 hover:text-[#2dd4bf] font-medium transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={onRegister}
              className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white px-5 py-2 rounded-full font-bold transition-all shadow-lg shadow-teal-500/30"
            >
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-teal-50 to-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-in slide-in-from-left-10 duration-700">
            <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Zap size={14} fill="currentColor" /> Novo PDV 2.0
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
              O sistema de vendas que <span className="text-[#2dd4bf]">simplifica</span> o seu negócio.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
              Transforme seu celular, tablet ou computador em um ponto de venda poderoso. Controle estoque, gerencie clientes e venda mais, de onde estiver.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onRegister}
                className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white text-lg px-8 py-4 rounded-full font-bold transition-all shadow-xl shadow-teal-500/30 flex items-center justify-center gap-2"
              >
                Criar Conta Grátis <ArrowRight size={20} />
              </button>
              <button 
                onClick={onLogin}
                className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 text-lg px-8 py-4 rounded-full font-bold transition-all flex items-center justify-center"
              >
                Já tenho conta
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500" /> Sem cartão de crédito</span>
              <span className="flex items-center gap-1"><CheckCircle size={16} className="text-green-500" /> Instalação grátis</span>
            </div>
          </div>

          {/* Hero Image Mockup */}
          <div className="relative animate-in slide-in-from-bottom-10 duration-1000 delay-200">
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 overflow-hidden transform rotate-1 hover:rotate-0 transition-transform duration-500">
               {/* Simulate App Header */}
               <div className="bg-gray-800 h-6 rounded-t-lg mb-2 flex items-center px-3 gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
               </div>
               {/* Simulate App Content Area */}
               <div className="bg-gray-100 rounded h-[350px] lg:h-[450px] flex overflow-hidden relative">
                  {/* Sidebar Mock */}
                  <div className="w-16 bg-gray-800 h-full hidden sm:flex flex-col items-center py-4 gap-4">
                      <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
                      <div className="w-6 h-1 bg-gray-600 rounded"></div>
                      <div className="w-6 h-1 bg-gray-600 rounded"></div>
                  </div>
                  {/* Content Mock */}
                  <div className="flex-1 p-4 grid grid-cols-2 gap-4 overflow-hidden">
                      <div className="bg-white h-32 rounded shadow-sm"></div>
                      <div className="bg-white h-32 rounded shadow-sm"></div>
                      <div className="bg-white h-32 rounded shadow-sm"></div>
                      <div className="bg-white h-32 rounded shadow-sm"></div>
                      <div className="absolute bottom-4 right-4 bg-[#2dd4bf] text-white px-4 py-2 rounded-lg shadow-lg font-bold text-sm">
                          Total: R$ 150,00
                      </div>
                  </div>
               </div>
            </div>
            {/* Decor Elements */}
            <div className="absolute -top-10 -right-10 text-[#2dd4bf] opacity-20">
               <Zap size={120} fill="currentColor" />
            </div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tudo o que sua loja precisa</h2>
            <p className="text-gray-500 text-lg">Deixe as planilhas de lado. Tenha controle total do seu estoque, vendas e clientes em um único lugar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Smartphone, title: 'PDV Móvel e Desktop', desc: 'Venda pelo celular, tablet ou computador. Seu caixa vai onde você for.' },
              { icon: BarChart2, title: 'Gestão de Estoque', desc: 'Acompanhe entradas e saídas em tempo real e evite furos no estoque.' },
              { icon: ShieldCheck, title: 'Controle Financeiro', desc: 'Saiba exatamente quanto vendeu, ticket médio e formas de pagamento.' },
            ].map((feature, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow border border-gray-100">
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#2dd4bf] mb-6">
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="bg-gray-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Pronto para profissionalizar sua loja?</h2>
          <p className="text-gray-400 mb-8 text-lg">Junte-se a milhares de empreendedores que usam o SuaMeta para crescer.</p>
          <button 
            onClick={onRegister}
            className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white text-lg px-10 py-4 rounded-full font-bold transition-transform hover:scale-105 shadow-xl shadow-teal-500/20"
          >
            Começar Agora
          </button>
          <p className="mt-12 text-gray-600 text-sm">© 2024 SuaMeta Tecnologia. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
