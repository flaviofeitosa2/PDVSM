
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  Bell, 
  ChevronRight, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  QrCode, 
  Copy, 
  Check, 
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  UserX,
  ArrowLeft,
  FileText,
  ExternalLink,
  Wallet,
  ArrowUpRight,
  Info,
  Smartphone
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile, Subscription, Sale } from '../types';
import SaleDetailPanel from './SaleDetailPanel';

interface SubscriberPortalProps {
  userProfile: UserProfile;
}

const SubscriberPortal: React.FC<SubscriberPortalProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'billing' | 'support'>('dashboard');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!userProfile.customer_id) {
          setLoading(false);
          return;
      }

      setLoading(true);
      try {
          const [subRes, invRes] = await Promise.all([
            supabase.from('subscriptions').select('*').eq('customer_id', userProfile.customer_id).eq('status', 'active'),
            supabase.from('sales').select('*').eq('customer_id', userProfile.customer_id).order('date', { ascending: false })
          ]);

          if (subRes.data) setSubscriptions(subRes.data);
          if (invRes.data) {
              const parsedSales = invRes.data.map((s: any) => ({
                  ...s,
                  items: typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []),
                  payments: typeof s.payments === 'string' ? JSON.parse(s.payments) : (s.payments || [])
              }));
              setInvoices(parsedSales);
          }
      } catch (err) {
          console.error("SubscriberPortal: Erro ao carregar dados:", err);
      } finally {
          setLoading(false);
      }
    };

    loadData();
  }, [userProfile.customer_id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const copyPixCode = () => {
    const code = "00020101021226850014br.gov.bcb.pix011161999695005520400005303986540510.005802BR5925ESPACO DIGITAL6008BRASILIA62070503***6304ABCD";
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendProof = (invoice: Sale | null, periodName?: string) => {
      const saleCode = invoice?.code || 'RENOVAÇÃO';
      const value = invoice?.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || (nextSubscription ? nextSubscription.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');
      const period = periodName ? `referente a ${periodName}` : '';
      const text = encodeURIComponent(`Olá! Sou o(a) cliente ${userProfile.full_name}. Segue o comprovante de pagamento ${period} no valor de ${value}. (Ref: #${saleCode})`);
      window.open(`https://wa.me/5561999695005?text=${text}`, '_blank');
  };

  // Encontra a assinatura principal/próxima
  const nextSubscription = useMemo(() => {
      if (subscriptions.length === 0) return null;
      const pending = [...subscriptions]
        .filter(s => !s.payment_date)
        .sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());
      
      return pending.length > 0 ? pending[0] : subscriptions[0];
  }, [subscriptions]);

  // AJUSTE: O mês de referência agora é baseado na data de INÍCIO do ciclo
  const currentPeriodName = useMemo(() => {
    if (!nextSubscription?.start_date) return '';
    const date = new Date(nextSubscription.start_date);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [nextSubscription]);

  const progressData = useMemo(() => {
      if (!nextSubscription?.start_date || !nextSubscription?.end_date) return null;
      
      const start = new Date(nextSubscription.start_date).getTime();
      const end = new Date(nextSubscription.end_date).getTime();
      const now = new Date().getTime();
      
      const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const daysPassed = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, totalDays - daysPassed);
      const percent = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
      
      return { percent, daysRemaining, totalDays };
  }, [nextSubscription]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Carregando portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans pb-24 lg:pb-0">
      
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 sticky top-0 z-30 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 uppercase tracking-tighter leading-none">Portal do Assinante</h1>
            <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1 tracking-wider">{userProfile.full_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors bg-gray-50 rounded-full">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <button onClick={handleSignOut} className="bg-rose-50 text-rose-600 p-2.5 rounded-full hover:bg-rose-100 transition-colors">
                <LogOut size={18} />
            </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 space-y-8">
        
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            {nextSubscription && (
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">
                                    Ciclo {nextSubscription.frequency}
                                </p>
                                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                                    {new Date(nextSubscription.end_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                                </h2>
                                <p className="text-[10px] font-extrabold text-slate-400 uppercase mt-1 bg-slate-100 px-3 py-1 rounded-full w-fit">
                                    Referência: {currentPeriodName}
                                </p>
                            </div>
                            <div className={`px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border ${progressData && progressData.daysRemaining <= 5 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {progressData?.daysRemaining === 0 ? 'Vence Hoje' : `Faltam ${progressData?.daysRemaining} dias`}
                            </div>
                        </div>

                        <div className="mb-8 space-y-2">
                            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                <span>Progresso do Ciclo</span>
                                <span>{progressData?.percent.toFixed(0)}% concluído</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 shadow-sm ${progressData && progressData.percent > 85 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                                    style={{ width: `${progressData?.percent}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 shrink-0">
                                <Wallet size={24} />
                             </div>
                             <div className="flex-1 text-center sm:text-left">
                                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wide leading-none mb-1">Valor do Plano</p>
                                 <p className="text-xl font-black text-slate-800">{nextSubscription.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                             </div>
                             
                             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <button 
                                    onClick={() => {
                                        const mockInvoice: Sale = {
                                            id: 'RENEWAL-' + nextSubscription.id,
                                            code: nextSubscription.id.substring(0, 6).toUpperCase(),
                                            date: new Date().toISOString(),
                                            clientName: userProfile.full_name,
                                            total: nextSubscription.value,
                                            status: 'pending',
                                            paymentMethod: 'pix',
                                            sellerName: 'Espaço Digital',
                                            items: [{ id: 'S1', code: 'SUB', name: `Renovação ${nextSubscription.provider}`, price: nextSubscription.value, quantity: 1, category: 'Assinatura', image: '' }]
                                        };
                                        setSelectedInvoice(mockInvoice);
                                        setIsPixModalOpen(true);
                                    }}
                                    className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <QrCode size={18} /> PAGAR AGORA
                                </button>
                                
                                <button 
                                    onClick={() => handleSendProof(null, currentPeriodName)}
                                    className="bg-[#25D366] text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                >
                                    <MessageSquare size={18} /> ENVIAR COMPROVANTE
                                </button>
                             </div>
                        </div>
                    </div>
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full opacity-50 pointer-events-none"></div>
                </div>
            )}

            <section>
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Planos Ativos</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {subscriptions.map(sub => (
                        <div key={sub.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-all flex flex-col gap-4 group">
                            <div className="flex justify-between items-start">
                                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <ShieldCheck size={22} />
                                </div>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${sub.frequency === 'Anual' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                    {sub.frequency}
                                </span>
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">{sub.provider}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vencimento: {new Date(sub.end_date).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveTab('billing')} className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 shadow-sm flex flex-col items-center gap-3 hover:bg-indigo-50 transition-all group text-center">
                    <div className="p-4 bg-white text-indigo-600 rounded-3xl shadow-sm group-hover:scale-110 transition-transform"><CreditCard size={28} /></div>
                    <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Minhas Contas</span>
                </button>
                <button onClick={() => setActiveTab('support')} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center gap-3 hover:bg-slate-50 transition-all group text-center">
                    <div className="p-4 bg-slate-50 text-slate-600 rounded-3xl shadow-sm group-hover:scale-110 transition-transform"><HelpCircle size={28} /></div>
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Suporte Técnico</span>
                </button>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              <div className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                  <button onClick={() => setActiveTab('dashboard')} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors">
                      <ArrowLeft size={24} strokeWidth={2.5} />
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">Financeiro</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Faturas e recibos</p>
                  </div>
              </div>

              <div className="space-y-4">
                  {invoices.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                          <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sem faturas registradas</p>
                      </div>
                  ) : invoices.map(inv => {
                      const isPaid = inv.status === 'completed';
                      // Consideramos a data da venda/fatura como referência
                      const period = new Date(inv.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
                      return (
                        <div key={inv.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-6 group hover:border-indigo-100 transition-all">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                                        {isPaid ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Fatura #{inv.code}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            <Calendar size={12} /> {period}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-xl font-black text-slate-900 leading-none">{inv.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    <span className={`text-[10px] font-black uppercase mt-1 inline-block ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {isPaid ? 'Liquidada' : 'Pendente'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                                {!isPaid ? (
                                    <>
                                        <button 
                                            onClick={() => { setSelectedInvoice(inv); setIsPixModalOpen(true); }}
                                            className="bg-indigo-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <QrCode size={16} /> Checkout PIX
                                        </button>
                                        <button 
                                            onClick={() => handleSendProof(inv, period)}
                                            className="bg-[#25D366] text-white py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                        >
                                            <MessageSquare size={16} /> Enviar Comprovante
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setViewingReceipt(inv)}
                                            className="col-span-1 bg-slate-100 text-slate-600 py-3.5 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <FileText size={16} /> Ver Recibo
                                        </button>
                                        <button 
                                            onClick={() => handleSendProof(inv, period)}
                                            className="col-span-1 border border-slate-200 text-slate-400 py-3.5 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={16} /> Enviar Comprovante
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                      );
                  })}
              </div>
          </div>
        )}

        {activeTab === 'support' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              <section className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Perguntas Frequentes</h3>
                  <div className="space-y-6">
                      {[
                        { q: "Como vejo o recibo das parcelas pagas?", a: "Vá em 'Minhas Contas', localize uma fatura marcada como 'Liquidada' e clique em 'Ver Recibo'. Você pode salvar ou imprimir o cupom." },
                        { q: "Qual o prazo para o PIX ser aprovado?", a: "Pagamentos via PIX são automáticos e compensam em instantes. Caso demore, use o botão de WhatsApp para enviar o print." },
                        { q: "Posso alterar o ciclo de mensal para anual?", a: "Sim! Planos anuais ganham desconto. Entre em contato com o suporte para ajustarmos seu contrato." }
                      ].map((item, i) => (
                        <div key={i} className="group">
                            <p className="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                {item.q}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed pl-3.5 border-l border-slate-100">{item.a}</p>
                        </div>
                      ))}
                  </div>
              </section>
              
              <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                  <div className="p-5 bg-[#25D366] text-white rounded-[2rem] shadow-xl shadow-emerald-200">
                      <MessageSquare size={32} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                      <p className="text-lg font-black text-emerald-900 leading-tight">Suporte Prioritário</p>
                      <p className="text-xs text-emerald-600 font-medium">Fale conosco agora pelo WhatsApp.</p>
                  </div>
                  <button 
                    onClick={() => window.open('https://wa.me/5561999695005', '_blank')}
                    className="w-full sm:w-auto bg-[#25D366] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all"
                  >
                      Iniciar Conversa
                  </button>
              </div>
          </div>
        )}

      </main>

      <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-lg border border-slate-200/50 px-4 py-3 lg:hidden flex justify-around items-center z-40 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'dashboard' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
              <LayoutDashboard size={24} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
          </button>
          <button onClick={() => setActiveTab('billing')} className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'billing' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
              <CreditCard size={24} strokeWidth={activeTab === 'billing' ? 2.5 : 2} />
          </button>
          <button onClick={() => setActiveTab('support')} className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'support' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
              <HelpCircle size={24} strokeWidth={activeTab === 'support' ? 2.5 : 2} />
          </button>
          <div className="h-6 w-px bg-slate-100 mx-2"></div>
          <button onClick={handleSignOut} className="flex flex-col items-center gap-1 text-rose-400 hover:text-rose-600">
              <LogOut size={24} />
          </button>
      </nav>

      <SaleDetailPanel 
        isOpen={!!viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        sale={viewingReceipt}
      />

      {isPixModalOpen && selectedInvoice && (
          <div className="fixed inset-0 bg-slate-900/95 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden animate-in slide-in-from-bottom-10 duration-500 shadow-2xl">
                  
                  <div className="px-10 py-8 flex justify-between items-center border-b border-slate-50 bg-slate-50/30">
                      <div className="flex items-center gap-4">
                          <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg">
                            <QrCode size={24} strokeWidth={2.5} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">Checkout Seguro</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Fatura #{selectedInvoice.code}</p>
                          </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-indigo-600 block">{selectedInvoice.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                  </div>

                  <div className="p-10 space-y-8 text-center">
                      
                      <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3 text-left">
                              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100">
                                  <ShieldCheck size={20} />
                              </div>
                              <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Mês de Referência</p>
                                  <p className="text-sm font-bold text-slate-800">{currentPeriodName}</p>
                              </div>
                          </div>
                          {nextSubscription && (
                              <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Frequência</p>
                                  <span className="text-[10px] font-black uppercase px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg">
                                      {nextSubscription.frequency}
                                  </span>
                              </div>
                          )}
                      </div>

                      <div className="space-y-4">
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                              Escaneie o QR Code abaixo
                          </p>
                          <div className="bg-white border-4 border-slate-50 inline-block p-5 rounded-[2.5rem] shadow-xl relative group">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=ESPACO_DIGITAL_PIX_PAYMENT_${selectedInvoice.code}`} 
                                alt="PIX QR Code" 
                                className="w-52 h-52 mx-auto rounded-lg"
                              />
                              <div className="absolute inset-0 bg-indigo-600/5 rounded-[2rem] animate-pulse pointer-events-none"></div>
                          </div>
                      </div>

                      <div className="space-y-4">
                        <button 
                            onClick={copyPixCode}
                            className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl ${copied ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-[#C7E92B] text-slate-900 shadow-lime-100 hover:bg-[#B8D828]'}`}
                        >
                            {copied ? (
                                <>Código Copiado! <Check size={20} strokeWidth={3} /></>
                            ) : (
                                <>Copiar Código PIX <Copy size={20} strokeWidth={3} /></>
                            )}
                        </button>
                      </div>

                      <div className="bg-indigo-50/50 p-6 rounded-[2rem] text-left border border-indigo-100/50">
                          <div className="flex items-center gap-2 mb-3">
                              <Info size={16} className="text-indigo-600" />
                              <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Importante</span>
                          </div>
                          <ul className="text-[11px] text-indigo-900/60 space-y-2 font-medium">
                              <li className="flex gap-2">
                                  <div className="w-1 h-1 bg-indigo-400 rounded-full mt-1.5 shrink-0"></div>
                                  <span>O sistema identifica o pagamento em até 5 minutos.</span>
                              </li>
                              <li className="flex gap-2">
                                  <div className="w-1 h-1 bg-indigo-400 rounded-full mt-1.5 shrink-0"></div>
                                  <span>Mantenha seu comprovante salvo para segurança.</span>
                              </li>
                          </ul>
                      </div>
                  </div>

                  <div className="p-8 bg-slate-50/50 flex justify-center border-t border-slate-50">
                      <button 
                        onClick={() => setIsPixModalOpen(false)}
                        className="px-10 py-3 bg-white border border-slate-200 text-slate-400 font-black text-[10px] uppercase rounded-full hover:text-slate-600 tracking-[0.2em] transition-all hover:bg-white shadow-sm"
                      >
                          Fechar Checkout
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SubscriberPortal;
