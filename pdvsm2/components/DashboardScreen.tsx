
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Zap, 
  Wallet, 
  ArrowUpRight, 
  Package,
  Filter,
  List,
  Banknote,
  QrCode,
  BarChart3,
  HelpCircle,
  Calendar
} from 'lucide-react';
import UserMenu from './UserMenu';
import { Sale, Product, Customer, UserProfile } from '../types';

interface DashboardScreenProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  toggleSidebar: () => void;
  userProfile: UserProfile;
}

// --- Helpers ---

const formatCurrency = (val: number) => {
  if (!isFinite(val) || isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatCompactNumber = (num: number) => {
  if (!isFinite(num) || isNaN(num)) return '0';
  return Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(num);
};

// --- Animated Number ---
const AnimatedNumber = ({ value, formatter }: { value: number, formatter?: (v: number) => string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const duration = 1000;

  useEffect(() => {
    let animationFrameId: number;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);
      const easeOut = 1 - Math.pow(1 - percentage, 4);
      const currentVal = value * easeOut;
      setDisplayValue(currentVal);
      if (progress < duration) animationFrameId = requestAnimationFrame(animate);
      else setDisplayValue(value);
    };
    startTimeRef.current = null;
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <>{formatter ? formatter(displayValue) : Math.floor(displayValue)}</>;
};

const getBrazilDate = (dateString?: string | Date) => {
    try {
        const date = dateString ? new Date(dateString) : new Date();
        if (isNaN(date.getTime())) return new Date(); 
        const brazilString = date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        return new Date(brazilString);
    } catch (e) { return new Date(); }
};

const getSmoothPath = (points: {x: number, y: number}[]) => {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M0,${points[0].y} L${points[0].x},${points[0].y}`;
  const p = (i: number, rel: number) => {
    const idx = Math.min(Math.max(i + rel, 0), points.length - 1);
    return points[idx];
  };
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = p(i, -1);
    const p1 = p(i, 0);
    const p2 = p(i, 1);
    const p3 = p(i, 2);
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    if (isNaN(cp1x) || isNaN(cp1y) || isNaN(cp2x) || isNaN(cp2y) || isNaN(p2.x) || isNaN(p2.y)) continue; 
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
};

// --- KPICard ---
const KPICard = ({ title, value, subValue, growth, icon: Icon, colorClass, delay, formatter }: any) => (
  <div className={`bg-white dark:bg-[#23243a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`} style={{ animationDelay: `${delay}ms` }}>
    <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-xl ${colorClass.includes('emerald') ? 'bg-[#c1ff72]/10' : 'bg-blue-500/10'}`}>
            <Icon className={colorClass.includes('emerald') ? 'text-[#c1ff72]' : colorClass.replace('bg-', 'text-')} size={24} />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full ${growth >= 0 ? 'bg-green-50 dark:bg-green-500/10 text-green-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
            {growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isFinite(growth) ? Math.abs(growth).toFixed(0) : 0}%
        </div>
    </div>
    <div>
        <h3 className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</h3>
        <div className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
            <AnimatedNumber value={value} formatter={formatter} />
        </div>
        {subValue && <div className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-widest">{subValue}</div>}
    </div>
  </div>
);

const DashboardScreen: React.FC<DashboardScreenProps> = ({ sales = [], products = [], toggleSidebar, userProfile }) => {
  const [timeRange, setTimeRange] = useState<any>('month');
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isOperator = userProfile?.role === 'operator';

  useEffect(() => { if (isOperator) setTimeRange('today'); }, [isOperator]);

  useEffect(() => {
    const handleResize = () => {
      if (chartContainerRef.current) setChartDimensions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
    };
    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => { clearTimeout(timer); window.removeEventListener('resize', handleResize); };
  }, []);

  const { currentRange, previousRange, grouping } = useMemo(() => {
    const now = getBrazilDate(); let start = getBrazilDate(); let end = getBrazilDate(); let prevStart = getBrazilDate(); let prevEnd = getBrazilDate(); let labelFormat: 'hour' | 'day' | 'month_days' | 'year' = 'day';
    try {
        switch (timeRange) {
        case 'today':
            start.setHours(0,0,0,0); prevStart.setDate(start.getDate() - 1); prevStart.setHours(0,0,0,0); prevEnd.setDate(start.getDate() - 1); prevEnd.setHours(23,59,59,999); labelFormat = 'hour'; end = now; break;
        case '7days':
            start.setDate(now.getDate() - 7); start.setHours(0,0,0,0); prevStart.setDate(now.getDate() - 14); prevStart.setHours(0,0,0,0); prevEnd.setDate(now.getDate() - 8); prevEnd.setHours(23,59,59,999); end = now; break;
        case '30days':
            start.setDate(now.getDate() - 30); start.setHours(0,0,0,0); prevStart.setDate(now.getDate() - 60); prevStart.setHours(0,0,0,0); prevEnd.setDate(now.getDate() - 31); prevEnd.setHours(23,59,59,999); end = now; break;
        case 'month':
            start.setDate(1); start.setHours(0,0,0,0); end = new Date(start); end.setMonth(end.getMonth() + 1, 0); end.setHours(23, 59, 59, 999); prevStart.setMonth(start.getMonth() - 1, 1); prevStart.setHours(0,0,0,0); prevEnd = new Date(prevStart); prevEnd.setMonth(prevEnd.getMonth() + 1, 0); prevEnd.setHours(23,59,59,999); labelFormat = 'month_days'; break;
        case 'year':
            start.setMonth(0, 1); start.setHours(0,0,0,0); end = new Date(start); end.setFullYear(start.getFullYear(), 11, 31); end.setHours(23,59,59,999); prevStart.setFullYear(start.getFullYear() - 1, 0, 1); prevStart.setHours(0,0,0,0); prevEnd.setFullYear(start.getFullYear() - 1, 11, 31); prevEnd.setHours(23,59,59,999); labelFormat = 'year'; break;
        }
    } catch(e) { console.error(e); }
    return { currentRange: { start, end }, previousRange: { start: prevStart, end: prevEnd }, grouping: labelFormat };
  }, [timeRange]);

  const filterSalesByRange = (saleList: Sale[], start: Date, end: Date) => {
      if (!Array.isArray(saleList)) return [];
      return saleList.filter(s => {
          if (s.status === 'cancelled') return false;
          try {
              const sDate = getBrazilDate(s.date);
              return sDate >= start && sDate <= end;
          } catch { return false; }
      });
  };

  const currentSales = useMemo(() => filterSalesByRange(sales, currentRange.start, currentRange.end), [sales, currentRange]);
  const previousSales = useMemo(() => filterSalesByRange(sales, previousRange.start, previousRange.end), [sales, previousRange]);

  const calculateMetrics = (data: Sale[]) => {
    if (!data) return { revenue: 0, count: 0, items: 0, ticket: 0 };
    const revenue = data.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
    const count = data.length;
    const items = data.reduce((acc, s) => acc + (s.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0), 0);
    const ticket = count > 0 ? revenue / count : 0;
    return { revenue, count, items, ticket };
  };

  const currentMetrics = calculateMetrics(currentSales);
  const prevMetrics = calculateMetrics(previousSales);

  const getGrowth = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const currentPaymentStats = useMemo(() => {
      const stats = { money: 0, pix: 0, debit: 0, credit: 0, total: 0 };
      currentSales.forEach(s => {
          const payments = s.payments && s.payments.length > 0 ? s.payments : [{ method: s.paymentMethod, amount: s.total }];
          payments.forEach(p => {
              const amt = Number(p.amount) || 0;
              stats.total += amt;
              if (p.method === 'money') stats.money += amt;
              else if (p.method === 'pix') stats.pix += amt;
              else if (p.method === 'debit') stats.debit += amt;
              else stats.credit += amt;
          });
      });
      return stats;
  }, [currentSales]);

  const paymentList = [
      { id: 'money', label: 'Dinheiro', amount: currentPaymentStats.money, color: 'bg-emerald-500', icon: Banknote },
      { id: 'pix', label: 'PIX', amount: currentPaymentStats.pix, color: 'bg-[#c1ff72]', icon: QrCode },
      { id: 'debit', label: 'Débito', amount: currentPaymentStats.debit, color: 'bg-blue-500', icon: CreditCard },
      { id: 'credit', label: 'Crédito', amount: currentPaymentStats.credit, color: 'bg-orange-500', icon: CreditCard },
  ].sort((a, b) => b.amount - a.amount);

  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string, qty: number, revenue: number, image: string }>();
    currentSales.forEach(s => {
      s.items?.forEach(item => {
        const existing = productMap.get(item.id) || { name: item.name, qty: 0, revenue: 0, image: item.image };
        productMap.set(item.id, { ...existing, qty: existing.qty + (Number(item.quantity) || 0), revenue: existing.revenue + (item.price * item.quantity) });
      });
    });
    return Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [currentSales]);

  const chartData = useMemo(() => {
    const generatePoints = (data: Sale[], rangeStart: Date, rangeEnd: Date) => {
        const points: number[] = []; const labels: string[] = []; const bucketMap = new Map<number, number>();
        if (grouping === 'year') {
            data.forEach(s => { const d = getBrazilDate(s.date); const key = d.getMonth(); bucketMap.set(key, (bucketMap.get(key) || 0) + s.total); });
            for (let i = 0; i <= 11; i++) { points.push(bucketMap.get(i) || 0); const d = new Date(); d.setMonth(i); labels.push(d.toLocaleDateString('pt-BR', { month: 'short' })); }
        } else if (grouping === 'month_days') {
            data.forEach(s => { const d = getBrazilDate(s.date); const day = d.getDate(); bucketMap.set(day, (bucketMap.get(day) || 0) + s.total); });
            const daysInMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) { points.push(bucketMap.get(i) || 0); labels.push(i.toString()); }
        } else if (grouping === 'hour') {
            data.forEach(s => { bucketMap.set(getBrazilDate(s.date).getHours(), (bucketMap.get(getBrazilDate(s.date).getHours()) || 0) + s.total); });
            for(let i=0; i<24; i++) { points.push(bucketMap.get(i) || 0); labels.push(`${i}h`); }
        } else {
            data.forEach(s => { const diff = Math.floor(Math.abs(getBrazilDate(s.date).getTime() - rangeStart.getTime()) / 86400000); bucketMap.set(diff, (bucketMap.get(diff) || 0) + s.total); });
            const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / 86400000);
            for(let i=0; i<=totalDays; i++) { points.push(bucketMap.get(i) || 0); const d = new Date(rangeStart); d.setDate(d.getDate() + i); labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })); }
        }
        return { points, labels };
    };
    const current = generatePoints(currentSales, currentRange.start, currentRange.end);
    const previous = generatePoints(previousSales, previousRange.start, previousRange.end);
    return { currentValues: current.points, previousValues: previous.points, labels: current.labels };
  }, [currentSales, previousSales, grouping, currentRange, previousRange]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#eef2f6] dark:bg-[#1a1b2e] transition-colors">
      <div className="bg-transparent flex-shrink-0 relative z-20">
        <header className="px-10 py-8 flex justify-between items-start border-b border-gray-200 dark:border-white/5">
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"><List size={24} /></button>
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight uppercase text-gray-800 dark:text-white leading-none">Dashboard</h2>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em] font-bold mt-2">Visão Estratégica Mensal</p>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-white/5 px-5 py-2 rounded-full text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest">
                    <HelpCircle size={14} /><span>Suporte</span>
                </div>
                <div className="text-gray-700 dark:text-white"><UserMenu /></div>
            </div>
        </header>
      </div>
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
        <div className="w-full flex flex-col gap-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3 bg-white dark:bg-[#23243a] p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
                    {isOperator ? (
                        <button className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all bg-[#c1ff72] text-[#1a1b2e] shadow-lg shadow-[#c1ff72]/20 cursor-default">Hoje</button>
                    ) : (
                        [{ k: 'today', l: 'Hoje' }, { k: '7days', l: '7 Dias' }, { k: '30days', l: '30 Dias' }, { k: 'month', l: 'Este Mês' }, { k: 'year', l: 'Este Ano' }].map((opt) => (
                            <button 
                                key={opt.k} 
                                onClick={() => setTimeRange(opt.k)} 
                                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${timeRange === opt.k ? 'bg-[#c1ff72] text-[#1a1b2e] shadow-lg shadow-[#c1ff72]/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'}`}
                            >
                                {opt.l}
                            </button>
                        ))
                    )}
                </div>
                <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] bg-white dark:bg-[#23243a] px-6 py-3 rounded-full border border-gray-100 dark:border-white/5 shadow-sm">
                    <Calendar size={14} className="text-[#c1ff72]" /><span>Período Selecionado</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <KPICard title="Receita Total" value={currentMetrics.revenue} formatter={formatCurrency} growth={getGrowth(currentMetrics.revenue, prevMetrics.revenue)} icon={DollarSign} colorClass="bg-emerald-500" delay={0} subValue={`Ant: ${formatCompactNumber(prevMetrics.revenue)}`} />
                <KPICard title="Pessoas Atendidas" value={currentMetrics.count} formatter={(v: number) => Math.floor(v).toString()} growth={getGrowth(currentMetrics.count, prevMetrics.count)} icon={ShoppingBag} colorClass="bg-blue-500" delay={100} subValue={`${currentMetrics.count} Transações`} />
                <KPICard title="Itens Vendidos" value={currentMetrics.items} formatter={(v: number) => Math.floor(v).toString()} growth={getGrowth(currentMetrics.items, prevMetrics.items)} icon={Package} colorClass="bg-[#c1ff72]" delay={200} subValue="Itens Individuais" />
                <KPICard title="Ticket Médio" value={currentMetrics.ticket} formatter={formatCurrency} growth={getGrowth(currentMetrics.ticket, prevMetrics.ticket)} icon={Wallet} colorClass="bg-orange-500" delay={300} subValue="Médio por Venda" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-[#23243a] rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-sm p-8 flex flex-col min-h-[480px]">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-white text-xl tracking-tight uppercase">Fluxo de Faturamento</h3>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">Comparativo de performance</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                            <Filter size={18} className="text-gray-400" />
                        </div>
                    </div>
                    <div className="flex-1 w-full relative" ref={chartContainerRef} onMouseLeave={() => setHoveredChartIndex(null)}>
                        {chartDimensions.width > 0 && chartDimensions.height > 0 && chartData.currentValues.length > 0 ? (
                            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#c1ff72" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#c1ff72" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {(() => { 
                                    const { width, height } = chartDimensions; 
                                    const maxVal = Math.max(...chartData.currentValues, ...chartData.previousValues, 10) * 1.1; 
                                    const xStep = chartData.currentValues.length > 1 ? width / (chartData.currentValues.length - 1) : 0; 
                                    const pointsCurrent = chartData.currentValues.map((val, i) => ({ x: i * xStep, y: height - (val / maxVal) * height })); 
                                    const pointsPrevious = chartData.previousValues.map((val, i) => ({ x: i * xStep, y: height - (val / maxVal) * height })); 
                                    const pathCurrent = getSmoothPath(pointsCurrent); 
                                    const pathPrevious = getSmoothPath(pointsPrevious); 
                                    const fillCurrent = pathCurrent ? `${pathCurrent} L ${width},${height} L 0,${height} Z` : ''; 
                                    return (
                                        <>
                                            <g>{[0, 0.25, 0.5, 0.75, 1].map(t => <line key={t} x1="0" y1={height * t} x2="100%" y2={height * t} stroke="currentColor" className="text-gray-50 dark:text-white/5" />)}</g>
                                            <path d={pathPrevious} fill="none" stroke="currentColor" className="text-gray-200 dark:text-white/10" strokeWidth="2" strokeDasharray="6 4" />
                                            <path d={fillCurrent} fill="url(#chartGradient)" />
                                            <path d={pathCurrent} fill="none" stroke="#c1ff72" strokeWidth="3" strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(193,255,114,0.3)]" />
                                            {pointsCurrent.map((p, i) => (
                                                <g key={i} onMouseEnter={() => setHoveredChartIndex(i)}>
                                                    <circle cx={p.x} cy={p.y} r={5} fill="#c1ff72" stroke="#1a1b2e" strokeWidth={2} className={`transition-opacity duration-200 ${hoveredChartIndex === i ? 'opacity-100' : 'opacity-0'}`}/>
                                                    <rect x={p.x - 12} y={0} width={24} height={height} fill="transparent" />
                                                </g>
                                            ))}
                                            {hoveredChartIndex !== null && chartData.labels[hoveredChartIndex] && (
                                                <foreignObject x={Math.min(pointsCurrent[hoveredChartIndex]?.x - 60 || 0, width - 140)} y={0} width="160" height="100" className="overflow-visible pointer-events-none">
                                                    <div className="bg-gray-800/95 dark:bg-[#1a1b2e]/95 backdrop-blur text-white text-[10px] rounded-2xl p-4 shadow-2xl transform translate-y-2 border border-white/10">
                                                        <div className="font-bold mb-2 opacity-60 border-b border-white/10 pb-1 uppercase tracking-widest">{chartData.labels[hoveredChartIndex]}</div>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="font-medium">Atual:</span>
                                                            <span className="font-bold text-[#c1ff72]">{formatCurrency(chartData.currentValues[hoveredChartIndex])}</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4 mt-1">
                                                            <span className="opacity-50">Anterior:</span>
                                                            <span className="opacity-50">{formatCurrency(chartData.previousValues[hoveredChartIndex])}</span>
                                                        </div>
                                                    </div>
                                                </foreignObject>
                                            )}
                                        </>
                                    ); 
                                })()}
                            </svg>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 uppercase font-bold text-xs tracking-widest">Sem dados no período</div>
                        )}
                    </div>
                    <div className="flex justify-center items-center gap-10 mt-10 pt-6 border-t border-gray-50 dark:border-white/5">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#c1ff72]"></div> Atual
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            <div className="w-4 h-0 border-t-2 border-dashed border-gray-200 dark:border-white/10"></div> Anterior
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#23243a] rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-sm p-8 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="font-semibold text-gray-800 dark:text-white text-xl tracking-tight uppercase flex items-center gap-3">
                            <BarChart3 size={20} className="text-[#c1ff72]" /> Meios de Pagto
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                        {paymentList.map(item => { 
                            const percent = currentPaymentStats.total > 0 ? (item.amount / currentPaymentStats.total) * 100 : 0; 
                            return (
                                <div key={item.id}>
                                    <div className="flex justify-between items-center mb-2.5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${item.id === 'pix' ? 'bg-[#c1ff72]/10 text-[#c1ff72]' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                                                <item.icon size={16} />
                                            </div>
                                            <span className="text-[10px] font-bold uppercase text-gray-700 dark:text-gray-300 tracking-wider">{item.label}</span>
                                        </div>
                                        <span className="text-sm font-bold text-gray-800 dark:text-white">{formatCurrency(item.amount)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${item.id === 'pix' ? 'bg-[#c1ff72]' : item.color.replace('text-', 'bg-')}`} 
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-right mt-1.5"><span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{percent.toFixed(1)}%</span></div>
                                </div>
                            ); 
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                <div className="lg:col-span-2 bg-white dark:bg-[#23243a] rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-sm p-8 flex flex-col transition-colors">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="font-semibold text-gray-800 dark:text-white text-xl tracking-tight uppercase">Top 5 Produtos</h3>
                        <button className="text-[#c1ff72] text-[10px] font-bold uppercase tracking-widest hover:underline">Ver catálogo</button>
                    </div>
                    <div className="space-y-6 overflow-y-auto max-h-[350px] custom-scrollbar pr-2">
                        {topProducts.length > 0 ? topProducts.map((prod, idx) => (
                            <div key={idx} className="flex items-center gap-5 group hover:bg-gray-50 dark:hover:bg-white/5 p-3 rounded-2xl transition-all">
                                <div className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-[#1a1b2e] border border-gray-100 dark:border-white/5 flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                                    <img src={prod.image} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-800 dark:text-white uppercase text-sm truncate tracking-tight">{prod.name}</div>
                                    <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1.5">{prod.qty} unidades vendidas</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-gray-900 dark:text-[#c1ff72] text-lg">{formatCurrency(prod.revenue)}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-20 text-gray-400 dark:text-gray-600">
                                <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="text-sm font-bold uppercase tracking-widest">Nenhuma venda</p>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="w-full">
                    <div className="bg-gradient-to-br from-[#c1ff72] to-[#8ec332] rounded-[2.5rem] shadow-xl shadow-[#c1ff72]/10 p-10 text-[#1a1b2e] relative overflow-hidden flex flex-col justify-between h-full min-h-[380px] group">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full -mr-20 -mt-20 pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                        
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 bg-[#1a1b2e]/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-8 border border-[#1a1b2e]/5">
                                <Zap size={14} fill="currentColor" /> Dica PRO
                            </div>
                            <h3 className="text-4xl font-semibold tracking-tight leading-none mb-6">Analise seus dados</h3>
                            <p className="text-[#1a1b2e]/70 text-sm font-medium leading-relaxed max-w-xs">
                                Use os filtros para entender quais dias e horários sua loja fatura mais e otimize seu estoque.
                            </p>
                        </div>
                        
                        <button className="relative z-10 bg-[#1a1b2e] text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:brightness-110 transition-all w-fit mt-8 flex items-center gap-3 text-xs uppercase tracking-widest active:scale-95">
                            Gestão Estratégica <ArrowUpRight size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
