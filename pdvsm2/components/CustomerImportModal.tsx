
import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Customer } from '../types';

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (customers: Customer[]) => Promise<void>;
  existingCustomers: Customer[];
}

const CustomerImportModal: React.FC<CustomerImportModalProps> = ({ 
  isOpen, 
  onClose, 
  onImport,
  existingCustomers 
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'success'>('upload');
  const [stats, setStats] = useState({ total: 0, new: 0, duplicates: 0 });
  const [customersToImport, setCustomersToImport] = useState<Customer[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Define headers and example data matching the requested format
    const headers = [
      "Nome*", 
      "Celular", 
      "Telefone", 
      "Endereço", 
      "Complemento", 
      "E-mail", 
      "CPF/CNPJ", 
      "Observações", 
      "Fiado permitido"
    ];

    const exampleRow = [
      "Exemplo de cliente", 
      "+55 11 99999-9999", 
      "+55 11 3333-3333", 
      "Rua das Pedras, 111", 
      "Apto 3A", 
      "fulano.sicrano@gmail.com", 
      "999.999.999-99", 
      "Demora para responder", 
      "N"
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    
    // Set column widths for better readability
    ws['!cols'] = [
      { wch: 25 }, // Nome
      { wch: 15 }, // Celular
      { wch: 15 }, // Telefone
      { wch: 25 }, // Endereço
      { wch: 15 }, // Complemento
      { wch: 25 }, // Email
      { wch: 18 }, // CPF
      { wch: 25 }, // Obs
      { wch: 15 }  // Fiado
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Importação");

    // Download file
    XLSX.writeFile(wb, "modelo_importacao_clientes.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // Read as array of arrays first to check headers
      
      processData(data);
    };
    reader.readAsBinaryString(file);
  };

  const processData = (rows: any[]) => {
    if (rows.length < 2) {
        alert("Planilha vazia ou sem cabeçalho.");
        return;
    }

    // Assumindo que a linha 0 é o cabeçalho, começamos do 1
    // Mapeamento baseado nas colunas da imagem:
    // A: Nome*, B: Celular, C: Telefone, D: Endereço, E: Complemento, F: E-mail, G: CPF/CNPJ, H: Observações, I: Fiado permitido
    
    const candidates: Customer[] = [];
    let duplicatesCount = 0;

    // Normalizar dados existentes para comparação rápida
    const existingCpfs = new Set(existingCustomers.map(c => c.cpf?.replace(/\D/g, '')).filter(Boolean));
    const existingNames = new Set(existingCustomers.map(c => c.name.toLowerCase().trim()));

    // Pular cabeçalho (índice 0)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const name = row[0]?.toString().trim();
        if (!name) continue; // Nome é obrigatório

        const cpfRaw = row[6]?.toString().trim();
        const cpfClean = cpfRaw?.replace(/\D/g, '');

        // Verificação de Duplicidade
        // 1. Por CPF (se existir na planilha)
        if (cpfClean && existingCpfs.has(cpfClean)) {
            duplicatesCount++;
            continue;
        }
        // 2. Por Nome (se não tiver CPF ou CPF for novo, checa o nome)
        if (existingNames.has(name.toLowerCase())) {
            duplicatesCount++;
            continue;
        }

        const allowTabRaw = row[8]?.toString().toUpperCase();
        const allowTab = allowTabRaw === 'S' || allowTabRaw === 'SIM' || allowTabRaw === 'Y' || allowTabRaw === 'YES';

        const newCustomer: Customer = {
            id: Math.random().toString(36).substr(2, 9), // ID temporário, o backend/App pode gerar o real ou o Supabase
            avatarText: name.substring(0, 2).toUpperCase(),
            name: name,
            phone: row[1]?.toString() || '',
            // row[2] Telefone extra poderia ir para notes ou outro campo
            address: row[3]?.toString() || '',
            complement: row[4]?.toString() || '',
            email: row[5]?.toString() || '',
            cpf: row[6]?.toString() || '',
            notes: row[7]?.toString() || '',
            allowTab: allowTab,
            balance: 0,
            createdAt: new Date().toISOString()
        };

        candidates.push(newCustomer);
    }

    setStats({
        total: rows.length - 1, // Total na planilha (menos cabeçalho)
        new: candidates.length,
        duplicates: duplicatesCount
    });
    setCustomersToImport(candidates);
    setStep('preview');
  };

  const executeImport = async () => {
      setStep('importing');
      await onImport(customersToImport);
      setStep('success');
  };

  const handleClose = () => {
      setStep('upload');
      setStats({ total: 0, new: 0, duplicates: 0 });
      setCustomersToImport([]);
      onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[80] transition-opacity backdrop-blur-sm" onClick={handleClose} />
      
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-[90] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header com X */}
        <div className="flex justify-end p-4">
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="px-8 pb-8 text-center">
            
            {/* Ícone Central */}
            <div className="flex justify-center mb-4">
                <div className="relative">
                    <img 
                        src="https://cdn-icons-png.flaticon.com/512/1256/1256650.png" 
                        alt="Import Users" 
                        className="w-24 h-24 opacity-80"
                        style={{ filter: 'grayscale(100%)' }} // Simulating the grey icon style
                    />
                    {step === 'success' && (
                        <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 border-4 border-white">
                            <CheckCircle className="text-white" size={24} />
                        </div>
                    )}
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-700 mb-2">Importar clientes</h2>
            
            {step === 'upload' && (
                <>
                    <p className="text-gray-500 text-sm mb-8 px-4 leading-relaxed">
                        Use este recurso para cadastrar vários clientes de uma só vez usando uma planilha Excel.
                    </p>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".xlsx, .xls, .csv" 
                        className="hidden" 
                    />

                    <div className="grid grid-cols-1 gap-4">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-3.5 px-4 bg-white border border-gray-300 hover:border-[#2dd4bf] text-slate-700 font-bold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
                        >
                            <UploadCloud className="text-slate-400 group-hover:text-[#2dd4bf] transition-colors" size={20} />
                            Importar novos
                        </button>
                        
                        {/* Botão desativado visualmente apenas para replicar o layout, mas focado na ação principal */}
                        <button 
                            disabled 
                            className="w-full py-3.5 px-4 bg-gray-50 border border-gray-200 text-gray-400 font-bold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Atualizar existentes
                        </button>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-2">Formatos suportados: .xlsx, .xls</p>
                        <button 
                            onClick={handleDownloadTemplate}
                            className="text-xs text-[#2dd4bf] font-bold hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                            <FileSpreadsheet size={12} />
                            Baixar modelo de planilha
                        </button>
                    </div>
                </>
            )}

            {step === 'preview' && (
                <div className="animate-in slide-in-from-bottom-2">
                    <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100 text-left space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">Linhas na planilha:</span>
                            <span className="font-bold text-slate-700">{stats.total}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-amber-500 flex items-center gap-1"><AlertCircle size={14}/> Duplicados (Ignorados):</span>
                            <span className="font-bold text-amber-600">{stats.duplicates}</span>
                        </div>
                        <div className="h-px bg-slate-200 my-2"></div>
                        <div className="flex justify-between items-center text-lg">
                            <span className="text-[#2dd4bf] font-bold">Novos Clientes:</span>
                            <span className="font-bold text-[#2dd4bf]">{stats.new}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setStep('upload')}
                            className="flex-1 py-3 bg-white border border-gray-300 text-slate-600 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Voltar
                        </button>
                        <button 
                            onClick={executeImport}
                            disabled={stats.new === 0}
                            className={`flex-1 py-3 font-bold rounded-lg text-white transition-colors ${
                                stats.new === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#2dd4bf] hover:bg-[#14b8a6] shadow-lg shadow-teal-500/30'
                            }`}
                        >
                            Confirmar Importação
                        </button>
                    </div>
                </div>
            )}

            {step === 'importing' && (
                <div className="py-8">
                    <Loader2 className="w-12 h-12 text-[#2dd4bf] animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Processando importação...</p>
                    <p className="text-slate-400 text-sm mt-2">Por favor, aguarde.</p>
                </div>
            )}

            {step === 'success' && (
                <div className="py-4 animate-in zoom-in duration-300">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Sucesso!</h3>
                    <p className="text-slate-500 mb-6">
                        {stats.new} clientes foram importados corretamente para sua base.
                    </p>
                    <button 
                        onClick={handleClose}
                        className="w-full py-3 bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold rounded-lg shadow-lg transition-colors"
                    >
                        Concluir
                    </button>
                </div>
            )}

        </div>
      </div>
    </>
  );
};

export default CustomerImportModal;
