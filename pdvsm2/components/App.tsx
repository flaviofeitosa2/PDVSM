
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Product, 
  Category, 
  CartItem, 
  Customer, 
  Sale, 
  PaymentDetail, 
  UserProfile,
  Company
} from '../types';

import Sidebar from './Sidebar';
import DashboardScreen from './DashboardScreen';
import ProductList from './ProductList';
import Cart from './Cart';
import PaymentScreen from './PaymentScreen';
import OrdersScreen from './OrdersScreen';
import ProductsScreen from './ProductsScreen';
import CustomersScreen from './CustomersScreen';
import SubscriptionList from './SubscriptionList';
import HistoryScreen from './HistoryScreen';
import FinanceScreen from './FinanceScreen';
import UsersScreen from './UsersScreen';
import SettingsScreen from './SettingsScreen';
import AdminMasterScreen from './AdminMasterScreen';
import AuthPage from './AuthPage';
import LandingPage from './LandingPage';
import SaleSuccessNotification from './SaleSuccessNotification';
import SubscriberPortal from './SubscriberPortal';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [profileError, setProfileError] = useState<{message: string, type: 'not_found' | 'error' | 'network'} | null>(null);
  
  const [view, setView] = useState('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authView, setAuthView] = useState<'landing' | 'login' | 'register'>('landing');

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // UI
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id, session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          fetchUserProfile(session.user.id, session);
      } else {
          setUserProfile(null);
          setCompanyData(null);
          setProfileError(null);
          setAuthView('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string, currentSession: any) => {
      try {
          const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
          if (error) {
              setProfileError({ message: "Erro de conexão.", type: 'network' });
              return;
          }
          if (!data) {
              setProfileError({ message: "Perfil não encontrado.", type: 'not_found' });
              return;
          }
          setUserProfile(data as UserProfile);
          if (data.company_id) {
              fetchCompanyData(data.company_id);
              if (data.role !== 'customer') fetchData(data.company_id);
          }
      } catch (err) {
          console.error(err);
      }
  };

  const fetchCompanyData = async (companyId: string) => {
      const { data } = await supabase.from('companies').select('*').eq('id', companyId).single();
      if (data) setCompanyData(data as Company);
  };

  const fetchData = async (companyId: string) => {
      const [prodRes, catRes, custRes, saleRes] = await Promise.all([
          supabase.from('products').select('*').eq('company_id', companyId),
          supabase.from('categories').select('*').eq('company_id', companyId),
          supabase.from('customers').select('*').eq('company_id', companyId),
          supabase.from('sales').select('*').eq('company_id', companyId).order('date', { ascending: false })
      ]);

      if (prodRes.data) setProducts(prodRes.data);
      if (catRes.data) setCategories(catRes.data);
      if (custRes.data) {
          setCustomers(custRes.data.map((c: any) => ({ 
              ...c, 
              isSubscriber: c.is_subscriber,
              createdAt: c.created_at,
              avatarText: c.avatar_text || (c.name ? c.name.substring(0, 2).toUpperCase() : '??')
          })));
      }
      if (saleRes.data) {
          setSales(saleRes.data.map((s: any) => ({
              ...s,
              clientName: s.client_name,
              sellerName: s.seller_name,
              items: typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []),
              payments: typeof s.payments === 'string' ? JSON.parse(s.payments) : (s.payments || [])
          })));
      }
  };

  const addToCart = (product: Product, meta?: any) => {
      setCart(prev => {
          const existing = prev.find(p => p.id === product.id);
          if (existing && !meta) {
              return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
          }
          return [...prev, { ...product, quantity: 1, ...meta }];
      });
  };

  const updateQuantity = (id: string, delta: number) => {
      setCart(prev => prev.map(item => {
          if (item.id === id) return { ...item, quantity: Math.max(0, item.quantity + delta) };
          return item;
      }).filter(item => item.quantity > 0));
  };

  const handleCompleteSale = async (payments: PaymentDetail[], change: number, notes: string) => {
      if (!userProfile?.company_id) return;
      
      try {
          const subtotal = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
          const total = subtotal - discount;
          
          const newSale: any = {
              code: Math.random().toString(36).substr(2, 6).toUpperCase(),
              date: new Date().toISOString(),
              client_name: selectedCustomer ? selectedCustomer.name : 'Cliente Balcão',
              customer_id: selectedCustomer?.id,
              client_cpf: selectedCustomer?.cpf,
              seller_name: userProfile.full_name,
              items: JSON.stringify(cart),
              subtotal: subtotal,
              discount: discount,
              total: total,
              payment_method: payments[0].method,
              payments: JSON.stringify(payments),
              change: change,
              status: 'completed',
              notes: notes,
              company_id: userProfile.company_id
          };
          
          if (editingOrderId) {
              const { error: updateError } = await supabase.from('sales').update(newSale).eq('id', editingOrderId);
              if (updateError) throw updateError;
          } else {
              const { error: insertError } = await supabase.from('sales').insert([newSale]);
              if (insertError) throw insertError;
          }
          
          const updates = [];
          for (const item of cart) {
              if (item.manage_stock && item.stock !== undefined) {
                  updates.push(supabase.from('products').update({ stock: item.stock - item.quantity }).eq('id', item.id));
              }
              if (item.subscriptionReconciliationId) {
                  updates.push(supabase.from('subscriptions').update({ payment_date: new Date().toISOString() }).eq('id', item.subscriptionReconciliationId));
              }
          }
          if (updates.length > 0) await Promise.all(updates);

          setLastCompletedSale({ ...newSale, clientName: newSale.client_name, sellerName: newSale.seller_name, paymentMethod: newSale.payment_method, items: cart, payments: payments } as any);
          setShowSuccessNotification(true);
          
          // RESET UI & CART
          setCart([]);
          setSelectedCustomer(null);
          setDiscount(0);
          setEditingOrderId(null);
          setIsCartOpen(false); // Fecha o carrinho explicitamente para a nova venda
          
          fetchData(userProfile.company_id);
          setView('pos'); // Volta para a tela de produtos

      } catch (error: any) {
          console.error("Erro ao finalizar venda:", error);
          alert("Erro ao salvar venda: " + error.message);
          throw error;
      }
  };

  const handleAddCustomer = async (c: Customer) => {
    if (!userProfile?.company_id) return null;
    const { data, error } = await supabase.from('customers').insert([{ 
        name: c.name, cpf: c.cpf, phone: c.phone, email: c.email, 
        company_id: userProfile.company_id, avatar_text: c.name.substring(0, 2).toUpperCase() 
    }]).select().single();
    if (error) throw error;
    fetchData(userProfile.company_id);
    return data as any;
  };

  if (!session) {
      if (authView === 'landing') return <LandingPage onLogin={() => setAuthView('login')} onRegister={() => setAuthView('register')} />;
      return <AuthPage initialView={authView === 'login' ? 'login' : 'register'} onBack={() => setAuthView('landing')} />;
  }

  if (profileError) return <div className="p-20 text-center">{profileError.message}</div>;
  if (!userProfile) return <div className="p-20 text-center">Carregando perfil...</div>;
  if (userProfile.role === 'customer') return <SubscriberPortal userProfile={userProfile} />;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentView={view} onNavigate={setView} 
        companyName={companyData?.name} userRole={userProfile.role} permissions={companyData?.permissions?.operator}
        pendingOrdersCount={sales.filter(s => s.status === 'pending').length}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {view === 'dashboard' && <DashboardScreen sales={sales} products={products} customers={customers} toggleSidebar={() => setIsSidebarOpen(true)} userProfile={userProfile} />}
        
        {view === 'pos' && (
            <div className="flex h-full">
                <ProductList 
                    products={products} categories={categories} addToCart={addToCart} cartItems={cart} 
                    toggleSidebar={() => setIsSidebarOpen(true)} onOpenCart={() => setIsCartOpen(true)} 
                    editingOrderId={editingOrderId} onCancelEdit={() => { setEditingOrderId(null); setCart([]); setDiscount(0); }}
                />
                <Cart 
                    items={cart} updateQuantity={updateQuantity} removeFromCart={(id) => setCart(c => c.filter(i => i.id !== id))} 
                    clearCart={() => setCart([])} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onCheckout={() => setView('payment')}
                    customers={customers} selectedCustomer={selectedCustomer} onSelectCustomer={setSelectedCustomer}
                    discount={discount} onApplyDiscount={setDiscount} addToCart={addToCart} allProducts={products} onRegisterCustomer={handleAddCustomer}
                    setQuantity={() => {}}
                />
            </div>
        )}

        {view === 'orders' && (
            <OrdersScreen 
                sales={sales} 
                userProfile={userProfile} 
                toggleSidebar={() => setIsSidebarOpen(true)}
                onLoadOrder={(s) => {
                    setCart(s.items);
                    setSelectedCustomer(customers.find(c => c.id === s.customer_id) || null);
                    setDiscount(s.discount || 0);
                    setEditingOrderId(s.id);
                    setView('pos');
                }}
                onCreateNew={() => { setCart([]); setSelectedCustomer(null); setDiscount(0); setEditingOrderId(null); setView('pos'); }}
                onCancelOrder={async (id) => {
                    const { error } = await supabase.from('sales').delete().eq('id', id);
                    if (!error && userProfile?.company_id) fetchData(userProfile.company_id);
                }}
            />
        )}

        {view === 'payment' && (
            <PaymentScreen 
                cartItems={cart} subtotal={cart.reduce((a, b) => a + (b.price * b.quantity), 0)} onBack={() => setView('pos')} 
                onComplete={handleCompleteSale} 
                onSaveOrder={async (notes) => {
                    if (!userProfile?.company_id) return;
                    const subtotal = cart.reduce((a, b) => a + (b.price * b.quantity), 0);
                    const orderData = {
                        code: Math.random().toString(36).substr(2, 6).toUpperCase(),
                        date: new Date().toISOString(),
                        client_name: selectedCustomer ? selectedCustomer.name : 'Cliente Balcão',
                        customer_id: selectedCustomer?.id,
                        seller_name: userProfile.full_name,
                        items: JSON.stringify(cart),
                        subtotal, discount, total: subtotal - discount,
                        payment_method: 'money',
                        status: 'pending',
                        notes,
                        company_id: userProfile.company_id
                    };
                    await supabase.from('sales').insert([orderData]);
                    setCart([]); setView('pos'); setIsCartOpen(false); fetchData(userProfile.company_id);
                }} 
                onDiscard={() => { setCart([]); setView('pos'); setEditingOrderId(null); setIsCartOpen(false); }} 
                discount={discount} onEditDiscount={setDiscount} customer={selectedCustomer} onSelectCustomer={setSelectedCustomer} 
                allCustomers={customers} onRegisterCustomer={handleAddCustomer} 
            />
        )}

        {view === 'history' && (
          <HistoryScreen 
            sales={sales} 
            userProfile={userProfile} 
            toggleSidebar={() => setIsSidebarOpen(true)}
            onCancelSale={async(id, r)=>{ await supabase.from('sales').update({status:'cancelled', notes: r}).eq('id', id); fetchData(userProfile.company_id); }} 
            onUpdateSaleDate={async(id, d)=>{ await supabase.from('sales').update({date: d}).eq('id', id); fetchData(userProfile.company_id); }} 
            onDeleteSale={async(id)=>{ await supabase.from('sales').delete().eq('id', id); fetchData(userProfile.company_id); }} 
          />
        )}
        
        {view === 'customers' && <CustomersScreen customers={customers} onAddCustomer={handleAddCustomer} onUpdateCustomer={async(c)=>{ await supabase.from('customers').update({name: c.name, phone: c.phone, email: c.email, cpf: c.cpf}).eq('id', c.id); fetchData(userProfile.company_id); }} onImportCustomers={async(list)=>{ for(let c of list) await handleAddCustomer(c); }} onDeleteCustomer={async(id)=>{ await supabase.from('customers').delete().eq('id', id); fetchData(userProfile.company_id); }} toggleSidebar={() => setIsSidebarOpen(true)} />}
        {view === 'subscriptions' && <SubscriptionList customers={customers} companyId={userProfile.company_id} toggleSidebar={() => setIsSidebarOpen(true)} />}
        {view === 'products' && (
            <ProductsScreen 
                products={products} 
                categories={categories} 
                toggleSidebar={() => setIsSidebarOpen(true)} 
                onAddCategory={async(n)=>{ await supabase.from('categories').insert([{name: n, company_id: userProfile.company_id}]); fetchData(userProfile.company_id); }} 
                onEditCategory={async(id, n)=>{ await supabase.from('categories').update({name: n}).eq('id', id); fetchData(userProfile.company_id); }} 
                onDeleteCategory={async(id)=>{ await supabase.from('categories').delete().eq('id', id); fetchData(userProfile.company_id); }} 
                onAddProduct={async(p)=>{ 
                    const { id, ...data } = p;
                    const { error } = await supabase.from('products').insert([{...data, company_id: userProfile.company_id}]); 
                    if (error) {
                        alert("Erro ao salvar produto: " + error.message);
                        throw error;
                    }
                    fetchData(userProfile.company_id); 
                }} 
                onUpdateProduct={async(p)=>{ 
                    const { error } = await supabase.from('products').update(p).eq('id', p.id); 
                    if (error) {
                        alert("Erro ao atualizar produto: " + error.message);
                        throw error;
                    }
                    fetchData(userProfile.company_id); 
                }} 
                onDeleteProduct={async(id)=>{ await supabase.from('products').delete().eq('id', id); fetchData(userProfile.company_id); }} 
                userRole={userProfile.role} 
            />
        )}
        {view === 'finance' && <FinanceScreen toggleSidebar={() => setIsSidebarOpen(true)} userProfile={userProfile} />}
        {view === 'users' && <UsersScreen toggleSidebar={() => setIsSidebarOpen(true)} userProfile={userProfile} />}
        {view === 'settings' && <SettingsScreen toggleSidebar={() => setIsSidebarOpen(true)} userProfile={userProfile} onCompanyUpdate={(n) => setCompanyData(prev => prev ? {...prev, name: n} : null)} onPermissionsUpdate={() => fetchData(userProfile.company_id)} />}
        
        {view === 'admin_master' && <AdminMasterScreen toggleSidebar={() => setIsSidebarOpen(true)} />}
        
        <SaleSuccessNotification isVisible={showSuccessNotification} sale={lastCompletedSale} onClose={() => setShowSuccessNotification(false)} onViewReceipt={() => {}} />
      </main>
    </div>
  );
}
