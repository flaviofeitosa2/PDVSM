
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ScanLine, 
  Zap, 
  List as ListIcon, 
  LayoutGrid,
  Star,
  ChevronRight,
  Plus,
  X,
  ShoppingBag
} from 'lucide-react';
import { Product, CartItem, Category } from '../types';
import UserMenu from './UserMenu';

interface ProductListProps {
  products: Product[];
  categories: Category[];
  addToCart: (product: Product) => void;
  cartItems: CartItem[];
  toggleSidebar: () => void;
  onOpenCart?: () => void;
  editingOrderId?: string | null;
  onCancelEdit?: () => void;
  onToggleFavorite?: (product: Product) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  addToCart,
  cartItems,
  toggleSidebar,
  onOpenCart
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'tudo' | 'destaques' | 'produto' | 'serviço'>('tudo');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [animateCart, setAnimateCart] = useState(false);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
      const saved = localStorage.getItem('posViewMode');
      return (saved === 'grid' || saved === 'list') ? saved : 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
      setViewMode(mode);
      localStorage.setItem('posViewMode', mode);
  };

  const getQtyInCart = (productId: string) => {
    const item = cartItems.find(i => i.id === productId);
    return item ? item.quantity : 0;
  };

  const currentTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const currentCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    if (currentCount > 0) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 300);
      return () => clearTimeout(timer);
    }
  }, [currentCount]);

  const handleAddToCart = (product: Product) => {
    setLastAddedId(product.id);
    addToCart(product);
    setTimeout(() => setLastAddedId(null), 500);
  };

  const filteredProducts = useMemo(() => {
      const filtered = products.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                (p.code && p.code.includes(searchQuery));
          
          if (!matchesSearch) return false;

          if (activeFilter === 'destaques') return p.is_favorite;
          if (activeFilter === 'produto') return p.manage_stock === true;
          if (activeFilter === 'serviço') return p.manage_stock === false;
          
          return true;
      });

      return filtered.sort((a, b) => {
          if (a.is_favorite && !b.is_favorite) return -1;
          if (!a.is_favorite && b.is_favorite) return 1;
          return a.name.localeCompare(b.name);
      });
  }, [products, searchQuery, activeFilter]);

  const getAbbreviation = (name: string) => {
      return name.substring(0, 6).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F3F4F6] dark:bg-[#1a1b2e] relative font-sans transition-colors">
      
      <style>{`
        @keyframes cart-bump {
          0% { transform: scale(1); }
          50% { transform: scale(1.02) translateY(-2px); }
          100% { transform: scale(1); }
        }
        .animate-cart-bump {
          animation: cart-bump 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes float-up {
          0% { opacity: 0; transform: translateY(0); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-40px); }
        }
        .animate-float-up {
          animation: float-up 0.6s ease-out forwards;
        }
        .product-card-active {
            box-shadow: 0 0 0 3px rgba(193, 255, 114, 0.2);
            border-color: #c1ff72 !important;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- HEADER DESKTOP (ESTILO ELEGANTE) --- */}
      <header className="hidden lg:flex bg-white dark:bg-[#23243a] px-10 py-8 items-center justify-between shrink-0 border-b border-gray-100 dark:border-white/5 transition-colors">
          <div className="flex flex-col">
              <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-semibold text-gray-800 dark:text-white uppercase tracking-tight">Frente de Caixa</h1>
                  <span className="bg-emerald-50 dark:bg-[#c1ff72]/10 text-emerald-600 dark:text-[#c1ff72] text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-100 dark:border-[#c1ff72]/20 uppercase tracking-widest">
                      PDV Aberto
                  </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-1.5 uppercase tracking-widest">Selecione produtos para adicionar à venda</p>
          </div>

          <div className="flex items-center gap-12">
              <div className="flex gap-12">
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest mb-1">Subtotal</span>
                      <span className="text-2xl font-bold text-gray-800 dark:text-white tabular-nums">
                          {currentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                  </div>
                  <div className="w-px h-10 bg-gray-100 dark:bg-white/5 my-auto"></div>
                  <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest mb-1">Itens</span>
                      <span className="text-2xl font-bold text-gray-800 dark:text-white tabular-nums">
                          {currentCount}
                      </span>
                  </div>
              </div>
              <div className="h-10 w-px bg-gray-100 dark:bg-white/5"></div>
              <UserMenu />
          </div>
      </header>

      {/* --- HEADER MOBILE --- */}
      <div className="lg:hidden bg-white dark:bg-[#23243a] px-4 pt-4 pb-2 flex items-center justify-between shrink-0 border-b border-gray-100 dark:border-white/5 transition-colors">
          <div className="flex items-center gap-4">
              <button onClick={toggleSidebar} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <ListIcon size={26} />
              </button>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white uppercase tracking-tight">Vender</h2>
          </div>
          <div className="flex items-center gap-3">
              <div className="flex px-3 py-1.5 bg-emerald-50 dark:bg-[#c1ff72]/10 rounded-full text-[9px] font-bold uppercase text-emerald-600 dark:text-[#c1ff72] border border-emerald-100 dark:border-[#c1ff72]/20 tracking-widest">
                  Aberto
              </div>
          </div>
      </div>

      {/* --- BARRA DE BUSCA E FILTROS --- */}
      <div className="bg-white dark:bg-[#23243a] px-4 py-3 lg:px-6 lg:py-4 flex items-center justify-between gap-4 lg:gap-6 shrink-0 transition-colors">
          <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#c1ff72] transition-colors" size={18} />
              <input 
                  type="text"
                  placeholder="Pesquisar..."
                  className="w-full bg-gray-50 dark:bg-[#1a1b2e] border border-transparent dark:text-white focus:border-[#c1ff72]/20 focus:ring-4 focus:ring-[#c1ff72]/5 rounded-2xl pl-11 pr-10 py-3 text-sm font-medium outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
              )}
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
              <button className="p-2 text-gray-400 dark:hover:text-[#c1ff72] transition-colors hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl"><ScanLine size={24} /></button>
              
              <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                <button 
                    onClick={() => handleSetViewMode('list')} 
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#23243a] text-[#c1ff72] shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                >
                    <ListIcon size={18} />
                </button>
                <button 
                    onClick={() => handleSetViewMode('grid')} 
                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#23243a] text-[#c1ff72] shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                >
                    <LayoutGrid size={18} />
                </button>
              </div>
          </div>
      </div>

      <div className="bg-white dark:bg-[#23243a] flex px-6 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-white/5 shrink-0 transition-colors">
          {[
              { id: 'tudo', label: 'TUDO' },
              { id: 'destaques', label: 'DESTAQUES' },
              { id: 'produto', label: 'PRODUTO' },
              { id: 'serviço', label: 'SERVIÇO' }
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`py-4 px-6 text-[10px] font-bold tracking-[0.2em] uppercase transition-all border-b-2 whitespace-nowrap
                    ${activeFilter === tab.id ? 'text-[#c1ff72] border-[#c1ff72]' : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-white'}`}
              >
                  {tab.label}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-28 custom-scrollbar">
          {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 md:gap-3">
                  {filteredProducts.map((product) => {
                      const qty = getQtyInCart(product.id);
                      const isOutOfStock = product.manage_stock && (product.stock || 0) <= 0;
                      const isRecentlyAdded = lastAddedId === product.id;
                      
                      return (
                          <div 
                            key={product.id} 
                            onClick={() => !isOutOfStock && handleAddToCart(product)}
                            className={`bg-white dark:bg-[#23243a] rounded-xl md:rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 flex flex-col relative transition-all duration-200 
                                ${isOutOfStock ? 'opacity-40 grayscale cursor-not-allowed' : 'active:scale-95 cursor-pointer hover:shadow-lg dark:hover:border-[#c1ff72]/20'}
                                ${isRecentlyAdded ? 'product-card-active' : ''}`}
                          >
                              {isRecentlyAdded && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                                      <span className="text-[#c1ff72] font-semibold text-2xl md:text-3xl animate-float-up drop-shadow-md">+1</span>
                                  </div>
                              )}

                              <div className="bg-[#4a5568] dark:bg-[#1a1b2e]/60 px-1.5 py-0.5 md:px-2 md:py-1 flex justify-between items-center">
                                  <span className="text-[7px] md:text-[9px] font-bold text-gray-300 tracking-widest truncate">
                                      {getAbbreviation(product.name)}
                                  </span>
                                  <div className="flex gap-0.5 md:gap-1">
                                    {product.is_favorite && <Star size={8} className="text-[#c1ff72] fill-current md:w-[10px]" />}
                                    {isOutOfStock && <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-rose-500 rounded-full border border-white"></div>}
                                  </div>
                              </div>

                              {qty > 0 && (
                                  <div className={`absolute top-5 right-1 md:top-6 md:right-2 bg-[#c1ff72] text-[#1a1b2e] text-[9px] md:text-[11px] font-bold px-1.5 py-0.5 rounded-lg shadow-xl z-10 transition-transform border border-white/20 ${isRecentlyAdded ? 'scale-110' : ''}`}>
                                      {qty}
                                  </div>
                              )}

                              <div className="aspect-square bg-white dark:bg-white/5 flex items-center justify-center p-1.5 md:p-3">
                                  <img 
                                    src={product.image} 
                                    alt="" 
                                    className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" 
                                  />
                              </div>

                              <div className="bg-gray-50 dark:bg-[#1a1b2e]/40 p-1.5 md:p-2.5 mt-auto transition-colors text-center">
                                  <h3 className="text-[7px] md:text-[9px] font-bold text-gray-800 dark:text-gray-300 uppercase truncate mb-0.5 md:mb-1">
                                      {product.name}
                                  </h3>
                                  <p className="text-[9px] md:text-xs font-bold text-[#1a1b2e] dark:text-[#c1ff72]">
                                      {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                              </div>
                          </div>
                      );
                  })}
              </div>
          ) : (
              <div className="max-w-6xl mx-auto space-y-2">
                  {filteredProducts.map((product) => {
                      const qty = getQtyInCart(product.id);
                      const isOutOfStock = product.manage_stock && (product.stock || 0) <= 0;
                      const isRecentlyAdded = lastAddedId === product.id;
                      
                      return (
                          <div 
                            key={product.id} 
                            onClick={() => !isOutOfStock && handleAddToCart(product)}
                            className={`flex items-center gap-4 md:gap-6 p-3 md:p-4 rounded-2xl md:rounded-3xl transition-all relative border border-transparent ${isOutOfStock ? 'opacity-40 grayscale' : 'active:scale-[0.99] cursor-pointer hover:bg-white dark:hover:bg-[#23243a] hover:shadow-sm'} ${isRecentlyAdded ? 'bg-[#c1ff72]/5 border-[#c1ff72]/20' : ''}`}
                          >
                              <div className="relative shrink-0">
                                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden flex flex-col transition-colors ${isRecentlyAdded ? 'border-[#c1ff72]' : 'bg-gray-50 dark:bg-[#23243a]'}`}>
                                      <div className="flex-1 flex items-center justify-center p-2 bg-white dark:bg-white/5">
                                          <img src={product.image} alt="" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                                      </div>
                                  </div>
                                  {qty > 0 && (
                                      <div className="absolute -top-2 -right-2 bg-[#c1ff72] text-[#1a1b2e] text-[9px] md:text-[10px] font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-lg border-2 border-white dark:border-[#1a1b2e] shadow-lg z-10">
                                          {qty}
                                      </div>
                                  )}
                              </div>

                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5 md:mb-1">
                                      {product.is_favorite && <Star size={12} className="text-[#c1ff72] fill-current md:w-[14px]" />}
                                      <h3 className={`text-sm md:text-base font-semibold truncate uppercase tracking-tight transition-colors ${isRecentlyAdded ? 'text-[#c1ff72]' : 'text-gray-800 dark:text-white'}`}>
                                          {product.name}
                                      </h3>
                                  </div>
                                  <p className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-widest">SKU: {product.code || 'N/A'}</p>
                              </div>

                              <div className="text-right shrink-0">
                                  <span className={`text-base md:text-lg font-bold tracking-tight transition-colors ${isRecentlyAdded ? 'text-[#c1ff72]' : 'text-gray-800 dark:text-white'}`}>
                                      {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                  {isOutOfStock && (
                                      <p className="text-[8px] md:text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-0.5 md:mt-1">Esgotado</p>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>

      {/* --- BOTÃO FLUTUANTE MOBILE --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg p-1.5 md:p-2 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] md:rounded-[2.5rem] z-40 lg:hidden shadow-2xl">
          <button 
              onClick={onOpenCart}
              className={`w-full py-4 md:py-5 px-6 md:px-8 rounded-[1.8rem] md:rounded-[2rem] font-bold text-base md:text-lg flex items-center justify-between transition-all active:scale-[0.98] 
                ${animateCart ? 'animate-cart-bump' : ''}
                ${currentCount > 0 
                      ? 'bg-[#c1ff72] text-[#1a1b2e] shadow-xl shadow-[#c1ff72]/20' 
                      : 'bg-white/5 border border-white/10 text-white opacity-50'
                }`}
          >
              <div className="flex items-center gap-2 md:gap-3">
                  <ShoppingBag size={20} md:size={24} strokeWidth={2.5} />
                  <span className="uppercase tracking-widest text-xs md:text-sm">{currentCount} {currentCount === 1 ? 'item' : 'itens'}</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                  <span className="font-bold tracking-tight">{currentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  <ChevronRight size={20} md:size={24} strokeWidth={2.5} />
              </div>
          </button>
      </div>
    </div>
  );
};

export default ProductList;
