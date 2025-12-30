
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

// --- Types & Helpers ---

type TimeRange = 'today' | '7days' | '30days' | 'month' | 'year';

const formatCurrency = (val: number) => {
  if (!isFinite(val) || isNaN(val)) return 'R$ 0,00';
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatCompactNumber = (num: number) => {
  if (!isFinite(num) || isNaN(num)) return '0';
  return Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(num);
};

// --- Animated Number Component ---
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

// --- Timezone Helper ---
const getBrazilDate = (dateString?: string | Date) => {
    try {
        const date = dateString ? new Date(dateString) : new Date();
        if (isNaN(date.getTime())) return new Date(); 
        const brazilString = date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        return new Date(brazilString);
    } catch (e) { return new Date(); }
};

// --- Chart Helper: Smooth Line Generator ---
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

// --- KPICard Component ---
const KPICard = ({ title, value, subValue, growth, icon: Icon, colorClass, delay, formatter }: any) => (
  <div className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4`} style={{ animationDelay: `${delay}ms` }}>
    <div className="flex justify-between items-start mb-4"><div className={`p-3 rounded-xl ${colorClass} bg-opacity-10`}><Icon className={colorClass.replace('bg-', 'text-')} size={24} /></div><div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{isFinite(growth) ? Math.abs(growth).toFixed(0) : 0}%</div></div>
    <div><h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3><div className="text-3xl font-bold text-gray-800 tracking-tight"><AnimatedNumber value={value} formatter={formatter} /></div>{subValue && <div className="text-xs text-gray-400 mt-2 font-medium">{subValue}</div>}</div>
  </div>
);

const DashboardScreen: React.FC<DashboardScreenProps> = ({ sales = [], products = [], toggleSidebar, userProfile }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
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
            start.setMonth(0, 1); start.setHours(0,0,0,0); end.setFullYear(start.getFullYear(), 11, 31); end.setHours(23,59,59,999); prevStart.setFullYear(start.getFullYear() - 1, 0, 1); prevStart.setHours(0,0,0,0); prevEnd.setFullYear(start.getFullYear() - 1, 11, 31); prevEnd.setHours(23,59,59,999); labelFormat = 'year'; break;
        }
    } catch(e) { console.error("Error generating dates", e); }
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
    
    // REVENUE CALCULATION: Summing individual payments to be consistent with granular reporting
    const revenue = data.reduce((acc, s) => {
        if (s.payments && s.payments.length > 0) {
            return acc + s.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        }
        return acc + (Number(s.total) || 0);
    }, 0);

    const count = data.length;
    const items = data.reduce((acc, s) => {
        return acc + (s.items || []).reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    }, 0);
    const ticket = count > 0 ? revenue / count : 0;
    return { revenue, count, items, ticket };
  };

  const currentMetrics = calculateMetrics(currentSales);
  const prevMetrics = calculateMetrics(previousSales);

  const getGrowth = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const calculatePaymentStats = (data: Sale[]) => {
      const stats = { money: 0, pix: 0, debit: 0, credit: 0, total: 0 };
      if (!data) return stats;
      
      data.forEach(s => {
          const payments = s.payments && s.payments.length > 0 
              ? s.payments 
              : [{ method: s.paymentMethod, amount: s.total }];
          
          payments.forEach(p => {
              const amt = Number(p.amount) || 0;
              stats.total += amt;
              if (p.method === 'money') stats.money += amt;
              else if (p.method === 'pix') stats.pix += amt;
              else if (p.method === 'debit') stats.debit += amt;
              else if (p.method === 'credit' || p.method === 'credit_tab') stats.credit += amt;
              else stats.credit += amt;
          });
      });
      return stats;
  };

  const currentPaymentStats = useMemo(() => calculatePaymentStats(currentSales), [currentSales]);

  const paymentList = [
      { id: 'money', label: 'Dinheiro', amount: currentPaymentStats.money, color: 'bg-emerald-500', bg: 'bg-emerald-100', icon: Banknote },
      { id: 'pix', label: 'PIX', amount: currentPaymentStats.pix, color: 'bg-purple-500', bg: 'bg-purple-100', icon: QrCode },
      { id: 'debit', label: 'Débito', amount: currentPaymentStats.debit, color: 'bg-blue-500', bg: 'bg-blue-100', icon: CreditCard },
      { id: 'credit', label: 'Crédito', amount: currentPaymentStats.credit, color: 'bg-orange-500', bg: 'bg-orange-100', icon: CreditCard },
  ].sort((a, b) => b.amount - a.amount);

  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string, qty: number, revenue: number, image: string }>();
    if (!currentSales) return [];
    currentSales.forEach(s => {
      if(s.items) {
          s.items.forEach(item => {
            const existing = productMap.get(item.id) || { name: item.name, qty: 0, revenue: 0, image: item.image };
            productMap.set(item.id, { ...existing, qty: existing.qty + (Number(item.quantity) || 0), revenue: existing.revenue + (item.price * item.quantity) });
          });
      }
    });
    return Array.from(productMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [currentSales]);

  const chartData = useMemo(() => {
    const generatePoints = (data: Sale[], rangeStart: Date, rangeEnd: Date) => {
        const points: number[] = []; const labels: string[] = []; const bucketMap = new Map<number, number>(); let maxIndex = 0;
        if (grouping === 'year') {
            data.forEach(s => { const d = getBrazilDate(s.date); const key = d.getMonth(); bucketMap.set(key, (bucketMap.get(key) || 0) + s.total); });
            maxIndex = 11; for (let i = 0; i <= maxIndex; i++) { points.push(bucketMap.get(i) || 0); const dateForLabel = new Date(); dateForLabel.setMonth(i); labels.push(dateForLabel.toLocaleDateString('pt-BR', { month: 'short' })); }
        } else if (grouping === 'month_days') {
            data.forEach(s => { const d = getBrazilDate(s.date); const day = d.getDate(); bucketMap.set(day, (bucketMap.get(day) || 0) + s.total); });
            const year = rangeStart.getFullYear(); const month = rangeStart.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) { points.push(bucketMap.get(i) || 0); labels.push(i.toString()); }
        } else if (grouping === 'hour') {
            data.forEach(s => { const d = getBrazilDate(s.date); bucketMap.set(d.getHours(), (bucketMap.get(d.getHours()) || 0) + s.total); });
            for(let i=0; i<24; i++) { points.push(bucketMap.get(i) || 0); labels.push(`${i}h`); }
        } else {
            data.forEach(s => { const d = getBrazilDate(s.date); const diffTime = Math.abs(d.getTime() - rangeStart.getTime()); const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); bucketMap.set(diffDays, (bucketMap.get(diffDays) || 0) + s.total); });
            const totalDays = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
            const safeTotalDays = Math.min(Math.max(1, totalDays), 60); for(let i=0; i<=safeTotalDays; i++) { points.push(bucketMap.get(i) || 0); const d = new Date(rangeStart); d.setDate(d.getDate() + i); labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })); }
        }
        return { points, labels };
    };
    const current = generatePoints(currentSales, currentRange.start, currentRange.end);
    const previous = generatePoints(previousSales, previousRange.start, previousRange.end);
    const maxLen = Math.max(current.points.length, previous.points.length, 1);
    const padArray = (arr: number[], len: number) => { const res = [...arr]; while(res.length < len) res.push(0); return res; };
    return { currentValues: padArray(current.points, maxLen), previousValues: padArray(previous.points, maxLen), labels: current.labels.length >= previous.labels.length ? current.labels : previous.labels };
  }, [currentSales, previousSales, grouping, currentRange, previousRange]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#eef2f6] relative font-sans">
      <div className="bg-transparent flex-shrink-0 relative z-20">
        <header className="px-6 py-4 flex justify-between items-start border-b border-gray-200">
            <div className="flex items-center gap-3"><button onClick={toggleSidebar} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"><List size={24} /></button><div><h2 className="text-2xl font-bold tracking-tight uppercase text-gray-800">Dashboard</h2><p className="text-xs text-gray-400 uppercase tracking-wider font-medium mt-1">Monitoramento de Desempenho</p></div></div>
            <div className="flex items-center gap-4"><div className="hidden md:flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-xs font-bold text-gray-500"><HelpCircle size={14} /><span>Suporte</span></div><div className="text-gray-700"><UserMenu /></div></div>
        </header>
      </div>
      <div className="flex-1 overflow-y-auto p-6 md:p-8"><div className="w-full flex flex-col gap-6 max-w-7xl mx-auto"><div className="flex flex-col md:flex-row gap-4 items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300"><div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto overflow-x-auto no-scrollbar">{isOperator ? (<button className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap bg-[#40B069] text-white shadow-md cursor-default">Hoje</button>) : ([{ k: 'today', l: 'Hoje' }, { k: '7days', l: '7 Dias' }, { k: '30days', l: '30 Dias' }, { k: 'month', l: 'Este Mês' }, { k: 'year', l: 'Este Ano' }].map((opt) => (<button key={opt.k} onClick={() => setTimeRange(opt.k as TimeRange)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${timeRange === opt.k ? 'bg-[#40B069] text-white shadow-lg shadow-green-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{opt.l}</button>)))}</div><div className="hidden md:flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm"><Calendar size={14} className="text-[#40B069]" /><span>Período Ativo</span></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Receita Total" value={currentMetrics.revenue} formatter={formatCurrency} growth={getGrowth(currentMetrics.revenue, prevMetrics.revenue)} icon={DollarSign} colorClass="bg-emerald-500 text-emerald-500" delay={0} subValue={`Anterior: ${formatCompactNumber(prevMetrics.revenue)}`} />
                <KPICard title="Pessoas Atendidas" value={currentMetrics.count} formatter={(v: number) => Math.floor(v).toString()} growth={getGrowth(currentMetrics.count, prevMetrics.count)} icon={ShoppingBag} colorClass="bg-blue-500 text-blue-500" delay={100} subValue={`${currentMetrics.count} transações`} />
                <KPICard title="Itens Vendidos" value={currentMetrics.items} formatter={(v: number) => Math.floor(v).toString()} growth={getGrowth(currentMetrics.items, prevMetrics.items)} icon={Package} colorClass="bg-purple-500 text-purple-500" delay={200} subValue="Produtos individuais" />
                <KPICard title="Ticket Médio" value={currentMetrics.ticket} formatter={formatCurrency} growth={getGrowth(currentMetrics.ticket, prevMetrics.ticket)} icon={Wallet} colorClass="bg-orange-500 text-orange-500" delay={300} subValue="Por venda" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col min-h-[400px]"><div className="flex justify-between items-center mb-6"><div><h3 className="font-bold text-gray-800 text-lg">{timeRange === 'month' ? 'Fluxo de Caixa Mensal' : 'Faturamento'}</h3><p className="text-sm text-gray-500">{timeRange === 'month' ? 'Visualização diária do mês atual' : timeRange === 'year' ? 'Comparativo Mensal (Ano Atual vs Anterior)' : 'Comparativo com período anterior'}</p></div><div className="p-2 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-100"><Filter size={18} className="text-gray-400" /></div></div><div className="flex-1 w-full relative" ref={chartContainerRef} onMouseLeave={() => setHoveredChartIndex(null)}>{chartDimensions.width > 0 && chartDimensions.height > 0 && chartData.currentValues.length > 0 ? (<svg className="w-full h-full overflow-visible" preserveAspectRatio="none"><defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></linearGradient></defs>{(() => { const { width, height } = chartDimensions; const allValues = [...chartData.currentValues, ...chartData.previousValues]; const maxVal = Math.max(...allValues, 10) * 1.1; const count = chartData.currentValues.length; const xStep = count > 1 ? width / (count - 1) : 0; const pointsCurrent = chartData.currentValues.map((val, i) => ({ x: i * xStep, y: height - (val / maxVal) * height })); const pointsPrevious = chartData.previousValues.map((val, i) => ({ x: i * xStep, y: height - (val / maxVal) * height })); const pathCurrent = getSmoothPath(pointsCurrent); const pathPrevious = getSmoothPath(pointsPrevious); const fillCurrent = pathCurrent ? `${pathCurrent} L ${width},${height} L 0,${height} Z` : ''; return (<><g>{[0, 0.25, 0.5, 0.75, 1].map(t => <line key={t} x1="0" y1={height * t} x2="100%" y2={height * t} stroke="#f3f4f6" strokeDasharray="4" />)}</g><path d={pathPrevious} fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" /><path d={fillCurrent} fill="url(#chartGradient)" /><path d={pathCurrent} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />{pointsCurrent.map((p, i) => (<g key={i} onMouseEnter={() => setHoveredChartIndex(i)}><circle cx={p.x} cy={p.y} r={6} fill="#fff" stroke="#3b82f6" strokeWidth={2} className={`transition-opacity duration-200 ${hoveredChartIndex === i ? 'opacity-100' : 'opacity-0'}`}/><rect x={p.x - 10} y={0} width={20} height={height} fill="transparent" /></g>))}{hoveredChartIndex !== null && chartData.labels[hoveredChartIndex] && (<foreignObject x={Math.min(pointsCurrent[hoveredChartIndex]?.x - 60 || 0, width - 130)} y={0} width="160" height="100" className="overflow-visible pointer-events-none"><div className="bg-gray-800/90 backdrop-blur text-white text-xs rounded-lg p-3 shadow-xl transform translate-y-2 border border-white/10"><div className="font-bold mb-1 opacity-70 border-b border-white/20 pb-1">{chartData.labels[hoveredChartIndex]}</div><div className="flex justify-between gap-4 mt-1"><span>Atual:</span><span className="font-bold">{formatCurrency(chartData.currentValues[hoveredChartIndex])}</span></div><div className="flex justify-between gap-4"><span>Anterior:</span><span className="text-gray-300">{formatCurrency(chartData.previousValues[hoveredChartIndex])}</span></div></div></foreignObject>)}</>); })()}</svg>) : (<div className="w-full h-full flex items-center justify-center text-gray-400">Sem dados para o período</div>)}</div><div className="flex justify-center items-center gap-6 mt-4 pt-2 border-t border-gray-50"><div className="flex items-center gap-2 text-xs font-bold text-gray-600"><div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div> Período Atual</div><div className="flex items-center gap-2 text-xs font-bold text-gray-500"><div className="w-4 h-0 border-t-2 border-dashed border-gray-400"></div> Período Anterior</div></div><div className="flex justify-between mt-2 px-2 text-[10px] text-gray-400 font-medium uppercase tracking-wide overflow-hidden">{chartData.labels.filter((_, i) => i % Math.ceil(chartData.labels.length / 6) === 0).map((l, i) => <span key={i}>{l}</span>)}</div></div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col h-full"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-gray-800 text-lg flex items-center gap-2"><BarChart3 size={18} className="text-gray-400" /> Vendas por Pagamento</h3></div><div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5">{paymentList.map(item => { const percent = currentPaymentStats.total > 0 ? (item.amount / currentPaymentStats.total) * 100 : 0; return (<div key={item.id}><div className="flex justify-between items-center mb-1"><div className="flex items-center gap-3"><div className={`p-1.5 rounded-lg ${item.bg}`}><item.icon size={16} className={item.color.replace('bg-', 'text-')} /></div><span className="text-sm font-bold text-gray-700">{item.label}</span></div><span className="text-sm font-bold text-gray-800">{formatCurrency(item.amount)}</span></div><div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"><div className={`h-full rounded-full ${item.color} transition-all duration-500 ease-out`} style={{ width: `${percent}%` }}></div></div><div className="text-right mt-1"><span className="text-[10px] text-gray-400 font-bold">{percent.toFixed(1)}%</span></div></div>); })}</div></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-gray-800 text-lg">Produtos Mais Vendidos</h3><button className="text-[#40B069] text-sm font-bold hover:underline">Ver todos</button></div><div className="space-y-4 overflow-y-auto max-h-[300px] custom-scrollbar">{topProducts.length > 0 ? topProducts.map((prod, idx) => (<div key={idx} className="flex items-center gap-4 group hover:bg-gray-50 p-2 rounded-xl transition-colors"><div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden"><img src={prod.image} alt="" className="w-full h-full object-contain mix-blend-multiply" /></div><div className="flex-1 min-w-0"><div className="font-bold text-gray-800 truncate">{prod.name}</div><div className="text-xs text-gray-500">{prod.qty} unidades</div></div><div className="text-right"><div className="font-bold text-gray-800">{formatCurrency(prod.revenue)}</div></div></div>)) : (<div className="text-center py-10 text-gray-400"><ShoppingBag size={48} className="mx-auto mb-2 opacity-20" />Nenhuma venda registrada.</div>)}</div></div><div className="w-full"><div className="bg-gradient-to-br from-[#40B069] to-teal-600 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden flex flex-col justify-between h-full min-h-[300px]"><div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div><div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-5 rounded-full -ml-10 -mb-10 pointer-events-none"></div><div><div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold mb-4 border border-white/10"><Zap size={12} fill="currentColor" /> Dica PRO</div><h3 className="text-2xl font-bold mb-2">Aumente suas vendas!</h3><p className="text-teal-50 text-sm leading-relaxed">Produtos com fotos de alta qualidade vendem 3x mais. Acesse o menu de Produtos e atualize seu catálogo agora mesmo.</p></div><button className="bg-white text-teal-700 font-bold py-3 px-6 rounded-xl shadow-md hover:bg-gray-50 transition-colors w-fit mt-6 flex items-center gap-2">Gerenciar Produtos <ArrowUpRight size={18} /></button></div></div></div>
          </div></div>
    </div>
  );
};

export default DashboardScreen;
