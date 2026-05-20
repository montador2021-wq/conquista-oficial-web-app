import { createClient } from '@supabase/supabase-js';
import { User, AccessLog } from './types';
import { Sale, Targets, Customer, Opportunity } from '../tipos';

// Get Supabase URLs from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xddbmmjdhdtcuhwzdyij.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gUrEOGScjTyp2LFyAvNi0w_9hKMSIb7';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// MAPPERS: Translate snake_case (Postgres) <-> camelCase (React Code)
// ==========================================

export const mapUserToDb = (u: User) => ({
  id: u.id,
  email: u.email || null,
  first_name: u.firstName,
  last_name: u.lastName,
  store: u.store,
  password: u.password,
  role: u.role,
  photo_url: u.photoUrl || null,
  last_login: u.lastLogin || null
});

export const mapDbToUser = (row: any): User => ({
  id: row.id,
  email: row.email || undefined,
  firstName: row.first_name,
  lastName: row.last_name,
  store: row.store,
  password: row.password,
  role: row.role as 'vendedor' | 'admin',
  photoUrl: row.photo_url || undefined,
  lastLogin: row.last_login || undefined
});

export const mapSaleToDb = (s: Sale) => ({
  id: s.id,
  numero_pedido: s.numeroPedido,
  vendedor_id: s.vendedorId || null,
  cliente_id: s.clienteId || null,
  valor_produto: s.valorProduto,
  valor_assistencia: s.valorAssistencia,
  valor_impermeabilizacao: s.valorImpermeabilizacao,
  total: s.total,
  data: s.data,
  timestamp: s.timestamp,
  bonus_total: s.bonusTotal,
  comissao_produto: s.comissaoProduto,
  servicos_extras: s.servicosExtras || [],
  status: s.status || 'ativo'
});

export const mapDbToSale = (row: any): Sale => ({
  id: row.id,
  numeroPedido: row.numero_pedido,
  vendedorId: row.vendedor_id || undefined,
  clienteId: row.cliente_id || undefined,
  valorProduto: Number(row.valor_produto || 0),
  valorAssistencia: Number(row.valor_assistencia || 0),
  valorImpermeabilizacao: Number(row.valor_impermeabilizacao || 0),
  total: Number(row.total || 0),
  data: row.data,
  timestamp: Number(row.timestamp || Date.now()),
  bonusTotal: Number(row.bonus_total || 0),
  comissaoProduto: Number(row.comissao_produto || 0),
  servicosExtras: row.servicos_extras || [],
  status: row.status as 'ativo' | 'cancelado'
});

export const mapCustomerToDb = (c: Customer) => ({
  id: c.id,
  nome: c.nome,
  email: c.email || null,
  telefone: c.telefone || null,
  cpf: c.cpf || null,
  endereco: c.endereco || null,
  data_cadastro: c.dataCadastro,
  total_comprado: c.totalComprado,
  pedidos_count: c.pedidosCount,
  vendedor_id: c.vendedorId || null,
  interesse: c.interesse || null,
  data_retorno: c.dataRetorno || null,
  status_retorno: c.statusRetorno || 'pendente'
});

export const mapDbToCustomer = (row: any): Customer => ({
  id: row.id,
  nome: row.nome,
  email: row.email || undefined,
  telefone: row.telefone || undefined,
  cpf: row.cpf || undefined,
  endereco: row.endereco || undefined,
  dataCadastro: row.data_cadastro,
  totalComprado: Number(row.total_comprado || 0),
  pedidosCount: Number(row.pedidos_count || 0),
  vendedorId: row.vendedor_id || undefined,
  interesse: row.interesse || undefined,
  dataRetorno: row.data_retorno || undefined,
  statusRetorno: row.status_retorno as 'pendente' | 'finalizado'
});

export const mapOpportunityToDb = (o: Opportunity) => ({
  id: o.id,
  title: o.title,
  type: o.type || null,
  value: o.value || 0,
  days_ago: o.daysAgo || 0,
  stage: o.stage || 'lead',
  vendedor_id: o.vendedorId || null,
  user_info: o.user || {},
  tags: o.tags || [],
  phone: o.phone || null,
  return_date: o.returnDate || null,
  product_interest: o.productInterest || null
});

export const mapDbToOpportunity = (row: any): Opportunity => ({
  id: row.id,
  title: row.title,
  type: row.type || '',
  value: Number(row.value || 0),
  daysAgo: Number(row.days_ago || 0),
  stage: row.stage || 'lead',
  vendedorId: row.vendedor_id || undefined,
  user: {
    name: row.user_info?.name || 'Vendedor',
    avatar: row.user_info?.avatar || ''
  },
  tags: row.tags || [],
  phone: row.phone || undefined,
  returnDate: row.return_date || undefined,
  productInterest: row.product_interest || undefined
});

export const mapTargetsToDb = (targetId: string, t: Targets) => ({
  id: targetId,
  product: t.product,
  assistance: t.assistance,
  waterproofing: t.waterproofing,
  product_commission_rate: t.productCommissionRate || 2.2,
  meta_ativacao: t.metaAtivacao,
  premiacao_extra: t.premiacaoExtra,
  service_bonuses: t.serviceBonuses,
  levels: t.levels,
  bonus_por_pedido: t.bonusPorPedido || { ativo: false, valor: 5 }
});

export const mapDbToTargets = (row: any): Targets => ({
  product: Number(row.product || 0),
  assistance: Number(row.assistance || 0),
  waterproofing: Number(row.waterproofing || 0),
  productCommissionRate: Number(row.product_commission_rate || 2.2),
  metaAtivacao: {
    product: row.meta_ativacao?.product ?? true,
    assistance: row.meta_ativacao?.assistance ?? true,
    waterproofing: row.meta_ativacao?.waterproofing ?? true
  },
  premiacaoExtra: {
    metaValor: Number(row.premiacao_extra?.metaValor || 20000),
    valorPremio: Number(row.premiacao_extra?.valorPremio || 100),
    ativo: Boolean(row.premiacao_extra?.ativo),
    dataInicio: row.premiacao_extra?.dataInicio || '',
    dataFim: row.premiacao_extra?.dataFim || ''
  },
  serviceBonuses: {
    montagem: Number(row.service_bonuses?.montagem || 10),
    lavagem: Number(row.service_bonuses?.lavagem || 40),
    almofada: Number(row.service_bonuses?.almofada || 10),
    pes_guarda_roupa: Number(row.service_bonuses?.pes_guarda_roupa || 7),
    impermeabilizacao_bonus: Number(row.service_bonuses?.impermeabilizacao_bonus || 40)
  },
  levels: {
    1: {
      threshold: Number(row.levels?.['1']?.threshold || 100),
      rate: Number(row.levels?.['1']?.rate || 0.6)
    },
    2: {
      threshold: Number(row.levels?.['2']?.threshold || 120),
      rate: Number(row.levels?.['2']?.rate || 0.8)
    },
    3: {
      threshold: Number(row.levels?.['3']?.threshold || 140),
      rate: Number(row.levels?.['3']?.rate || 1.1)
    }
  },
  bonusPorPedido: {
    ativo: Boolean(row.bonus_por_pedido?.ativo),
    valor: Number(row.bonus_por_pedido?.valor || 5)
  }
});

export const mapAccessLogToDb = (l: AccessLog) => ({
  id: l.id,
  user_id: l.userId,
  user_name: l.userName,
  store: l.store,
  timestamp: l.timestamp,
  action: l.action
});

export const mapDbToAccessLog = (row: any): AccessLog => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  store: row.store || '',
  timestamp: row.timestamp,
  action: row.action as any
});

// ==========================================
// DATABASE OPERATIONS
// ==========================================

export const dbSupabase = {
  // Users
  async getUser(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return null; // Entity not found
        throw error;
      }
      return mapDbToUser(data);
    } catch (e) {
      console.error('Supabase error retrieving user:', e);
      return null;
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).limit(1);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return mapDbToUser(data[0]);
    } catch (e) {
      console.error('Supabase error retrieving user by email:', e);
      return null;
    }
  },

  async listUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase.from('users').select('*').order('first_name');
      if (error) throw error;
      return (data || []).map(mapDbToUser);
    } catch (e) {
      console.error('Supabase error listing users:', e);
      return [];
    }
  },

  async upsertUser(user: User): Promise<void> {
    try {
      const dbRow = mapUserToDb(user);
      const { error } = await supabase.from('users').upsert(dbRow);
      if (error) throw error;
      console.log('Supabase: synced user successfully', user.id);
    } catch (e) {
      console.error('Supabase error upserting user:', e);
    }
  },

  // Settings / Targets
  async getTargets(id: string): Promise<Targets | null> {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', id).single();
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return mapDbToTargets(data);
    } catch (e) {
      console.error('Supabase error retrieving targets:', e);
      return null;
    }
  },

  async upsertTargets(id: string, targets: Targets): Promise<void> {
    try {
      const dbRow = mapTargetsToDb(id, targets);
      const { error } = await supabase.from('settings').upsert(dbRow);
      if (error) throw error;
      console.log('Supabase: synced targets successfully', id);
    } catch (e) {
      console.error('Supabase error upserting targets:', e);
    }
  },

  // Customers
  async listCustomers(vendedorId?: string, isAdmin?: boolean): Promise<Customer[]> {
    try {
      let query = supabase.from('customers').select('*').order('nome');
      if (vendedorId && !isAdmin) {
        query = query.eq('vendedor_id', vendedorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapDbToCustomer);
    } catch (e) {
      console.error('Supabase error listing customers:', e);
      return [];
    }
  },

  async upsertCustomer(customer: Customer): Promise<void> {
    try {
      const dbRow = mapCustomerToDb(customer);
      const { error } = await supabase.from('customers').upsert(dbRow);
      if (error) throw error;
      console.log('Supabase: synced customer successfully', customer.id);
    } catch (e) {
      console.error('Supabase error upserting customer:', e);
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      console.log('Supabase: deleted customer successfully', id);
    } catch (e) {
      console.error('Supabase error deleting customer:', e);
    }
  },

  // Sales
  async listSales(vendedorId?: string, isAdmin?: boolean, viewingSellerId?: string | null): Promise<Sale[]> {
    try {
      let query = supabase.from('sales').select('*').order('timestamp', { ascending: false });
      
      if (!isAdmin && vendedorId) {
        query = query.eq('vendedor_id', vendedorId);
      } else if (isAdmin && viewingSellerId) {
        query = query.eq('vendedor_id', viewingSellerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapDbToSale);
    } catch (e) {
      console.error('Supabase error listing sales:', e);
      return [];
    }
  },

  async upsertSale(sale: Sale): Promise<void> {
    try {
      const dbRow = mapSaleToDb(sale);
      const { error } = await supabase.from('sales').upsert(dbRow);
      if (error) throw error;
      console.log('Supabase: synced sale successfully', sale.id);
    } catch (e) {
      console.error('Supabase error upserting sale:', e);
    }
  },

  async deleteSale(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('sales').delete().eq('id', id);
      if (error) throw error;
      console.log('Supabase: deleted sale successfully', id);
    } catch (e) {
      console.error('Supabase error deleting sale:', e);
    }
  },

  // Opportunities
  async listOpportunities(vendedorId?: string, isAdmin?: boolean, viewingSellerId?: string | null): Promise<Opportunity[]> {
    try {
      let query = supabase.from('opportunities').select('*').order('created_at', { ascending: false });
      
      if (!isAdmin && vendedorId) {
        query = query.eq('vendedor_id', vendedorId);
      } else if (isAdmin && viewingSellerId) {
        query = query.eq('vendedor_id', viewingSellerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapDbToOpportunity);
    } catch (e) {
      console.error('Supabase error listing opportunities:', e);
      return [];
    }
  },

  async upsertOpportunity(opp: Opportunity): Promise<void> {
    try {
      const dbRow = mapOpportunityToDb(opp);
      const { error } = await supabase.from('opportunities').upsert(dbRow);
      if (error) throw error;
      console.log('Supabase: synced opportunity successfully', opp.id);
    } catch (e) {
      console.error('Supabase error upserting opportunity:', e);
    }
  },

  async deleteOpportunity(id: string): Promise<void> {
    try {
      const { error } = await supabase.from('opportunities').delete().eq('id', id);
      if (error) throw error;
      console.log('Supabase: deleted opportunity successfully', id);
    } catch (e) {
      console.error('Supabase error deleting opportunity:', e);
    }
  },

  // Access Logs
  async logAccess(log: AccessLog): Promise<void> {
    try {
      const dbRow = mapAccessLogToDb(log);
      const { error } = await supabase.from('access_logs').upsert(dbRow);
      if (error) throw error;
      console.log('Supabase: saved access log successfully', log.id);
    } catch (e) {
      console.error('Supabase error saving access log:', e);
    }
  },

  async listAccessLogs(): Promise<AccessLog[]> {
    try {
      const { data, error } = await supabase.from('access_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map(mapDbToAccessLog);
    } catch (e) {
      console.error('Supabase error listing access logs:', e);
      return [];
    }
  }
};
