
import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  ChevronDown, 
  Star, 
  Image as ImageIcon, 
  Camera,
  Loader2,
  Save,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import { Category, Product } from '../types';
import UserMenu from './UserMenu';

interface ProductFormProps {
  onBack: () => void;
  onSave: (productData: Partial<Product>) => Promise<void>;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onAddCategoryClick?: () => void;
  categories: Category[];
  initialData?: Partial<Product>;
  canManageStock?: boolean;
}

const FormLabel = ({ children, required, action }: { children?: React.ReactNode, required?: boolean, action?: React.ReactNode }) => (
  <label className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
    <span>
        {children}
        {required && <span className="text-red-400 ml-1">*</span>}
    </span>
    {action}
  </label>
);

const FormInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`
      w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm text-gray-700 
      outline-none transition-all duration-200
      focus:border-[#2dd4bf] focus:ring-4 focus:ring-[#2dd4bf]/5 placeholder-gray-300
      disabled:bg-gray-50 disabled:text-gray-400
      ${props.className || ''}
    `}
  />
);

const FormSelect = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative">
    <select
      {...props}
      className={`
        w-full border border-gray-200 bg-white rounded-xl px-4 py-3 text-sm text-gray-700 
        outline-none transition-all duration-200 appearance-none
        focus:border-[#2dd4bf] focus:ring-4 focus:ring-[#2dd4bf]/5 cursor-pointer
        ${props.className || ''}
      `}
    >
      {children}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
  </div>
);

const ToggleSwitch = ({ checked, onChange, label, activeColor = 'bg-[#2dd4bf]' }: { checked: boolean, onChange: (checked: boolean) => void, label?: string, activeColor?: string }) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none">
    <div className="relative">
      <input 
        type="checkbox" 
        className="sr-only" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${checked ? activeColor : 'bg-gray-300'}`}></div>
      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}></div>
    </div>
    {label && <span className={`text-sm font-bold transition-colors ${checked ? 'text-gray-800' : 'text-gray-400 group-hover:text-gray-600'}`}>{label}</span>}
  </label>
);

const ProductForm: React.FC<ProductFormProps> = ({ 
    onBack, 
    onSave, 
    onAddCategoryClick,
    categories, 
    initialData,
    canManageStock = true
}) => {
  const [loading, setLoading] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false); 
  const [previewUrl, setPreviewUrl] = useState<string>(initialData?.image || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    price: initialData?.price?.toString() || '',
    promotional_price: initialData?.promotional_price?.toString() || '',
    cost: initialData?.cost?.toString() || '',
    code: initialData?.code || '',
    category: initialData?.category || '',
    unit: initialData?.unit || 'Unidade (un)',
    description: initialData?.description || '',
    stock: initialData?.stock?.toString() || '0',
    min_stock: initialData?.min_stock?.toString() || '',
    manage_stock: initialData?.manage_stock ?? false,
    is_catalog: initialData?.is_catalog ?? true,
    is_favorite: initialData?.is_favorite ?? false,
    is_subscription_trigger: initialData?.is_subscription_trigger ?? false,
    image: initialData?.image || '' 
  });

  const isEditing = !!initialData?.id;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0];
      try {
        setIsProcessingImage(true);
        const reader = new FileReader();
        reader.readAsDataURL(originalFile);
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setPreviewUrl(result);
            handleChange('image', result);
            setIsProcessingImage(false);
        };
      } catch (error) { 
          console.error("Erro ao otimizar imagem:", error); 
          setIsProcessingImage(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) { alert('Nome e Preço são obrigatórios'); return; }
    
    setLoading(true);
    try {
      const savePayload: any = {
        name: formData.name,
        price: parseFloat(formData.price.replace(',', '.')) || 0,
        promotional_price: formData.promotional_price ? parseFloat(formData.promotional_price.replace(',', '.')) : null,
        cost: formData.cost ? parseFloat(formData.cost.replace(',', '.')) : null,
        code: formData.code,
        category: formData.category,
        unit: formData.unit,
        description: formData.description,
        stock: formData.stock ? Number(formData.stock) : 0,
        min_stock: formData.min_stock ? Number(formData.min_stock) : 0,
        manage_stock: formData.manage_stock, 
        is_catalog: formData.is_catalog,
        is_favorite: formData.is_favorite,
        is_subscription_trigger: formData.is_subscription_trigger,
        image: formData.image 
      };

      if (isEditing) {
          savePayload.id = initialData?.id;
      }

      await onSave(savePayload);
    } catch (e) {
      console.error("Erro no formulário:", e);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] font-sans">
      <header className="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-100 sticky top-0 z-30 shadow-sm/50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div>
             <h2 className="text-lg font-bold text-gray-800 leading-tight">{isEditing ? 'Editar Produto' : 'Novo Produto'}</h2>
             <p className="text-xs text-gray-500">Preencha as informações abaixo</p>
          </div>
        </div>
        <UserMenu />
      </header>

      <div className="bg-white px-6 py-3 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 sticky top-[73px] z-20">
        <div className="flex items-center gap-8">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors select-none">
                <Star size={18} className={formData.is_favorite ? "text-amber-400 fill-current" : "text-gray-300"} />
                <input type="checkbox" className="hidden" checked={formData.is_favorite} onChange={e => handleChange('is_favorite', e.target.checked)} />
                Destacar produto
            </label>

            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>

            <ToggleSwitch 
                checked={formData.is_catalog}
                onChange={(checked) => handleChange('is_catalog', checked)}
                label="Exibir no Catálogo Online"
            />

            <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>

            <ToggleSwitch 
                checked={formData.is_subscription_trigger}
                onChange={(checked) => handleChange('is_subscription_trigger', checked)}
                label="Produto de Assinatura"
                activeColor="bg-indigo-600"
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 xl:grid-cols-12 gap-6">
            
            {/* COLUNA DA ESQUERDA: DADOS PRINCIPAIS */}
            <div className="xl:col-span-8 space-y-6">
                
                {/* CARD 1: IMAGEM, NOME E PREÇOS */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200/60 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Imagem do Produto */}
                        <div className="w-full lg:w-64 flex-shrink-0">
                             <FormLabel>Imagem do Produto</FormLabel>
                             <div 
                                onClick={() => !isProcessingImage && fileInputRef.current?.click()} 
                                className={`aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-[1.5rem] flex flex-col items-center justify-center cursor-pointer hover:border-[#2dd4bf] hover:bg-teal-50/30 transition-all group relative overflow-hidden ${isProcessingImage ? 'cursor-wait opacity-70' : ''}`}
                             >
                                 {isProcessingImage ? (
                                     <div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-[#2dd4bf]" size={32} /></div>
                                 ) : previewUrl ? (
                                     <>
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain p-4 mix-blend-multiply" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="text-white" size={32} />
                                        </div>
                                     </>
                                 ) : (
                                     <div className="text-center p-4">
                                         <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300 group-hover:text-[#2dd4bf] transition-colors">
                                             <ImageIcon size={32} />
                                         </div>
                                         <span className="text-sm font-bold text-gray-400 group-hover:text-gray-600">Adicionar Foto</span>
                                     </div>
                                 )}
                             </div>
                             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} disabled={isProcessingImage} />
                        </div>

                        {/* Nome e Preços */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <FormLabel required>Nome do Produto</FormLabel>
                                <FormInput 
                                    placeholder="Ex: Camiseta Básica Branca" 
                                    value={formData.name} 
                                    onChange={e => handleChange('name', e.target.value)} 
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <FormLabel required>Preço de Venda</FormLabel>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                                        <FormInput 
                                            className="pl-12 font-bold text-gray-800" 
                                            placeholder="0,00" 
                                            type="text" 
                                            value={formData.price} 
                                            onChange={e => handleChange('price', e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <FormLabel>Preço Promocional</FormLabel>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                                        <FormInput 
                                            className="pl-12 text-rose-500 font-bold" 
                                            placeholder="0,00" 
                                            type="text" 
                                            value={formData.promotional_price} 
                                            onChange={e => handleChange('promotional_price', e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CARD 2: DETALHES E ORGANIZAÇÃO */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-200/60">
                    <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                        Detalhes & Organização
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                         <div>
                             <FormLabel action={<button onClick={(e) => { e.preventDefault(); onAddCategoryClick?.(); }} className="text-[#2dd4bf] hover:text-[#14b8a6] flex items-center gap-1 transition-colors lowercase font-bold"><PlusCircle size={14} /> adicionar</button>}>Categoria</FormLabel>
                             <FormSelect value={formData.category} onChange={e => handleChange('category', e.target.value)}>
                                 <option value="">Sem categoria</option>
                                 {categories.filter(c => c.id !== 'all').map(c => (
                                     <option key={c.id} value={c.name}>{c.name}</option>
                                 ))}
                             </FormSelect>
                         </div>
                         <div>
                             <FormLabel>Código (SKU)</FormLabel>
                             <FormInput placeholder="Ex: 789000123" value={formData.code} onChange={e => handleChange('code', e.target.value)} />
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                            <FormLabel>Custo (R$)</FormLabel>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                                <FormInput 
                                    className="pl-12 font-medium" 
                                    placeholder="0,00" 
                                    type="text" 
                                    value={formData.cost} 
                                    onChange={e => handleChange('cost', e.target.value)} 
                                />
                            </div>
                        </div>
                        <div>
                            <FormLabel>Unidade</FormLabel>
                            <FormSelect value={formData.unit} onChange={e => handleChange('unit', e.target.value)}>
                                <option value="Unidade (un)">Unidade (un)</option>
                                <option value="Quilo (kg)">Quilo (kg)</option>
                                <option value="Grama (g)">Grama (g)</option>
                                <option value="Litro (l)">Litro (l)</option>
                                <option value="Mililitro (ml)">Mililitro (ml)</option>
                                <option value="Metro (m)">Metro (m)</option>
                                <option value="Par">Par</option>
                                <option value="Caixa">Caixa</option>
                            </FormSelect>
                        </div>
                    </div>

                    <div>
                        <FormLabel>Descrição</FormLabel>
                        <textarea 
                            rows={4} 
                            className="w-full border border-gray-200 bg-white rounded-2xl px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#2dd4bf] focus:ring-4 focus:ring-[#2dd4bf]/5 transition-all resize-none placeholder-gray-300" 
                            placeholder="Descrição do produto..." 
                            value={formData.description} 
                            onChange={e => handleChange('description', e.target.value)}
                        ></textarea>
                    </div>
                </div>
            </div>

            {/* COLUNA DA DIREITA: ESTOQUE E AÇÕES */}
            <div className="xl:col-span-4 space-y-6">
                
                {/* CARD ESTOQUE */}
                {canManageStock && (
                    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200/60 overflow-hidden">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Estoque</h3>
                            <ToggleSwitch checked={formData.manage_stock} onChange={(checked) => handleChange('manage_stock', checked)} label="Gerenciar" />
                        </div>
                        <div className="p-8">
                            <div className={`grid grid-cols-2 gap-6 transition-opacity duration-200 ${!formData.manage_stock ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                                <div>
                                    <FormLabel>Atual</FormLabel>
                                    <FormInput type="number" className="text-center font-bold text-lg" placeholder="0" value={formData.stock} onChange={e => handleChange('stock', e.target.value)} />
                                </div>
                                <div>
                                    <FormLabel>Mínimo</FormLabel>
                                    <FormInput type="number" className="text-center font-bold text-lg" placeholder="0" value={formData.min_stock} onChange={e => handleChange('min_stock', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CARD INFO/DICA */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-200/60 p-8 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4">
                        <HelpCircle size={24} />
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm mb-2 uppercase tracking-tight">Dica de Venda</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Produtos com preço promocional aparecem com destaque no catálogo online e ajudam a atrair mais clientes.
                    </p>
                </div>

                {/* BOTÕES DE AÇÃO FIXOS MOBILE / ESTÁTICOS DESKTOP */}
                <div className="sticky bottom-0 bg-[#f8f9fa] pt-4 pb-2 xl:static xl:bg-transparent xl:p-0 space-y-3">
                     <button 
                        onClick={handleSubmit} 
                        disabled={loading || isProcessingImage} 
                        className={`w-full bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-black py-4 rounded-2xl shadow-xl shadow-teal-500/20 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${loading || isProcessingImage ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loading || isProcessingImage ? <Loader2 className="animate-spin" size={24}/> : <Save size={24} />}
                        <span className="uppercase tracking-widest text-sm">{isEditing ? 'Atualizar Produto' : 'Salvar Produto'}</span>
                    </button>
                    
                    <button 
                        onClick={onBack} 
                        className="w-full bg-white border border-gray-200 text-gray-500 font-bold py-4 rounded-2xl hover:bg-gray-50 hover:text-gray-800 transition-colors uppercase tracking-widest text-xs"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
