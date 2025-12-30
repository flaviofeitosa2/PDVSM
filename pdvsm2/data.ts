
import { Product, Customer } from './types';

export const products: Product[] = [
  {
    id: '1',
    code: '001',
    name: '2a Via de Contas',
    category: 'Serviços',
    price: 1.00,
    image: 'https://picsum.photos/id/1/80/80',
    stock: 999,
    min_stock: 10,
    manage_stock: false,
    is_catalog: true,
    is_favorite: true
  },
  {
    id: '2',
    code: '004',
    name: 'Impressão Colorida',
    category: 'Impressão',
    price: 2.00,
    image: 'https://picsum.photos/id/24/80/80',
    stock: 500,
    min_stock: 50,
    manage_stock: true,
    is_catalog: false,
    is_favorite: true
  },
  {
    id: '3',
    code: '005',
    name: 'Impressão Preto e Branco',
    category: 'Impressão',
    price: 1.00,
    image: 'https://picsum.photos/id/119/80/80',
    stock: 1000,
    min_stock: 100,
    manage_stock: true,
    is_catalog: false,
    is_favorite: true
  }
];

export const categories = [
  { id: 'all', name: 'Todas as categorias' },
  { id: 'Serviços', name: 'Serviços' },
  { id: 'Impressão', name: 'Impressão' },
  { id: 'Cópia', name: 'Cópia' },
  { id: 'Acessórios', name: 'Acessórios' },
];

export const customers: Customer[] = [
  {
    id: '1',
    avatarText: '17',
    name: '17 - OUT - SIMONE DEOSDEDE MOURA - APLICASIMPER',
    phone: '+55 (81) 99145-1395',
    email: 'adm@casimper.com.br',
    balance: 0.00,
    createdAt: '2025-10-17T18:04:00',
    notes: 'PAGO NU: APLICA SIMPER',
    cpf: '09.423.111/0001-85'
  }
];
