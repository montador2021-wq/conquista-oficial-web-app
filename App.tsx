
import React, { useState, useEffect, useMemo } from 'react';
import { User, AccessLog } from './src/types';
import SaleForm from './components/SaleForm';
import Settings from './components/Settings';
import Customers from './components/Customers';
import Header from './components/Header';
import InstallPrompt from './components/InstallPrompt';
import OpportunityForm from './components/OpportunityForm';
import OpportunityEditForm from './components/OpportunityEditForm';
import Login from './components/Login';
import { ToastContainer, ToastType } from './components/ui/Toast';
import { NavItem, Sale, Targets, WeeklyPerformance, DashboardStats, Customer, Opportunity } from './tipos';
import { PIPELINE_STAGES, MOCK_OPPORTUNITIES, NAVIGATION_ITEMS } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from './src/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { 
  Plus, 
  Wrench, 
  Droplets, 
  Layers, 
  Layout, 
  Star, 
  ShieldCheck, 
  Zap, 
  Target,
  CloudLightning,
  Wifi,
  WifiOff,
  BarChart,
  Phone,
  MessageCircle,
  CheckSquare,
  Cpu,
  Smartphone,
  X,
  RotateCcw,
  Database,
  Clock,
  Users,
  Home,
  Gem,
  DollarSign,
  Trophy,
  Award,
  Files,
  ShoppingBag,
  Search,
  List,
  LogOut,
  Settings as SettingsIcon
} from 'lucide-react';

import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const STORAGE_KEY = 'conquista_app_data_v1';
const TARGETS_KEY = 'conquista_app_targets_v1';
const CUSTOMERS_KEY = 'conquista_app_customers_v1';
const OPPORTUNITIES_KEY = 'conquista_app_opportunities_v1';

const DEFAULT_TARGETS: Targets = {
  product: 50000,
  assistance: 3000,
  waterproofing: 2000,
  productCommissionRate: 2.2,
  serviceBonuses: {
    montagem: 10,
    lavagem: 40,
    almofada: 10,
    pes_guarda_roupa: 7,
    impermeabilizacao_bonus: 40
  },
  levels: {
    1: { threshold: 100, rate: 0.6 },
    2: { threshold: 120, rate: 0.8 },
    3: { threshold: 140, rate: 1.1 }
  },
  bonusPorPedido: {
    ativo: false,
    valor: 5
  },
  metaAtivacao: {
    product: true,
    assistance: true,
    waterproofing: true
  },
  premiacaoExtra: {
    metaValor: 20000,
    valorPremio: 100,
    ativo: false,
    dataInicio: '',
    dataFim: ''
  }
};

const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>(NavItem.Resumos);
  const [clickingNavItem, setClickingNavItem] = useState<NavItem | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 

  const navigateWithFeedback = (navItem: NavItem) => {
    if (clickingNavItem) return;
    setClickingNavItem(navItem);
    setTimeout(() => {
      setActiveNav(navItem);
      setClickingNavItem(null);
    }, 220); // 220ms is the perfect organic delay for seeing mechanical tap feedback
  };
  const [savedSales, setSavedSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isAddingOpportunity, setIsAddingOpportunity] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [reportPeriod, setReportPeriod] = useState<number>(30); // Dias
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [targets, setTargets] = useState<Targets>(() => {
    const saved = localStorage.getItem(TARGETS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_TARGETS;
  });
  
  // Toast State
  const [toasts, setToasts] = useState<{ id: string, type: ToastType, message: string }[]>([]);
  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 5000);
  };
  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const logAccess = async (currentUser: User) => {
    if (currentUser.id === 'anon-default') return;
    
    // O administrador entra em modo silencioso / 100% invisível no monitoramento
    if (currentUser.email === 'montador2021@gmail.com') return;
    
    const logId = crypto.randomUUID();
    const log: AccessLog = {
      id: logId,
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      store: currentUser.store,
      timestamp: new Date().toISOString(),
      action: 'access'
    };

    try {
      await setDoc(doc(db, 'access_logs', logId), log);
      // Atualizar lastLogin do usuário
      await setDoc(doc(db, 'users', currentUser.id), { lastLogin: log.timestamp }, { merge: true });
    } catch (err) {
      console.error("Erro ao registrar acesso:", err);
    }
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const isAdmin = user?.email === 'montador2021@gmail.com' || user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [viewingVendedorId, setViewingVendedorId] = useState<string | null>(null);
  const [vendedores, setVendedores] = useState<User[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    localStorage.setItem('currentUser', JSON.stringify(loggedUser));
    logAccess(loggedUser);
  };

  const addOpportunity = async (oppData: Omit<Opportunity, 'id' | 'daysAgo' | 'user' | 'tags'>) => {
    console.log("Adicionando nova oportunidade:", oppData);
    try {
      const newOpp: Opportunity = {
        ...oppData,
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        vendedorId: user?.id || 'unknown',
        daysAgo: 0,
        user: { name: user?.firstName || 'Admin', avatar: user?.photoUrl || 'https://picsum.photos/seed/u1/40/40' },
        tags: []
      };

      // Atualizar estado local imediatamente
      setOpportunities(prev => {
        const updated = [newOpp, ...(Array.isArray(prev) ? prev : [])];
        localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(updated));
        return updated;
      });
      setIsAddingOpportunity(false);

      // Sincronizar com Firestore
      console.log("Sincronizando oportunidade com Firestore...");
      try {
        await setDoc(doc(db, 'opportunities', newOpp.id), newOpp);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `opportunities/${newOpp.id}`);
      }
      showToast('Card adicionado ao seu pipeline!', 'success');
      console.log("Oportunidade sincronizada com sucesso!");
    } catch (error) {
      console.error("Erro geral ao adicionar oportunidade:", error);
      showToast('Erro ao salvar no servidor. O card está salvo localmente.', 'error');
    }
  };

  const saveOpportunity = async (updatedOpp: Opportunity) => {
    // Atualizar estado local imediatamente
    setOpportunities(prev => {
      const updated = prev.map(opp => opp.id === updatedOpp.id ? updatedOpp : opp);
      localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(updated));
      return updated;
    });
    setEditingOpportunity(null);

    // Sincronizar com Firestore
    try {
      try {
        await setDoc(doc(db, 'opportunities', updatedOpp.id), updatedOpp);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `opportunities/${updatedOpp.id}`);
      }
    } catch (error) {
      console.error("Erro ao atualizar oportunidade no Firestore:", error);
    }
  };

  const handleNavSelect = (navItem: NavItem) => {
    navigateWithFeedback(navItem);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const email = firebaseUser.email;
          const fullName = firebaseUser.displayName || '';
          const firstName = fullName.split(' ')[0] || 'Vendedor';
          const lastName = fullName.split(' ').slice(1).join(' ') || 'Google';
          const photoUrl = firebaseUser.photoURL || '';

          // Let's get the user document from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let existingUser: User | null = null;
          try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              existingUser = userSnap.data() as User;
            } else if (email) {
              const q = query(collection(db, 'users'), where('email', '==', email));
              const snap = await getDocs(q);
              if (!snap.empty) {
                existingUser = snap.docs[0].data() as User;
              }
            }
          } catch (err: any) {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          }

          if (existingUser) {
            const loggedUser = existingUser as User;
            setUser(loggedUser);
            localStorage.setItem('currentUser', JSON.stringify(loggedUser));
            logAccess(loggedUser);
          } else {
            // New Google User - Auto Register
            const newUser: User = {
              id: firebaseUser.uid,
              email: email || undefined,
              firstName,
              lastName,
              store: 'Loja Google',
              password: 'oauth-protected',
              role: (email === 'montador2021@gmail.com') ? 'admin' : 'vendedor',
              lastLogin: new Date().toISOString(),
              photoUrl: photoUrl || "https://picsum.photos/seed/" + firebaseUser.uid + "/100/100"
            };
            try {
              await setDoc(doc(db, 'users', newUser.id), newUser);
            } catch (err: any) {
              handleFirestoreError(err, OperationType.CREATE, `users/${newUser.id}`);
            }
            setUser(newUser);
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            logAccess(newUser);
          }
        } else {
          // Fallback to localStorage (traditional login)
          const storedUser = localStorage.getItem('currentUser');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            logAccess(parsedUser);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Auth state change handling error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);
  
  // Monitorar conexão e PWA
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Sincronizar vendas pendentes
      const pending = JSON.parse(localStorage.getItem('pending_sales') || '[]');
      if (pending.length > 0) {
        for (const sale of pending) {
          try {
            try {
              await setDoc(doc(db, 'sales', sale.id), sale);
            } catch (err: any) {
              handleFirestoreError(err, OperationType.CREATE, `sales/${sale.id}`);
            }
            // Atualizar estatísticas do cliente se vinculado
            if (sale.clienteId) {
              const customer = customers.find(c => c.id === sale.clienteId);
              if (customer) {
                try {
                  await setDoc(doc(db, 'customers', sale.clienteId), {
                    totalComprado: (customer.totalComprado || 0) + sale.total,
                    pedidosCount: (customer.pedidosCount || 0) + 1
                  }, { merge: true });
                } catch (err: any) {
                  handleFirestoreError(err, OperationType.UPDATE, `customers/${sale.clienteId}`);
                }
              }
            }
          } catch (error) {
            console.error("Erro ao sincronizar venda pendente:", error);
            continue;
          }
        }
        localStorage.removeItem('pending_sales');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => setIsOnline(false));

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });
    
    // Carregar dados do Firestore com mais robustez
    const loadData = async () => {
      if (!user) return;

      // Se for admin, buscar lista de vendedores e logs de acesso
      if (isAdmin) {
        try {
          const vendedoresQuery = query(collection(db, 'users'));
          const snapVend = await getDocs(vendedoresQuery);
          const vendedoresData = snapVend.docs.map(d => d.data() as User);
          const filtered = vendedoresData.filter(v => v.email !== 'montador2021@gmail.com');
          setVendedores(filtered);
          
          const logsQuery = query(collection(db, 'access_logs'), orderBy('timestamp', 'desc'), limit(150));
          const snapLogs = await getDocs(logsQuery);
          const logsData = snapLogs.docs.map(d => d.data() as AccessLog);
          setAccessLogs(logsData);
        } catch (err: any) {
          console.error("Erro ao buscar dados do administrador:", err);
          handleFirestoreError(err, OperationType.LIST, 'access_logs');
        }
      }

      // Carregar do localStorage primeiro para rapidez
      const localOpps = localStorage.getItem(OPPORTUNITIES_KEY);
      if (localOpps) setOpportunities(JSON.parse(localOpps));
      
      console.log("Buscando dados no Firestore...");
      try {
        let salesQ = query(collection(db, 'sales'));
        
        // Se não for admin, filtra apenas as próprias vendas
        if (!isAdmin) {
          salesQ = query(collection(db, 'sales'), where('vendedorId', '==', user.id));
        } else if (viewingVendedorId) {
          salesQ = query(collection(db, 'sales'), where('vendedorId', '==', viewingVendedorId));
        }

        const salesSnap = await getDocs(salesQ);
        const salesData = salesSnap.docs.map(docSnap => docSnap.data());
        
        console.log("Vendas carregadas:", salesData);
        if (salesData) {
          const mappedSales = salesData.map((s: any) => ({
            ...s,
            id: s.id,
            vendedorId: s.vendedorId,
            clienteId: s.clienteId,
            numeroPedido: s.numeroPedido,
            valorProduto: s.valorProduto || 0,
            valorAssistencia: s.valorAssistencia || 0,
            valorImpermeabilizacao: s.valorImpermeabilizacao || 0,
            bonusTotal: s.bonusTotal || 0,
            comissaoProduto: s.comissaoProduto || 0,
            servicosExtras: Array.isArray(s.servicosExtras) ? s.servicosExtras : [],
            data: s.data || new Date(s.timestamp || Date.now()).toLocaleDateString('pt-BR'),
            timestamp: s.timestamp || Date.now(),
            status: s.status || 'ativo'
          }));
          setSavedSales(mappedSales as Sale[]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedSales));
        }
      } catch (err: any) {
        console.error("Erro ao buscar vendas:", err);
        handleFirestoreError(err, OperationType.LIST, 'sales');
      }

      try {
        // Tentar carregar do localStorage primeiro para resposta rápida
        const localTargetsRaw = localStorage.getItem(TARGETS_KEY);
        if (localTargetsRaw) {
          setTargets(JSON.parse(localTargetsRaw));
        }

        // Metas agora podem ser individuais ou globais. Vamos tentar buscar por vendedorId primeiro.
        const targetId = `targets_${user.id}`;
        let targetsData: any = null;
        try {
          const tSnap = await getDoc(doc(db, 'settings', targetId));
          if (tSnap.exists()) {
            targetsData = tSnap.data();
          } else {
            // Se não tiver individual, tenta a global
            const gSnap = await getDoc(doc(db, 'settings', 'targets'));
            if (gSnap.exists()) {
              targetsData = gSnap.data();
            }
          }
        } catch (err: any) {
          handleFirestoreError(err, OperationType.GET, `settings/${targetId}`);
        }

        if (targetsData) {
          const mergedTargets: Targets = {
            ...DEFAULT_TARGETS,
            ...targetsData,
            product: Number(targetsData.product ?? DEFAULT_TARGETS.product),
            assistance: Number(targetsData.assistance ?? DEFAULT_TARGETS.assistance),
            waterproofing: Number(targetsData.waterproofing ?? DEFAULT_TARGETS.waterproofing),
            metaAtivacao: { 
              product: targetsData.metaAtivacao?.product ?? DEFAULT_TARGETS.metaAtivacao.product,
              assistance: targetsData.metaAtivacao?.assistance ?? DEFAULT_TARGETS.metaAtivacao.assistance,
              waterproofing: targetsData.metaAtivacao?.waterproofing ?? DEFAULT_TARGETS.metaAtivacao.waterproofing,
            },
            premiacaoExtra: { ...DEFAULT_TARGETS.premiacaoExtra, ...(targetsData.premiacaoExtra || {}) },
            serviceBonuses: { ...DEFAULT_TARGETS.serviceBonuses, ...(targetsData.serviceBonuses || {}) },
            levels: { ...DEFAULT_TARGETS.levels, ...(targetsData.levels || {}) },
            bonusPorPedido: { ...DEFAULT_TARGETS.bonusPorPedido, ...(targetsData.bonusPorPedido || { ativo: false, valor: 5 }) }
          };
          setTargets(mergedTargets);
          localStorage.setItem(TARGETS_KEY, JSON.stringify(mergedTargets));
        }
      } catch (err) {
        console.error("Erro ao buscar metas:", err);
      }

      try {
        let customersQ = query(collection(db, 'customers'));
        if (!isAdmin) {
          customersQ = query(collection(db, 'customers'), where('vendedorId', '==', user.id));
        } else if (viewingVendedorId) {
          customersQ = query(collection(db, 'customers'), where('vendedorId', '==', viewingVendedorId));
        }

        const custSnap = await getDocs(customersQ);
        const customersData = custSnap.docs.map(docSnap => docSnap.data());
        
        if (customersData) {
          const mappedCustomers = customersData.map((c: any) => ({
            ...c,
            id: c.id,
            vendedorId: c.vendedorId,
            totalComprado: Number(c.totalComprado || 0),
            pedidosCount: Number(c.pedidosCount || 0)
          }));
          setCustomers(mappedCustomers as Customer[]);
          localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(mappedCustomers));
        }
      } catch (err: any) {
        console.error("Erro ao buscar clientes:", err);
        handleFirestoreError(err, OperationType.LIST, 'customers');
      }
      
      try {
        console.log("Buscando oportunidades no Firestore...");
        let oppsQ = query(collection(db, 'opportunities'));
        if (!isAdmin) {
          oppsQ = query(collection(db, 'opportunities'), where('vendedorId', '==', user.id));
        } else if (viewingVendedorId) {
          oppsQ = query(collection(db, 'opportunities'), where('vendedorId', '==', viewingVendedorId));
        }

        const oppsSnap = await getDocs(oppsQ);
        const oppsData = oppsSnap.docs.map(docSnap => docSnap.data());
        
        if (oppsData) {
          console.log("Oportunidades brutas do DB:", oppsData);
          const mappedOpps = oppsData.map((o: any) => {
            const vId = o.vendedorId || 'unknown';
            const pInt = o.productInterest || '';
            const rDate = o.returnDate || '';
            const title = o.title || 'Sem título';
            const stage = o.stage || 'lead';
            
            return {
              ...o,
              id: o.id,
              title,
              stage,
              productInterest: pInt,
              returnDate: rDate,
              vendedorId: vId,
              value: Number(o.value || 0),
              user: (o.user || { name: user.firstName, avatar: user.photoUrl || 'https://picsum.photos/seed/u1/40/40' }),
              tags: Array.isArray(o.tags) ? o.tags : []
            };
          });
          
          console.log("Oportunidades mapeadas finais:", mappedOpps);
          setOpportunities(mappedOpps as Opportunity[]);
          localStorage.setItem(OPPORTUNITIES_KEY, JSON.stringify(mappedOpps));
        }
      } catch (err: any) {
        console.error("Erro ao buscar oportunidades:", err);
        handleFirestoreError(err, OperationType.LIST, 'opportunities');
      }
    };

    if (user) {
      loadData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', () => setIsOnline(false));
    };
  }, [user, viewingVendedorId, isAdmin]);

  const filteredSales = useMemo(() => {
    return savedSales.filter(sale => sale.status !== 'cancelado');
  }, [savedSales]);

  const filteredOpportunities = useMemo(() => {
    return opportunities;
  }, [opportunities]);

  const saveTargets = async (newTargets: Targets) => {
    try {
      console.log("Iniciando salvamento de metas:", newTargets);
      const targetId = (user && user.id !== 'user-default') ? `targets_${user.id}` : 'targets';
      
      // 1. Salva no localStorage IMEDIATAMENTE (Offline-first approach)
      localStorage.setItem(TARGETS_KEY, JSON.stringify(newTargets));
      setTargets(newTargets);
      
      // 2. Redirecionar imediatamente para dar feedback instantâneo ao usuário
      showToast('Configurações salvas localmente!', 'success');
      setActiveNav(NavItem.Resumos);

      // 3. Sincronizar com Firestore em background (sem await para não travar a UI)
      (async () => {
        try {
          try {
            await setDoc(doc(db, 'settings', targetId), { id: targetId, ...newTargets });
          } catch (err: any) {
            handleFirestoreError(err, OperationType.CREATE, `settings/${targetId}`);
          }
          console.log("Metas sincronizadas com sucesso no Firestore");
        } catch (err) {
          console.error("Erro crítico na sincronização em background:", err);
        }
      })();
      
    } catch (error) {
      console.error("Erro crítico ao salvar metas:", error);
      showToast('Erro ao processar salvamento.', 'error');
      // Fallback de segurança garantindo que pelo menos localmente funcione e saia da tela
      localStorage.setItem(TARGETS_KEY, JSON.stringify(newTargets));
      setTargets(newTargets);
      setActiveNav(NavItem.Resumos);
    }
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const cancelSale = async (sale: Sale) => {
    // Atualizar estado local IMEDIATAMENTE
    setSavedSales(prev => {
      const updated = prev.map(s => (s.id === sale.id || (s.numeroPedido === sale.numeroPedido && !s.id)) ? { ...s, status: 'cancelado' } : s);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // Se for um pedido pendente (sem ID), remove do localStorage de pendentes também
    if (!sale.id) {
      const pending = JSON.parse(localStorage.getItem('pending_sales') || '[]');
      const updatedPending = pending.filter((s: Sale) => s.numeroPedido !== sale.numeroPedido);
      localStorage.setItem('pending_sales', JSON.stringify(updatedPending));
      return;
    }

    try {
      console.log("Sincronizando cancelamento em background:", sale.id);
      try {
        await setDoc(doc(db, 'sales', sale.id), { status: 'cancelado' }, { merge: true });
        console.log("Cancelamento sincronizado com sucesso!");
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `sales/${sale.id}`);
      }
    } catch (error) {
      console.error("Erro estrutural ao cancelar venda:", error);
    }
  };

  const deleteSale = async (sale: Sale) => {
    // Atualizar estado local IMEDIATAMENTE
    setSavedSales(prev => {
      const updated = prev.filter(s => (s.id !== sale.id && (s.numeroPedido !== sale.numeroPedido || s.id)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setSaleToDelete(null);

    if (!sale.id) {
      const pending = JSON.parse(localStorage.getItem('pending_sales') || '[]');
      const updatedPending = pending.filter((s: Sale) => s.numeroPedido !== sale.numeroPedido);
      localStorage.setItem('pending_sales', JSON.stringify(updatedPending));
      return;
    }

    try {
      console.log("Sincronizando exclusão em background:", sale.id);
      try {
        await deleteDoc(doc(db, 'sales', sale.id));
        console.log("Exclusão sincronizada com sucesso!");
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `sales/${sale.id}`);
      }
    } catch (error) {
      console.error("Erro estrutural ao excluir venda:", error);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('currentUser');
    await signOut(auth);
    setUser(null);
    window.location.reload();
  };

  const saveSale = async (newSaleData: any) => {
    console.log("Iniciando salvamento offline-first...");
    
    let saleDate = new Date();
    let saleDateStr = saleDate.toLocaleDateString('pt-BR');
    let saleTimestamp = saleDate.getTime();

    if (newSaleData.customDate) {
      const [year, month, day] = newSaleData.customDate.split('-').map(Number);
      const customDateObj = new Date(year, month - 1, day);
      saleDateStr = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
      saleTimestamp = customDateObj.getTime();
    }

    const saleId = crypto.randomUUID();
    const saleObj: Sale = {
      id: saleId,
      numeroPedido: newSaleData.pedido,
      vendedorId: user?.id || 'unknown',
      clienteId: newSaleData.clienteId || null,
      valorProduto: newSaleData.produto,
      valorAssistencia: newSaleData.assistencia,
      valorImpermeabilizacao: newSaleData.impermeabilizacao,
      total: newSaleData.total,
      bonusTotal: newSaleData.bonusTotal,
      comissaoProduto: newSaleData.comissaoProduto,
      servicosExtras: newSaleData.servicosExtras,
      data: saleDateStr,
      timestamp: saleTimestamp,
      status: 'ativo'
    };

    // 1. Salvar localmente IMEDIATAMENTE
    setSavedSales(prev => [saleObj, ...prev]);
    const currentSales = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    localStorage.setItem(STORAGE_KEY, JSON.stringify([saleObj, ...currentSales]));
    
    // 2. Redirecionar imediatamente
    setActiveNav(NavItem.ResumoPedido);

    // 3. Tentar sincronizar com Firestore
    try {
      console.log("Tentando sincronizar com Firestore...");
      try {
        await setDoc(doc(db, 'sales', saleId), saleObj);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `sales/${saleId}`);
      }
      console.log("Sincronizado com sucesso!");
    } catch (error) {
      console.warn("Erro ao sincronizar, salvando para depois:", error);
      const pending = JSON.parse(localStorage.getItem('pending_sales') || '[]');
      localStorage.setItem('pending_sales', JSON.stringify([...pending, saleObj]));
    }
  };

  const formatBRL = (val: any) => {
    const num = typeof val === 'number' ? val : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const stats = useMemo<DashboardStats>(() => {
    const activeSales = savedSales.filter(s => s.status !== 'cancelado');
    const pTotal = activeSales.reduce((acc, s) => acc + s.valorProduto, 0);
    const aTotal = activeSales.reduce((acc, s) => acc + s.valorAssistencia, 0);
    const iTotal = activeSales.reduce((acc, s) => acc + s.valorImpermeabilizacao, 0);
    
    // Check activations
    const isPActive = targets.metaAtivacao?.product ?? true;
    const isAActive = targets.metaAtivacao?.assistance ?? true;
    const isIActive = targets.metaAtivacao?.waterproofing ?? true;

    const pPerc = isPActive && targets.product > 0 ? (pTotal / targets.product) : 0;
    const aPerc = isAActive && targets.assistance > 0 ? (aTotal / targets.assistance) : 0;
    const iPerc = isIActive && targets.waterproofing > 0 ? (iTotal / targets.waterproofing) : 0;

    let level = 0;
    // Check only levels based on active metas? The requirement said "ou deixa os 2 ou os 3".
    // I will assume if a meta is inactivated, it's ignored in the "all three" type logic.
    [3, 2, 1].forEach(lvlNum => {
      if (level > 0) return;
      const lNum = lvlNum as 1 | 2 | 3;
      const thresh = targets.levels[lNum].threshold / 100;
      
      let allMetActive = true;
      if (isPActive && pPerc < thresh) allMetActive = false;
      if (isAActive && aPerc < thresh) allMetActive = false;
      if (isIActive && iPerc < thresh) allMetActive = false;
      
      if (allMetActive) level = lNum;
    });

    // ... (rest of the logic, need to be careful with variables)
    const serviceCounts = { 'Montagem': 0, 'Lavagem': 0, 'Almofada': 0, 'Pés G-Roupa': 0, 'Impermeab.': 0 };
    activeSales.forEach(s => {
      if (s.servicosExtras && Array.isArray(s.servicosExtras)) {
        s.servicosExtras.forEach(ex => { 
          if (Object.prototype.hasOwnProperty.call(serviceCounts, ex)) {
            (serviceCounts as any)[ex]++; 
          }
        });
      }
    });

    const totalExtras = Object.keys(serviceCounts).reduce((acc, k) => {
        let val = 0;
        if (k === 'Montagem') val = targets.serviceBonuses.montagem;
        if (k === 'Lavagem') val = targets.serviceBonuses.lavagem;
        if (k === 'Almofada') val = targets.serviceBonuses.almofada;
        if (k === 'Pés G-Roupa') val = targets.serviceBonuses.pes_guarda_roupa;
        if (k === 'Impermeab.') val = targets.serviceBonuses.impermeabilizacao_bonus;
        return acc + ((serviceCounts as any)[k] * val);
    }, 0);
    
    // Bonus por pedido (Configurado)
    const bonusPorPedidoTotal = targets.bonusPorPedido?.ativo 
        ? (activeSales.length * (targets.bonusPorPedido?.valor || 5)) 
        : 0;

    // Premiação Semanal (Configurado)
    const fatGeral = pTotal + aTotal + iTotal;
    let premiacaoExtraTotal = 0;
    if (targets.premiacaoExtra?.ativo && targets.premiacaoExtra.dataInicio && targets.premiacaoExtra.dataFim) {
        const [yS, mS, dS] = targets.premiacaoExtra.dataInicio.split('-').map(Number);
        const [yE, mE, dE] = targets.premiacaoExtra.dataFim.split('-').map(Number);
        
        const start = new Date(yS, mS - 1, dS);
        const end = new Date(yE, mE - 1, dE);
        
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        const filteredSales = activeSales.filter(s => {
             const [d, m, y] = s.data.split('/').map(Number);
             const saleDate = new Date(y, m - 1, d);
             return saleDate >= start && saleDate <= end;
        });

        const fatGeralBonusPeriod = filteredSales.reduce((acc, s) => acc + s.valorProduto + s.valorAssistencia + s.valorImpermeabilizacao, 0);

        if (fatGeralBonusPeriod >= (targets.premiacaoExtra.metaValor || 0)) {
            premiacaoExtraTotal = targets.premiacaoExtra.valorPremio || 0;
        }
    }
    
    const comissaoProdBase = targets.productCommissionRate ?? 2.2;
    const pComissaoBase = pTotal * (comissaoProdBase / 100);
    
    // Regra da Garantia: Bater os três principais (ou os que estiverem ativos) dá 10%
    let allActiveMetasMet = true;
    if (isPActive && pPerc < 1) allActiveMetasMet = false;
    if (isAActive && aPerc < 1) allActiveMetasMet = false;
    if (isIActive && iPerc < 1) allActiveMetasMet = false;
    
    const taxaGarantia = allActiveMetasMet ? 0.10 : 0.05;
    const aComissao = aTotal * taxaGarantia;
    
    const accelBonus = (level > 0) ? pTotal * (targets.levels[level as 1|2|3].rate / 100) : 0;
    const finalBonusAcelerador = accelBonus;
    const bonusGarantiaExtra = (level >= 1) ? pTotal * 0.006 : 0;

    return {
      pTotal, aTotal, iTotal, pPerc, aPerc, iPerc, level, taxaGarantia, bateuOsTres: allActiveMetasMet,
      comissaoProdutos: pComissaoBase,
      comissaoAssistencia: aComissao,
      bonusGarantia: bonusGarantiaExtra,
      bonusServicos: totalExtras,
      bonusAcelerador: finalBonusAcelerador,
      bonusPorPedidoTotal,
      premiacaoExtraTotal,
      ganhosTotais: pComissaoBase + aComissao + totalExtras + finalBonusAcelerador + bonusGarantiaExtra + bonusPorPedidoTotal + premiacaoExtraTotal,
      faturamentoGeral: fatGeral
    };
  }, [savedSales, targets]);

  const addCustomer = async (data: Omit<Customer, 'id' | 'dataCadastro' | 'totalComprado' | 'pedidosCount'>) => {
    const customerId = crypto.randomUUID();
    const newCustomer: Customer = {
      ...data,
      id: customerId,
      dataCadastro: new Date().toLocaleDateString('pt-BR'),
      totalComprado: 0,
      pedidosCount: 0,
      vendedorId: user?.id || 'unknown'
    };

    // Atualiza estado local imediatamente
    setCustomers(prev => {
      const updated = [newCustomer, ...prev];
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast('Cliente cadastrado!', 'success');

    // Sincroniza em background
    try {
      await setDoc(doc(db, 'customers', customerId), newCustomer);
    } catch (err: any) {
      console.error("Erro ao sincronizar novo cliente:", err);
      handleFirestoreError(err, OperationType.CREATE, `customers/${customerId}`);
    }
  };

  const deleteCustomer = async (id: string) => {
    // Atualiza estado local imediatamente
    setCustomers(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updated));
      return updated;
    });
    showToast('Cliente removido', 'info');

    // Sincroniza em background
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (err: any) {
      console.error("Erro ao sincronizar exclusão de cliente:", err);
      handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
    }
  };

  const updateCustomer = async (updated: Customer) => {
    // Atualiza estado local imediatamente
    setCustomers(prev => {
      const newCustomers = prev.map(c => c.id === updated.id ? updated : c);
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(newCustomers));
      return newCustomers;
    });
    showToast('Cadastro atualizado!', 'success');

    // Sincroniza em background
    try {
      await setDoc(doc(db, 'customers', updated.id), updated);
    } catch (err: any) {
      console.error("Erro ao sincronizar atualização de cliente:", err);
      handleFirestoreError(err, OperationType.UPDATE, `customers/${updated.id}`);
    }
  };

  const renderContent = () => {
    if (activeNav === NavItem.Resumos) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-full flex flex-col items-center p-8 space-y-12 overflow-y-auto pb-32"
        >
          <div className="text-center space-y-6">
            {user && (
              <div className="w-full max-w-6xl flex items-center justify-between mb-8 px-4">
                <div className="flex items-center gap-4 bg-cyber-dark/60 backdrop-blur-md p-2 pr-6 rounded-3xl border border-white/10 shadow-xl group hover:border-neon-blue/30 transition-all">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt="Foto" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-neon-blue/20 ring-offset-2 ring-offset-cyber-black" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-cyber-dark border border-neon-blue/30 flex items-center justify-center text-neon-blue font-black text-xl shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                      {user.firstName?.charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] font-black text-neon-blue/60 uppercase tracking-[0.3em] leading-none mb-1">
                      {user.role === 'admin' ? 'Nível Gestão' : 'Operador Quantum'}
                    </span>
                    <span className="text-sm font-black text-white/90 tracking-tight">{user.firstName} {user.lastName}</span>
                  </div>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(244,63,94,0.2)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="w-12 h-12 bg-white/5 text-rose-500 rounded-2xl flex items-center justify-center border border-white/10 shadow-sm hover:bg-rose-500/10 hover:text-rose-400 transition-all group relative"
                  title="Sair do Aplicativo"
                >
                  <LogOut size={20} />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-rose-400/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Desconectar Nódulo</span>
                </motion.button>
              </div>
            )}

            {viewingVendedorId && (
              <div className="w-full max-w-6xl bg-neon-purple/20 backdrop-blur-3xl border border-neon-purple/40 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-neon-purple uppercase tracking-[0.3em]">Modo Auditoria Ativo</span>
                  <p className="text-xs text-white/90 font-extrabold">
                    Visualizando temporariamente o progresso de: {" "}
                    <span className="text-neon-purple font-black underline decoration-neon-purple/40 underline-offset-4">
                      {vendedores.find(v => v.id === viewingVendedorId)?.firstName || 'Vendedor'} {vendedores.find(v => v.id === viewingVendedorId)?.lastName || ''}
                    </span>
                  </p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setViewingVendedorId(null);
                    navigateWithFeedback(NavItem.Admin);
                  }}
                  className="bg-neon-purple text-white px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-wider outline-none transition-all cursor-pointer shadow-lg shadow-neon-purple/20"
                >
                  Sair da Auditoria / Voltar ao Painel
                </motion.button>
              </div>
            )}

            <div className="w-24 h-24 bg-cyber-dark border border-neon-blue/30 rounded-[2.5rem] flex items-center justify-center text-neon-blue mx-auto shadow-[0_0_40px_rgba(0,242,255,0.2)] animate-pulse">
              <ShieldCheck size={48} />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
              Conquista <span className="text-neon-blue drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">App</span>
            </h1>
          </div>

          <div className="w-full max-w-6xl space-y-12">
            {/* Atalhos Rápidos com Nomes (Botões Grandes) - ARQUITETO: Refinado para foco em análise */}
            <div className="space-y-12">
              <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-8`}>
                {[
                  { id: NavItem.Configuracoes, label: 'Configuração', icon: <Target size={32} />, color: 'from-amber-400 to-orange-500', glow: 'shadow-amber-500/30' },
                  { id: NavItem.ResumoServico, label: 'Serviços', icon: <Wrench size={32} />, color: 'from-neon-green to-emerald-600', glow: 'shadow-neon-green/30' },
                  { id: NavItem.ResumoPedido, label: 'Relatório Detalhado', icon: <Files size={32} />, color: 'from-neon-blue to-indigo-700', glow: 'shadow-neon-blue/30' },
                  { id: NavItem.Relatorios, label: 'Relatório Resumido', icon: <BarChart size={32} />, color: 'from-rose-500 to-neon-purple', glow: 'shadow-neon-purple/30' },
                  ...(isAdmin ? [{ id: NavItem.Admin, label: 'Painel Admin', icon: <ShieldCheck size={32} />, color: 'from-fuchsia-500 to-rose-600', glow: 'shadow-fuchsia-500/30' }] : []),
                ].map((item) => {
                  const isPressing = clickingNavItem === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={isPressing ? {} : { scale: 1.05, y: -6 }}
                      whileTap={{ scale: 0.90 }}
                      animate={isPressing ? { scale: 0.90 } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 18 }}
                      onClick={() => navigateWithFeedback(item.id)}
                      className="bg-cyber-dark/60 backdrop-blur-xl p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col items-center text-center space-y-5 group transition-all relative overflow-hidden outline-none"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-[0.03] group-hover:opacity-15 transition-opacity`}></div>
                      <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 relative z-10 border border-white/20 group-hover:border-white/40 text-white ${item.glow} overflow-hidden group/icon bg-cyber-black/40`}>
                        {/* Background Layer with Gradient - increased default opacity from 10% to 75% for vivid look */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-75 group-hover:opacity-100 transition-all duration-500`}></div>
                        
                        {/* Glossy Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-50"></div>
                        
                        {/* Icon with subtle shadow */}
                        <div className="relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform duration-500">
                          {item.icon}
                        </div>

                        {/* Internal Glow Effect on Hover */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      <span className="text-[10px] font-black text-white/70 group-hover:text-white uppercase tracking-[0.3em] relative z-10 transition-all duration-300">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Developer Credits Badge */}
              <div className="mt-12 flex flex-col items-center justify-center space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                <div className="px-4 py-1 bg-white/5 rounded-full border border-white/10 flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-neon-green rounded-full animate-pulse shadow-[0_0_5px_#39ff14]"></div>
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Versão 3.0 Experimental • Criado no Nódulo Quantum</span>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => showToast('Interface Admin Sincronizada', 'success')}
                    className="text-[10px] font-black text-neon-blue uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Núcleo de Gestão Ativo
                  </button>
                )}
              </div>
            </div>

            {/* Resumo de Relatório (Faturamento e Ganhos) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-cyber-dark/40 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col justify-between group hover:border-neon-blue/30 transition-all">
                <div>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Processamento de Faturamento</span>
                  <div className="text-4xl font-black text-white group-hover:text-neon-blue transition-colors">{formatBRL(stats.faturamentoGeral)}</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-neon-blue/60 group-hover:text-neon-blue transition-colors">
                  <Zap size={12} className="animate-pulse" />
                  <span>Volume Sincronizado</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-cyber-dark via-cyber-black to-cyber-dark p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col justify-between group overflow-hidden relative active:scale-[0.98] transition-all cursor-pointer border-neon-blue/20">
                <div className="absolute top-0 right-0 w-48 h-48 bg-neon-blue/10 rounded-full -mr-24 -mt-24 blur-3xl transition-transform group-hover:scale-150 duration-700"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-neon-purple/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
                
                <div className="relative z-10 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black text-neon-blue/60 uppercase tracking-[0.2em] block">Interface de Ganhos</span>
                    <div className="h-0.5 w-4 bg-neon-blue/30 rounded-full"></div>
                  </div>
                  <div className="text-5xl font-black tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(0,242,255,0.3)] text-neon-blue">{formatBRL(stats.ganhosTotais)}</div>
                </div>
                <div className="mt-4 space-y-1 relative z-10">
                   <div className="flex justify-between text-[9px] font-bold text-white/40">
                      <span className="uppercase">Algoritmos Extras:</span>
                      <span className="text-white/80">{formatBRL(stats.bonusServicos)}</span>
                   </div>
                   <div className="flex justify-between text-[9px] font-bold text-white/40">
                      <span className="uppercase">Transações:</span>
                      <span className="text-white/80">{formatBRL(stats.bonusPorPedidoTotal)}</span>
                   </div>
                   <div className="flex justify-between text-[9px] font-bold text-white/40">
                      <span className="uppercase">Protocolos Bonificados:</span>
                      <span className="text-white/80">{formatBRL(stats.premiacaoExtraTotal)}</span>
                   </div>
                </div>
              </div>

              <div className="bg-cyber-dark/40 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col justify-between group hover:border-neon-purple/30 transition-all">
                <div>
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Conexões Ativas</span>
                  <div className="text-4xl font-black text-white group-hover:text-neon-purple transition-colors">{savedSales.filter(s => s.status !== 'cancelado').length}</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-neon-purple/60 group-hover:text-neon-purple transition-colors">
                  <Cpu size={12} className="animate-pulse" />
                  <span>Histórico Digital</span>
                </div>
              </div>
            </div>

            {/* Progresso de Metas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-purple-600 rounded-full"></div>
                    <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">Performance de Campo</h3>
                  </div>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {[
                    { label: 'Meta Produtos', current: stats.pPerc, color: 'from-purple-500 to-purple-800', icon: <ShoppingBag size={14} /> },
                    { label: 'Assistência', current: stats.aPerc, color: 'from-indigo-400 to-indigo-700', icon: <Wrench size={14} /> },
                    { label: 'Proteção/Imp.', current: stats.iPerc, color: 'from-blue-400 to-blue-700', icon: <Droplets size={14} /> },
                  ].map((cat) => (
                    <div key={cat.label} className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                            {cat.icon}
                          </div>
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{cat.label}</span>
                        </div>
                        <span className="text-sm font-black text-gray-900">{(cat.current * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-200/50 rounded-full overflow-hidden p-0.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(cat.current * 100, 100)}%` }}
                          transition={{ duration: 1.5, ease: "circOut" }}
                          className={`h-full bg-gradient-to-r ${cat.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Balance Preview - ARQUITETO: Sugestão de Novo Card */}
              <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col justify-between">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Histórico Recente</h4>
                  <p className="text-xs font-bold text-gray-500 italic">Últimos 3 registros computados</p>
                </div>
                <div className="space-y-4 my-8">
                  {savedSales.slice(0, 3).map((sale, idx) => (
                    <div key={idx} className="flex items-center gap-4 group cursor-help">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                        sale.status === 'cancelado' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-purple-50 border-purple-100 text-purple-600'
                      }`}>
                        <Clock size={16} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-900 uppercase">#{sale.numeroPedido}</span>
                          <span className="text-[9px] font-bold text-gray-400 tabular-nums">{sale.data}</span>
                        </div>
                        <div className="text-xs font-black text-gray-500 tracking-tight">{formatBRL(sale.valorProduto)}</div>
                      </div>
                    </div>
                  ))}
                  {savedSales.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhuma Atividade</p>
                    </div>
                  )}
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveNav(NavItem.ResumoPedido)}
                  className="w-full py-6 bg-gradient-to-r from-purple-600 to-indigo-700 text-[11px] font-black text-white uppercase tracking-[0.4em] rounded-[2rem] shadow-2xl shadow-purple-500/40 flex items-center justify-center gap-4 group mt-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-24 h-full bg-white/10 -skew-x-[30deg] -translate-x-32 group-hover:translate-x-[500px] transition-transform duration-1000"></div>
                  <Files size={20} className="text-purple-200" />
                  Ver Histórico Completo
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Card de Indicações */}
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                    <Users size={24} />
                  </div>
                  <h3 className="text-xl font-black text-gray-800 uppercase italic tracking-tighter">Indicações</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Total de Leads por Indicação</p>
                </div>
                <div className="mt-8">
                  <div className="text-5xl font-black text-emerald-600">
                    {filteredOpportunities.filter(o => o.type === 'Indicação').length}
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase mt-2">Cards Ativos</p>
                </div>
              </div>

              {/* Tarefas de Hoje */}
              <div className="lg:col-span-2 bg-cyber-dark/40 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">Fluxos Pendentes</h3>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">Retornos agendados para este período</p>
                  </div>
                  {filteredOpportunities.filter(o => o.returnDate === new Date().toISOString().split('T')[0] && o.stage !== 'fechamento' && o.stage !== 'perdido').length > 0 && (
                    <div className="bg-neon-blue/5 px-4 py-2 rounded-2xl border border-neon-blue/20 flex flex-col items-center md:items-end">
                      <span className="text-[8px] font-black text-neon-blue uppercase tracking-[0.2em] italic">Impacto Projetado Hoje</span>
                      <span className="text-xl font-black text-neon-blue leading-none mt-1 drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]">
                        {formatBRL(filteredOpportunities
                          .filter(o => o.returnDate === new Date().toISOString().split('T')[0] && o.stage !== 'fechamento' && o.stage !== 'perdido')
                          .reduce((acc, o) => acc + o.value, 0))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredOpportunities
                    .filter(o => o.returnDate === new Date().toISOString().split('T')[0] && o.stage !== 'fechamento' && o.stage !== 'perdido')
                    .map(o => (
                      <div key={o.id} className="bg-white/5 p-5 rounded-[2rem] border border-white/10 flex flex-col gap-4 hover:border-neon-blue/30 transition-all group relative overflow-hidden backdrop-blur-sm">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyber-dark/60 rounded-xl flex items-center justify-center text-neon-blue border border-white/10 shadow-sm group-hover:scale-110 transition-transform">
                              <Users size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-white uppercase text-[11px] leading-none truncate max-w-[120px]">{o.title}</p>
                              <span className="text-[7px] font-black text-neon-blue/40 uppercase tracking-widest mt-1 block">Sincronia Pendente</span>
                            </div>
                          </div>
                          <span className="text-[7px] font-black text-neon-blue bg-neon-blue/10 px-2 py-1 rounded-lg border border-neon-blue/20 uppercase whitespace-nowrap">Interface</span>
                        </div>
                        
                        <div className="bg-cyber-dark/40 rounded-2xl p-3 flex items-center justify-between border border-white/5 relative z-10">
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-[7px] text-white/20 uppercase font-black mb-0.5 tracking-tighter">Interesse</p>
                            <p className="text-[10px] text-white/60 font-bold uppercase truncate">{o.productInterest}</p>
                          </div>
                          <div className="text-right border-l border-white/5 pl-3">
                            <p className="text-[7px] text-white/20 uppercase font-black mb-0.5 tracking-tighter">Valor</p>
                            <p className="text-xs font-black text-neon-blue leading-none">{formatBRL(o.value)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 relative z-10">
                          {o.phone && (
                            <a 
                              href={`https://wa.me/55${o.phone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 h-10 bg-neon-green text-black rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(57,255,20,0.2)] active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest"
                            >
                              <MessageCircle size={16} />
                              Canal WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  
                  {filteredOpportunities.filter(o => o.returnDate === new Date().toISOString().split('T')[0] && o.stage !== 'fechamento' && o.stage !== 'perdido').length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/10 mb-4 border border-white/10">
                        <CheckSquare size={32} />
                      </div>
                      <p className="text-sm text-white/20 font-bold italic uppercase tracking-widest">Nenhuma tarefa pendente para hoje.</p>
                      <p className="text-[10px] text-neon-blue/20 font-medium mt-1 uppercase">Tudo em dia por aqui!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12">
            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10 shadow-2xl backdrop-blur-md">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse shadow-[0_0_8px_#39ff14]"></div>
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">SISTEMA CONQUISTA v3.0</span>
            </div>
          </div>
        </motion.div>
      );
    }

    if (activeNav === NavItem.Processos) {
      return (
        <div className="flex flex-col h-full space-y-6">
          <div className="bg-cyber-dark/60 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-neon-blue rounded-full animate-pulse shadow-[0_0_5px_#00f2ff]"></div>
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Pipeline de Vendas</h2>
              </div>
              <span className="text-[10px] font-black text-neon-blue/60 tracking-[0.4em] uppercase ml-3">Gestão de Leads & Negociações</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveNav(NavItem.Resumos)} 
                className="bg-white/5 text-white/40 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/10 hover:bg-white/10 hover:text-white transition-all"
              >
                Voltar
              </button>
              <button 
                onClick={() => setIsAddingOpportunity(true)}
                className="px-5 py-2.5 bg-neon-blue text-black rounded-xl shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:bg-neon-green hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] active:scale-95 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
              >
                <Plus size={18} />
                Gerar Módulo
              </button>
            </div>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-8 h-full min-h-[600px] scrollbar-hide">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col group/stage">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${stage.color} shadow-[0_0_8px_rgba(0,0,0,0.5)]`}></div>
                    <h3 className="font-black text-white/60 uppercase text-[11px] tracking-widest">{stage.label}</h3>
                    <div className="bg-cyber-dark/60 text-white/40 text-[10px] px-2 py-0.5 rounded-full font-bold tabular-nums border border-white/10">
                      {filteredOpportunities.filter(o => o.stage === stage.id).length}
                    </div>
                  </div>
                </div>

                <div className="bg-cyber-dark/40 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-4 space-y-3 transition-colors group-hover/stage:border-neon-blue/30">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">Volume Sincronia</span>
                    <span className="text-sm font-black text-white tabular-nums">
                      {formatBRL(filteredOpportunities.filter(o => o.stage === stage.id).reduce((acc, o) => acc + o.value, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-[9px] font-black text-neon-blue/40 uppercase tracking-widest italic">Exp. de Ganhos</span>
                    <span className="text-sm font-black text-neon-blue tabular-nums">
                      {formatBRL(filteredOpportunities.filter(o => o.stage === stage.id).reduce((acc, o) => acc + (o.value * 0.022), 0))}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 bg-white/[0.02] rounded-2xl p-3 space-y-4 border border-white/5 backdrop-blur-sm">
                  {filteredOpportunities.filter(o => o.stage === stage.id).map((opp) => {
                    const commission = opp.value * 0.022;
                    const isGolden = opp.value >= 5000;
                    
                    return (
                    <motion.div 
                      key={opp.id}
                      layoutId={opp.id}
                      onClick={() => setEditingOpportunity(opp)}
                      className={`bg-cyber-dark/60 p-5 rounded-2xl shadow-xl border border-white/10 ${isGolden ? 'border-neon-purple/40 ring-1 ring-neon-purple/20 shadow-[0_0_20px_rgba(188,19,254,0.1)]' : 'border-transparent'} hover:border-neon-blue/50 hover:shadow-neon-blue/5 transition-all cursor-pointer group relative overflow-hidden`}
                    >
                      <div className="absolute top-0 left-0 w-1 p-0.5 h-full opacity-30 transition-opacity group-hover:opacity-100">
                        <div className={`h-full w-full rounded-full ${stage.color}`}></div>
                      </div>

                      {isGolden && (
                        <div className="absolute top-0 right-0 bg-neon-purple text-cyber-black px-2 py-1 rounded-bl-xl shadow-lg z-10 flex items-center gap-1">
                          <Gem size={10} />
                          <span className="text-[8px] font-black uppercase">Elite</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] font-black text-neon-blue uppercase bg-neon-blue/10 px-2 py-0.5 rounded-lg border border-neon-blue/20 tracking-tighter">{opp.type}</span>
                        <div className="flex items-center gap-1.5 bg-cyber-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                          <Clock size={10} className="text-white/30" />
                          <span className="text-[9px] font-bold text-white/40 tabular-nums">{opp.daysAgo}d</span>
                        </div>
                      </div>

                      <h4 className="font-black text-white mb-1 group-hover:text-neon-blue transition-colors uppercase tracking-tight text-xs">{opp.title}</h4>
                      <p className="text-[10px] text-white/30 mb-3 font-bold italic">{opp.productInterest}</p>
                      
                      <div className="bg-cyber-black/40 text-[11px] rounded-xl p-3 mb-4 border border-white/5 group-hover:bg-cyber-black/60 group-hover:border-white/10 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Zap size={10} className="text-neon-blue" />
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Interface de Ganhos</span>
                          </div>
                          <span className="text-xs font-black text-neon-blue tabular-nums">{formatBRL(commission)}</span>
                        </div>
                      </div>

                      {opp.phone && (
                        <div className="flex items-center justify-between mb-4 bg-neon-green/5 p-2.5 rounded-xl border border-neon-green/10 group-hover:bg-neon-green/10 transition-colors">
                          <span className="text-[10px] font-black text-white/60 tabular-nums tracking-tighter">{opp.phone}</span>
                          <a 
                            href={`https://wa.me/55${opp.phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 h-7 bg-neon-green text-black rounded-lg flex items-center justify-center hover:scale-110 shadow-[0_0_10px_#39ff14] transition-all"
                          >
                            <MessageCircle size={14} />
                          </a>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm font-black text-white tabular-nums">{formatBRL(opp.value)}</div>
                        <img 
                          src={opp.user.avatar} 
                          className="w-6 h-6 rounded-full border border-white/20 shadow-sm transition-all group-hover:border-neon-blue/50" 
                          alt={opp.user.name} 
                          referrerPolicy="no-referrer" 
                        />
                      </div>
                    </motion.div>
                  );})}
                    <button 
                    onClick={() => setIsAddingOpportunity(true)}
                    className="w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-white/20 hover:text-white/60 hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Plus size={16} /> Adicionar Novo Card
                  </button>
                </div>
              </div>
            ))}
          </div>
          {isAddingOpportunity && <OpportunityForm onCancel={() => setIsAddingOpportunity(false)} onSubmit={addOpportunity} />}
          {editingOpportunity && <OpportunityEditForm opportunity={editingOpportunity} onCancel={() => setEditingOpportunity(null)} onSave={saveOpportunity} />}
        </div>
      );
    }

    if (activeNav === NavItem.AdicionarVenda) return <SaleForm onCancel={() => setActiveNav(NavItem.Resumos)} onSubmit={saveSale} customers={customers} targets={targets} stats={stats} />;
    if (activeNav === NavItem.Clientes) return (
      <Customers 
        customers={customers} 
        onAdd={addCustomer} 
        onDelete={deleteCustomer} 
        onUpdate={updateCustomer} 
        onBack={() => setActiveNav(NavItem.Resumos)}
      />
    );
    if (activeNav === NavItem.Configuracoes) return (
      <Settings 
        targets={targets} 
        onSave={saveTargets} 
        onClose={() => setActiveNav(NavItem.Resumos)} 
        showInstallBtn={showInstallBtn}
        onInstall={handleInstallApp}
      />
    );

    if (activeNav === NavItem.Meta) {
      const data = [
        { name: 'Módulo de Produtos', value: stats.pTotal, target: targets.product, fill: '#00f2ff' },
        { name: 'Assistência Técnica', value: stats.aTotal, target: targets.assistance, fill: '#39ff14' },
        { name: 'Impermeabilização', value: stats.iTotal, target: targets.waterproofing, fill: '#bc13fe' },
      ];

      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 pb-20"
        >
          <div className="bg-cyber-dark/60 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex items-center justify-between shadow-2xl">
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Matriz de Objetivos</h2>
              <span className="text-[8px] font-black text-neon-blue tracking-[0.3em] uppercase">Progresso em Tempo Real</span>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.90 }}
              animate={clickingNavItem === NavItem.Resumos ? { scale: 0.90 } : { scale: 1 }}
              onClick={() => navigateWithFeedback(NavItem.Resumos)} 
              className="bg-white/5 text-white/40 hover:text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/10 transition-colors cursor-pointer outline-none"
            >
              Voltar
            </motion.button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {data.map((item) => {
              const perc = item.target > 0 ? (item.value / item.target) * 100 : 0;
              return (
                <div key={item.name} className="bg-cyber-dark/40 backdrop-blur-3xl p-6 rounded-3xl border border-white/10 space-y-4 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full -mr-16 -mt-16" style={{ backgroundColor: item.fill }}></div>
                  <div className="flex justify-between items-end gap-4 relative z-10">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block truncate">{item.name}</span>
                      <div className="text-xl md:text-2xl font-black text-white truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">{formatBRL(item.value)}</div>
                    </div>
                    <div className="text-right min-w-0">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest block truncate">Objetivo</span>
                      <div className="text-xs md:text-sm font-black text-white/40 truncate">{formatBRL(item.target)}</div>
                    </div>
                  </div>
                  
                  <div className="relative h-4 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(perc, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="absolute h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                      style={{ 
                        backgroundColor: item.fill,
                        boxShadow: `0 0 10px ${item.fill}40`
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-[11px] font-black text-white" style={{ color: item.fill }}>{perc.toFixed(1)}% Compilado</span>
                    <span className="text-[9px] font-black text-white/30 uppercase truncate">Faltam {formatBRL(Math.max(0, item.target - item.value))} para sincronia</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-cyber-dark/60 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 text-center space-y-6 shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-neon-blue/5 animate-pulse"></div>
            <h3 className="text-[10px] font-black text-neon-blue uppercase tracking-[0.4em] relative z-10">Escalada de Performance Quantum</h3>
            
            <div className="flex justify-between items-center max-w-sm mx-auto relative z-10">
              {[1, 2, 3].map(lvl => (
                <div key={lvl} className="flex flex-col items-center gap-3 relative">
                  {lvl < 3 && (
                    <div className={`absolute top-6 left-10 w-24 h-0.5 ${stats.level >= lvl + 1 ? 'bg-neon-blue shadow-[0_0_5px_#00f2ff]' : 'bg-white/5'}`} />
                  )}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${
                    stats.level >= lvl 
                      ? 'border-neon-blue bg-neon-blue text-black shadow-[0_0_15px_rgba(0,242,255,0.4)]' 
                      : 'border-white/5 bg-white/5 text-white/20'
                  }`}>
                    {stats.level >= lvl ? <Trophy size={18} /> : <Zap size={18} />}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase ${stats.level >= lvl ? 'text-neon-blue' : 'text-white/20'}`}>Lvl {lvl}</span>
                    <span className="text-[8px] font-bold text-white/40">{targets.levels[lvl as 1|2|3].rate}% Mult</span>
                  </div>
                </div>
              ))}
            </div>
            {stats.pPerc >= 1 && stats.aPerc >= 1 && stats.iPerc >= 1 && (
              <div className="mt-4 p-4 bg-neon-green text-black rounded-[2rem] font-black text-[10px] uppercase shadow-[0_0_20px_rgba(57,255,20,0.3)] animate-bounce flex items-center justify-center gap-3 relative z-10">
                <Trophy size={16} /> Fluxo de Ganhos Dobrado Ativado!
              </div>
            )}
            <p className="text-[10px] font-medium text-white/30 max-w-[200px] mx-auto relative z-10">
              {stats.level === 3 
                ? "Parabéns! Sistema operando em overclock máximo." 
                : `Sincronize ${targets.levels[(stats.level + 1) as 1|2|3]?.threshold}% em todas as categorias para Nível ${stats.level + 1}.`}
            </p>
          </div>
        </motion.div>
      );
    }

    if (activeNav === NavItem.ResumoServico) {
      const totalAssistencia = stats.aTotal;
      const totalComissaoAssistencia = stats.comissaoAssistencia;

      const activeSales = savedSales.filter(s => s.status !== 'cancelado');

      const serviceData = [
        { id: 'Montagem', name: 'Montagem de Unidades', count: 0, bonus: (targets.serviceBonuses?.montagem || 0), color: '#bc13fe' },
        { id: 'Lavagem', name: 'Sincronia de Lavagem', count: 0, bonus: (targets.serviceBonuses?.lavagem || 0), color: '#00f2ff' },
        { id: 'Almofada', name: 'Módulo Almofada', count: 0, bonus: (targets.serviceBonuses?.almofada || 0), color: '#39ff14' },
        { id: 'Pés G-Roupa', name: 'Nivelamento de Base', count: 0, bonus: (targets.serviceBonuses?.pes_guarda_roupa || 0), color: '#f59e0b' },
        { id: 'Impermeab.', name: 'Escudo Protetor', count: 0, bonus: (targets.serviceBonuses?.impermeabilizacao_bonus || 0), color: '#ff0055' },
      ];

      if (targets.bonusPorPedido?.ativo) {
        serviceData.push({ id: 'Bônus por Pedido', name: 'Bônus de Transação', count: activeSales.length, bonus: (targets.bonusPorPedido?.valor || 5), color: '#0ea5e9' as any });
      }

      activeSales.forEach(s => {
        if (Array.isArray(s.servicosExtras)) {
          s.servicosExtras.forEach(ex => {
            const item = serviceData.find(d => d.id === ex || d.name === ex);
            if (item && item.id !== 'Bônus por Pedido') {
              item.count++;
            }
          });
        }
      });

      const totalServiceBonus = serviceData.reduce((acc, d) => acc + (d.count * d.bonus), 0) + totalComissaoAssistencia;

      return (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6 pb-20"
        >
          <div className="bg-cyber-dark/60 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex items-center justify-between shadow-2xl">
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Módulos de Serviço</h2>
              <span className="text-[8px] font-black text-neon-blue tracking-[0.3em] uppercase">Resumo de Extras & Protocolos</span>
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.90 }}
              animate={clickingNavItem === NavItem.Resumos ? { scale: 0.90 } : { scale: 1 }}
              onClick={() => navigateWithFeedback(NavItem.Resumos)} 
              className="bg-white/5 text-white/40 hover:text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/10 transition-colors cursor-pointer outline-none"
            >
              Voltar
            </motion.button>
          </div>

          <div className="bg-cyber-dark/40 backdrop-blur-3xl p-8 rounded-3xl border border-white/10 flex flex-col items-center justify-center space-y-2 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-green/30 to-transparent"></div>
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest relative z-10">Interface de Ganhos Totais</span>
            <div className="text-4xl font-black text-neon-green drop-shadow-[0_0_12px_rgba(57,255,20,0.4)] relative z-10">{formatBRL(totalServiceBonus + stats.premiacaoExtraTotal)}</div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            
            {/* Premiação Semanal */}
            <div className="bg-cyber-dark/40 backdrop-blur-lg p-5 rounded-2xl border border-neon-purple/20 flex items-center justify-between shadow-xl group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-neon-purple/10 border border-neon-purple/20 group-hover:scale-110 transition-transform">
                    <Target size={18} className="text-neon-purple" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">Meta Semanal</span>
                    <div className="text-[8px] font-bold text-white/30 uppercase mt-0.5">Bônus de Performance</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-neon-purple drop-shadow-[0_0_8px_rgba(188,19,254,0.3)]">{formatBRL(stats.premiacaoExtraTotal)}</div>
                </div>
            </div>

            {serviceData.map((item) => (
              <div key={item.name} className="bg-cyber-dark/40 backdrop-blur-lg p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-xl group hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-cyber-dark/40 border border-white/5 group-hover:scale-110 transition-transform" style={{ borderLeft: `2px solid ${item.color}` }}>
                    <Wrench size={18} style={{ color: item.color }} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">{item.name}</span>
                    <div className="text-[8px] font-bold text-white/20 uppercase mt-0.5">{(item.count || 0)} Unidades Sincronizadas</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white">{formatBRL((item.count || 0) * (item.bonus || 0))}</div>
                  <div className="text-[8px] font-bold text-neon-green uppercase tracking-tighter">+{formatBRL(item.bonus || 0)} / U</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }

    if (activeNav === NavItem.Relatorios) {
      const filteredSales = savedSales.filter(s => {
        const saleDate = new Date(s.timestamp).toISOString().split('T')[0];
        const isAfterStart = startDate ? saleDate >= startDate : true;
        const isBeforeEnd = endDate ? saleDate <= endDate : true;
        return isAfterStart && isBeforeEnd;
      });

      const activeSales = filteredSales.filter(s => s.status !== 'cancelado');

      const periodStats = {
        total: stats.faturamentoGeral,
        bonus: stats.ganhosTotais,
        count: activeSales.length,
        products: stats.pTotal,
        assistance: stats.aTotal,
        water: stats.iTotal,
        comissaoProd: stats.comissaoProdutos,
        comissaoAssis: stats.comissaoAssistencia,
        bonusServ: stats.bonusServicos
      };

      const sharePeriodReport = () => {
        const text = `Relatório Conquista App - Ciclo: ${startDate || 'Inicial'} > ${endDate || 'Atual'}\n` +
          `Vendas Ativas: ${periodStats.count}\n` +
          `Volume Processado: ${formatBRL(periodStats.total)}\n` +
          `Total de Ganhos: ${formatBRL(periodStats.bonus)}\n` +
          `-------------------\n` +
          filteredSales.map(s => {
            const isCanceled = s.status === 'cancelado';
            const items = [];
            if (s.valorProduto > 0) items.push("Produto");
            if (s.valorAssistencia > 0) items.push("Assistência");
            if (s.valorImpermeabilizacao > 0) items.push("Impermeabilização");
            if (s.servicosExtras && s.servicosExtras.length > 0) items.push(...s.servicosExtras);
            
            return `Unidade #${s.numeroPedido}${isCanceled ? ' [ABORTADA]' : ''}: ${isCanceled ? 'OFFLINE' : formatBRL(s.total)}\nCamadas: ${items.join(', ')}`;
          }).join('\n\n');

        if (navigator.share) {
          navigator.share({ title: `Relatório de Performance Quantum`, text });
        } else {
          navigator.clipboard.writeText(text);
          showToast('Relatório compilado e copiado!', 'success');
        }
      };

      return (
        <div className="content-section py-2 px-2 space-y-6 animate-in slide-in-from-bottom-6 pb-20">
          <div className="bg-cyber-dark/60 backdrop-blur-xl p-5 rounded-2xl border border-white/10 flex items-center justify-between shadow-2xl">
             <div>
                <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Analítica de Dados</h2>
                <span className="text-[8px] font-black text-neon-blue tracking-[0.3em] uppercase">Mapeamento por Período</span>
             </div>
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.90 }}
               animate={clickingNavItem === NavItem.Resumos ? { scale: 0.90 } : { scale: 1 }}
               onClick={() => navigateWithFeedback(NavItem.Resumos)} 
               className="bg-white/5 text-white/40 hover:text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/10 transition-colors cursor-pointer outline-none"
             >
               Voltar
             </motion.button>
          </div>

          <div className="flex flex-col gap-2 pb-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Início do Ciclo</label>
                <input 
                  type="date" 
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-[10px] font-bold text-white outline-none focus:border-neon-blue transition-all"
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Fim do Ciclo</label>
                <input 
                  type="date" 
                  className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-[10px] font-bold text-white outline-none focus:border-neon-blue transition-all"
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-cyber-dark/40 p-5 rounded-3xl border border-white/5 shadow-2xl flex flex-col items-center justify-center">
              <span className="text-[8px] font-black text-white/30 uppercase mb-1">Volume Processado</span>
              <div className="text-sm font-black text-white text-center">{formatBRL(periodStats.total)}</div>
            </div>
            <div className="bg-neon-blue/5 p-5 rounded-3xl border border-neon-blue/20 shadow-2xl flex flex-col items-center justify-center">
              <span className="text-[8px] font-black text-neon-blue uppercase mb-1">Ganhos de Ciclo</span>
              <div className="text-sm font-black text-neon-blue text-center drop-shadow-[0_0_8px_rgba(0,242,255,0.3)]">{formatBRL(periodStats.bonus)}</div>
            </div>
          </div>

          <div className="bg-cyber-dark/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 space-y-4 shadow-2xl">
            <h4 className="text-[10px] font-black text-neon-blue uppercase tracking-widest">Interface de Ganhos</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] items-center">
                <span className="text-white/40 uppercase text-[9px] font-black">Produtos Quantum</span>
                <span className="text-white font-bold">{formatBRL(periodStats.comissaoProd)}</span>
              </div>
              <div className="flex justify-between text-[11px] items-center">
                <span className="text-white/40 uppercase text-[9px] font-black">Modulagem de Base</span>
                <span className="text-white font-bold">{formatBRL(periodStats.comissaoAssis)}</span>
              </div>
              <div className="flex justify-between text-[11px] items-center">
                <span className="text-white/40 uppercase text-[9px] font-black">Sincronia de Extras</span>
                <span className="text-white font-bold">{formatBRL(periodStats.bonusServ)}</span>
              </div>
            </div>
          </div>

          <div className="bg-cyber-dark/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 space-y-4 shadow-2xl">
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Resumo de Vendas</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] items-center">
                <span className="text-white/40 uppercase text-[9px] font-black">Unidades Ativas</span>
                <span className="text-neon-blue font-bold">{periodStats.count}</span>
              </div>
              <div className="flex justify-between text-[11px] items-center">
                <span className="text-white/40 uppercase text-[9px] font-black">Faturamento Bruto</span>
                <span className="text-white font-bold">{formatBRL(periodStats.products)}</span>
              </div>
              <div className="flex justify-between text-[11px] items-center">
                <span className="text-white/40 uppercase text-[9px] font-black">Suporte em Campo</span>
                <span className="text-white font-bold">{formatBRL(periodStats.assistance)}</span>
              </div>
              <div className="flex justify-between text-[11px] items-center">
                <span className="text-white/40 uppercase text-[9px] font-black">Escudos Térmicos</span>
                <span className="text-white font-bold">{formatBRL(periodStats.water)}</span>
              </div>
            </div>
          </div>

          <div className="bg-cyber-dark/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 space-y-4 shadow-2xl">
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Compilação de Extras</h4>
            <div className="space-y-3">
              {(() => {
                const services = filteredSales.flatMap(s => Array.isArray(s.servicosExtras) ? s.servicosExtras : []);
                const counts = services.reduce((acc: Record<string, number>, service) => {
                  acc[service] = (acc[service] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                
                const entries = Object.entries(counts);
                
                if (entries.length === 0) {
                  return <p className="text-[10px] text-white/20 text-center italic">Nenhum protocolo extra inicializado.</p>;
                }
                
                return entries.map(([service, count]) => (
                  <div key={service} className="flex justify-between text-[11px] items-center">
                    <span className="text-white/40 uppercase text-[9px] font-black">{service}</span>
                    <span className="text-neon-green font-bold tabular-nums shadow-neon-green/20">{count}x</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          <button 
            onClick={sharePeriodReport}
            className="w-full py-5 bg-neon-blue text-black rounded-3xl font-black text-[12px] uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-95 transition-all hover:bg-neon-green hover:shadow-[0_0_25px_rgba(57,255,20,0.4)]"
          >
            Exportar Relatório
          </button>
        </div>
      );
    }

    /*
    if (activeNav === NavItem.Retornos) {
      const retornosPendentes = savedSales.filter(s => s.dataRetorno && s.statusRetorno === 'pendente');
      
      return (
        <div className="content-section py-2 px-2 space-y-6 animate-in slide-in-from-bottom-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
             <div>
                <h2 className="text-xl font-black text-gray-800 italic tracking-tighter uppercase leading-none">Retornos</h2>
                <span className="text-[8px] font-black text-purple-600 tracking-[0.3em] uppercase">Pendentes</span>
             </div>
          </div>

          <div className="space-y-3">
             {retornosPendentes.length === 0 ? (
               <div className="bg-white p-10 rounded-3xl text-center border border-gray-200 shadow-sm">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum retorno pendente!</p>
               </div>
             ) : (
               retornosPendentes.map((sale, i) => (
                 <div key={i} className={`bg-white p-5 rounded-2xl border ${new Date(sale.dataRetorno!) <= new Date() ? 'border-red-200' : 'border-gray-200'} flex justify-between items-center shadow-sm`}>
                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className="flex flex-col text-left hover:opacity-70 transition-opacity"
                    >
                       <span className="text-[10px] font-black text-purple-600">#{sale.numeroPedido} - {new Date(sale.dataRetorno!).toLocaleDateString('pt-BR')}</span>
                       <span className="text-[10px] font-bold text-gray-600 mt-0.5">{sale.descricaoRetorno}</span>
                    </button>
                    <button 
                      onClick={async () => {
                        const handleFinalizeRetorno = async () => {
                          const { error } = await supabase.from('sales').update({ statusRetorno: 'finalizado' }).eq('id', sale.id);
                          if (error) console.error("Erro ao finalizar retorno:", error);
                        };
                        handleFinalizeRetorno();
                      }}
                      className="bg-emerald-50 text-emerald-600 p-2 rounded-lg"
                    >
                      <CheckSquare size={16} />
                    </button>
                 </div>
               ))
             )}
          </div>
        </div>
      );
    }
    */

    if (activeNav === NavItem.Admin) {
      const getInactivityDaysMessage = (lastLogin?: string) => {
        if (!lastLogin) return { text: 'Nunca utilizou', days: 999, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
        const diffTime = Math.abs(new Date().getTime() - new Date(lastLogin).getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return { text: 'Ativo hoje', days: 0, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
        if (diffDays === 1) return { text: 'Ativo ontem', days: 1, color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' };
        if (diffDays <= 3) return { text: `Há ${diffDays} dias`, days: diffDays, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
        return { text: `Inativo há ${diffDays} dias`, days: diffDays, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
      };

      const filteredVendedores = vendedores.filter(v => {
        const fullName = `${v.firstName || ''} ${v.lastName || ''}`.toLowerCase();
        const email = (v.email || '').toLowerCase();
        const store = (v.store || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || email.includes(search) || store.includes(search);
      });

      const totalSellers = vendedores.length;
      const activeSellers = vendedores.filter(v => {
        if (!v.lastLogin) return false;
        const diffDays = Math.floor(Math.abs(new Date().getTime() - new Date(v.lastLogin).getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      }).length;
      
      const inactiveSellers = totalSellers - activeSellers;

      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-8 max-w-7xl mx-auto pb-16"
        >
          {/* HEADER DA CENTRAL */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-cyber-dark/40 backdrop-blur-3xl p-8 rounded-3xl border border-white/10 shadow-2xl">
             <div>
                <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none flex items-center gap-3">
                  <ShieldCheck size={36} className="text-neon-purple animate-pulse" />
                  Painel Administrativo
                </h1>
                <p className="text-[10px] font-black text-neon-blue uppercase tracking-[0.3em] mt-2">Métricas de Engajamento & Atividade</p>
             </div>
             <motion.button 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.90 }}
               animate={clickingNavItem === NavItem.Resumos ? { scale: 0.90 } : { scale: 1 }}
               onClick={() => navigateWithFeedback(NavItem.Resumos)} 
               className="bg-white/5 text-white/40 hover:text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase border border-white/10 transition-all cursor-pointer outline-none"
             >
               Voltar ao Início
             </motion.button>
          </div>

          {/* INDICADORES GERAIS (BENTO GRID STYLE) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-cyber-dark/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
              <div className="absolute top-0 right-0 w-24 h-24 bg-neon-blue/5 rounded-full blur-[60px] pointer-events-none"></div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Vendedores Cadastrados</span>
                <Users size={20} className="text-neon-blue/80" />
              </div>
              <div>
                <div className="text-4xl font-black text-white leading-none">{totalSellers}</div>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Parceiros Registrados</p>
              </div>
            </div>

            <div className="bg-cyber-dark/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
              <div className="absolute top-0 right-0 w-24 h-24 bg-neon-green/5 rounded-full blur-[60px] pointer-events-none"></div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Ativos (Últimos 3 dias)</span>
                <Clock size={20} className="text-neon-green/80" />
              </div>
              <div>
                <div className="text-4xl font-black text-neon-green leading-none">{activeSellers}</div>
                <p className="text-[8px] font-bold text-neon-green/60 uppercase tracking-widest mt-1">
                  {totalSellers > 0 ? `${((activeSellers/totalSellers)*100).toFixed(0)}% de engajamento` : '---'}
                </p>
              </div>
            </div>

            <div className="bg-cyber-dark/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
              <div className="absolute top-0 right-0 w-24 h-24 bg-neon-purple/5 rounded-full blur-[60px] pointer-events-none"></div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Inativos Críticos</span>
                <Clock size={20} className="text-neon-purple/80 animate-pulse" />
              </div>
              <div>
                <div className="text-4xl font-black text-rose-500 leading-none">{inactiveSellers}</div>
                <p className="text-[8px] font-bold text-rose-500/60 uppercase tracking-widest mt-1">Precisam de suporte</p>
              </div>
            </div>

            <div className="bg-cyber-dark/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between h-36">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/5 rounded-full blur-[60px] pointer-events-none"></div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Ações Registradas</span>
                <Database size={20} className="text-amber-400/80" />
              </div>
              <div>
                <div className="text-4xl font-black text-amber-400 leading-none">{accessLogs.length}</div>
                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Audit Trail de Acessos</p>
              </div>
            </div>
          </div>

          {/* FILTRO E LISTA DE PARCEIROS */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              <h2 className="text-lg font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
                👥 Painel de Acompanhamento Individual
              </h2>
              <div className="relative max-w-md w-full">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por nome, loja ou email..."
                  className="w-full bg-cyber-dark/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-neon-purple transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredVendedores.length === 0 ? (
                <div className="bg-cyber-dark/20 p-8 rounded-3xl border border-white/5 text-center text-white/40 text-xs py-12 md:col-span-2">
                  Nenhum usuário correspondente à pesquisa foi encontrado.
                </div>
              ) : (
                filteredVendedores.map((v) => {
                  const stat = getInactivityDaysMessage(v.lastLogin);
                  // Dynamic supportive friendly message to show interest without nagging/demanding
                  const messageText = `Olá ${v.firstName}! Tudo bem? Passando para ver como estão as coisas por aí e se está precisando de alguma ajuda com as vendas ou metas do Conquista App. Conte comigo se precisar de algum suporte ou tirar dúvidas. Tamo junto!`;
                  
                  return (
                    <div 
                      key={v.id} 
                      className="bg-cyber-dark/40 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] hover:shadow-[0_0_20px_rgba(255,255,255,0.02)] transition-all flex flex-col justify-between space-y-5"
                    >
                      {/* Top Info */}
                      <div className="flex gap-4 items-start">
                        <img 
                          src={v.photoUrl || "https://picsum.photos/seed/" + v.id + "/100/100"} 
                          alt={v.firstName}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-2xl object-cover border border-white/15 shadow-md bg-cyber-black flex-shrink-0"
                        />
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-sm text-white truncate leading-none">{v.firstName} {v.lastName}</h3>
                            <span className={`text-[8px] px-2 py-1 rounded-full font-black uppercase tracking-wider border ${stat.color}`}>
                              {stat.text}
                            </span>
                          </div>
                          <p className="text-[10px] font-black text-neon-blue uppercase tracking-widest">{v.store || 'Loja Não Definida'}</p>
                          <p className="text-[10px] font-medium text-white/40 truncate">{v.email}</p>
                        </div>
                      </div>

                      {/* Diagnostic Helper Section */}
                      <div className="bg-cyber-black/40 border border-white/5 p-4 rounded-2xl text-[10px] space-y-2">
                        <div className="flex justify-between text-white/50">
                          <span>ÚLTIMA INTERAÇÃO:</span>
                          <span className="font-extrabold text-white">
                            {v.lastLogin ? new Date(v.lastLogin).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nunca registrado'}
                          </span>
                        </div>
                        {stat.days > 3 && (
                          <div className="text-rose-400 font-bold bg-rose-500/5 p-2 rounded-xl border border-rose-500/10 text-[9px]">
                            ⚠️ Este parceiro está há {stat.days === 999 ? 'muito tempo' : `${stat.days} dias`} sem registrar atividades.
                          </div>
                        )}
                      </div>

                      {/* Quick Cooperative Actions Row */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setViewingVendedorId(v.id);
                            navigateWithFeedback(NavItem.Resumos);
                          }}
                          className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest outline-none transition-colors"
                        >
                          Analisar Vendas
                        </motion.button>

                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const wspUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
                            window.open(wspUrl, '_blank');
                          }}
                          className="bg-neon-purple text-white hover:bg-neon-purple/90 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest outline-none transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-neon-purple/20"
                        >
                          <MessageCircle size={14} />
                          Apoio WhatsApp
                        </motion.button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* REALTIME ACCESS STREAM */}
          <div className="bg-cyber-dark/40 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            <h2 className="text-lg font-black text-white italic tracking-tighter uppercase flex items-center gap-2">
              ⚡ Atividade Coletiva Recente
            </h2>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto space-y-3 pr-2">
              {accessLogs.length === 0 ? (
                <div className="text-center text-white/30 text-xs py-8">
                  Nenhuma atividade de acesso registrada no Supabase ainda.
                </div>
              ) : (
                accessLogs.slice(0, 50).map((log) => {
                  const logDate = new Date(log.timestamp);
                  return (
                    <div key={log.id} className="flex justify-between items-center py-3 text-xs gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-neon-blue drop-shadow-[0_0_4px_#00f2ff]"></div>
                        <div>
                          <span className="font-extrabold text-white">{log.userName}</span>
                          <span className="text-white/40 ml-2">({log.store})</span>
                          <span className="text-neon-purple/80 font-black uppercase text-[8px] tracking-wider ml-3 bg-neon-purple/10 px-2 py-0.5 rounded-full">
                            {log.action === 'access' ? 'Acessou' : log.action}
                          </span>
                        </div>
                      </div>
                      <span className="text-white/30 font-mono text-[10px]">
                        {logDate.toLocaleDateString('pt-BR')} {logDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      );
    }

    if (activeNav === NavItem.ResumoPedido) {
      const filteredSalesByDate = savedSales.filter(s => {
        if (!s.timestamp) return true;
        const saleDate = new Date(s.timestamp).toISOString().split('T')[0];
        const isAfterStart = startDate ? saleDate >= startDate : true;
        const isBeforeEnd = endDate ? saleDate <= endDate : true;
        return isAfterStart && isBeforeEnd;
      });

      const activeSalesInPeriod = filteredSalesByDate.filter(s => s.status !== 'cancelado');
      const totalPeriodo = activeSalesInPeriod.reduce((acc, s) => acc + s.total, 0);

      const shareAllSales = () => {
        if (filteredSalesByDate.length === 0) return;
        
        const activeSales = filteredSalesByDate.filter(s => s.status !== 'cancelado');
        const totalGeral = activeSales.reduce((acc, s) => acc + s.total, 0);
        
        let text = `📋 *RELATÓRIO DE PEDIDOS - CONQUISTA APP*\n`;
        text += `Período: ${startDate || 'Início'} a ${endDate || 'Hoje'}\n`;
        text += `Vendedor: ${user?.firstName || 'Vendedor'}\n`;
        text += `Total de Pedidos Ativos: ${activeSales.length}\n`;
        text += `Valor Total: ${formatBRL(totalGeral)}\n`;
        text += `----------------------------------\n\n`;
        
        filteredSalesByDate.forEach((s) => {
          const date = s.timestamp ? new Date(s.timestamp).toLocaleDateString('pt-BR') : '---';
          const isCancelled = s.status === 'cancelado';
          
          text += `*Pedido #${s.numeroPedido}* (${date})${isCancelled ? ' [CANCELADO]' : ''}\n`;
          text += `Valor: ${isCancelled ? 'R$ 0,00 (Cancelado)' : formatBRL(s.total)}\n`;
          if (s.clienteId) {
            const cliente = customers.find(c => c.id === s.clienteId);
            if (cliente) text += `Cliente: ${cliente.nome}\n`;
          }
          text += `----------------------------------\n`;
        });

        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
      };

      return (
        <div className="content-section py-2 px-2 space-y-6 animate-in slide-in-from-bottom-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
             <div>
                <h2 className="text-xl font-black text-gray-800 italic tracking-tighter uppercase leading-none">Histórico</h2>
                <span className="text-[8px] font-black text-purple-600 tracking-[0.3em] uppercase">Todos os Pedidos</span>
             </div>
             <div className="flex gap-2">
               {filteredSalesByDate.length > 0 && (
                 <button 
                   onClick={shareAllSales}
                   className="bg-emerald-500 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2"
                 >
                   <MessageCircle size={14} />
                   Enviar Tudo
                 </button>
               )}
               <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.90 }}
                 animate={clickingNavItem === NavItem.Resumos ? { scale: 0.90 } : { scale: 1 }}
                 onClick={() => navigateWithFeedback(NavItem.Resumos)} 
                 className="bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase border border-gray-200 cursor-pointer outline-none"
               >
                 Voltar
               </motion.button>
             </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest italic">Filtrar Período</span>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Início</label>
                  <input 
                    type="date" 
                    value={startDate}
                    className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-[10px] font-bold text-gray-800 outline-none focus:border-purple-500"
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fim</label>
                  <input 
                    type="date" 
                    value={endDate}
                    className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-[10px] font-bold text-gray-800 outline-none focus:border-purple-500"
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filteredSalesByDate.length > 0 && (
              <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total no Período</span>
                  <span className="text-lg font-black text-emerald-600 leading-none mt-1">{formatBRL(totalPeriodo)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pedidos</span>
                  <span className="text-lg font-black text-gray-800 leading-none mt-1 block">{activeSalesInPeriod.length}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
             {filteredSalesByDate.length === 0 ? (
               <div className="bg-white p-10 rounded-3xl text-center border border-gray-200 shadow-sm">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum pedido neste período</p>
               </div>
             ) : (
               filteredSalesByDate.map((sale, i) => {
                 if (!sale) return null;
                 const saleDate = sale.timestamp ? new Date(sale.timestamp) : null;
                 const isValidDate = saleDate && !isNaN(saleDate.getTime());
                 return (
                   <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                      <button 
                        onClick={() => setSelectedSale(sale)}
                        className="flex flex-col text-left hover:opacity-70 transition-opacity"
                      >
                         <span className="text-[10px] font-black text-purple-600 underline decoration-purple-200 underline-offset-4">#{sale.numeroPedido || '---'}</span>
                         <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">
                           {isValidDate ? saleDate.toLocaleDateString('pt-BR') : '---'} {isValidDate ? saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                         </span>
                      </button>
                      <div className="flex flex-col items-end gap-1">
                         <div className="text-[11px] font-black text-emerald-600">{formatBRL(sale.total)}</div>
                         <div className="flex gap-2">
                           {sale.status === 'cancelado' ? (
                             <span className="text-[8px] font-black text-red-500 uppercase">Cancelado</span>
                           ) : (
                             <button 
                               onClick={() => cancelSale(sale)}
                               className="text-[8px] font-black text-red-500 uppercase underline"
                             >
                               Cancelar
                             </button>
                           )}
                           <button 
                             onClick={() => setSaleToDelete(sale)}
                             className="text-[8px] font-black text-gray-400 uppercase underline"
                           >
                             Excluir
                           </button>
                         </div>
                      </div>
                   </div>
                 );
               })
             )}
          </div>
        </div>
      );
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="content-section py-2 px-2 space-y-6"
      >
        <div className="bg-white p-6 rounded-3xl border border-gray-200 flex items-center justify-between shadow-sm">
           <div>
              <h2 className="text-xl font-black text-gray-800 italic tracking-tighter uppercase leading-none">V&C Hub</h2>
              <span className="text-[8px] font-black text-purple-600 tracking-[0.3em] uppercase">Gestão de Vendas</span>
           </div>
           <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.90 }}
             animate={clickingNavItem === NavItem.AdicionarVenda ? { scale: 0.90 } : { scale: 1 }}
             onClick={() => navigateWithFeedback(NavItem.AdicionarVenda)} 
             className="bg-purple-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-purple-500/20 transition-all outline-none"
           >
             Novo Pedido
           </motion.button>
        </div>

        {/* Status de Conexão */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full w-fit text-[8px] font-black uppercase tracking-widest ${isOnline ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
           {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
           {isOnline ? 'Sincronizado Cloud' : 'Modo Offline'}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest italic">Performance Semanal</span>
              <BarChart size={18} className="text-purple-600" />
           </div>
           
           <div className="h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <RechartsBarChart data={savedSales.slice(0, 7).reverse()}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                 <XAxis 
                   dataKey="data" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 900 }} 
                 />
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   itemStyle={{ color: '#9333ea', fontSize: '10px', fontWeight: 'bold' }}
                   labelStyle={{ color: '#64748b', fontSize: '8px', marginBottom: '4px' }}
                 />
                 <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                   {savedSales.slice(0, 7).reverse().map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={index === 6 ? '#9333ea' : '#e2e8f0'} />
                   ))}
                 </Bar>
               </RechartsBarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest italic">Nível de Performance: {stats.level}</span>
              <CloudLightning size={18} className="text-purple-600 animate-pulse" />
           </div>
           <div className="space-y-6">
              {[
                { label: 'Venda Geral', current: stats.pPerc, color: 'bg-purple-600' },
                { label: 'Assistência', current: stats.aPerc, color: 'bg-emerald-500' },
                { label: 'Impermeab.', current: stats.iPerc, color: 'bg-indigo-500' },
              ].map((cat) => (
                <div key={cat.label} className="space-y-2">
                   <div className="flex justify-between text-[10px] font-black uppercase">
                      <span className="text-gray-500">{cat.label}</span>
                      <span className="text-gray-900">{(cat.current * 100).toFixed(1)}%</span>
                   </div>
                   <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(cat.current * 100, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${cat.color} rounded-full`}
                      />
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
              <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Faturamento</span>
              <div className="text-lg font-black text-gray-900">{formatBRL(stats.faturamentoGeral)}</div>
           </div>
            <motion.button 
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveNav(NavItem.Relatorios)}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-black/5 text-left transition-all group relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-12 -mt-12 blur-xl group-hover:bg-purple-100 transition-colors"></div>
               <span className="text-[9px] font-black text-purple-600 uppercase block mb-1 relative z-10 italic">Relatórios Avançados</span>
               <div className="text-xl font-black text-gray-900 flex items-center gap-3 relative z-10 transition-transform group-hover:translate-x-2">
                 Ver Detalhado <BarChart size={20} className="text-purple-600" />
               </div>
               <div className="mt-3 text-[10px] font-bold text-gray-400 relative z-10">
                 Análise completa de conversão e bônus
               </div>
            </motion.button>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-[0.3em]">Detalhamento de Ganhos</h3>
              <div className="text-2xl font-black text-purple-600">{formatBRL(stats.ganhosTotais)}</div>
           </div>
           
           <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 border border-gray-100">
                 <span className="text-[9px] font-bold text-gray-500 uppercase">Comissão Produtos (2.2%)</span>
                 <span className="text-[11px] font-black text-gray-900">{formatBRL(stats.comissaoProdutos)}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 border border-gray-100">
                 <span className="text-[9px] font-bold text-gray-500 uppercase">Comissão Garantia</span>
                 <span className="text-[11px] font-black text-gray-900">{formatBRL(stats.comissaoAssistencia)}</span>
              </div>
              {stats.bonusGarantia > 0 && (
                <div className="flex justify-between items-center p-4 rounded-2xl bg-purple-50 border border-purple-100">
                   <span className="text-[9px] font-bold text-purple-600 uppercase">Bônus Garantia (Acelerador)</span>
                   <span className="text-[11px] font-black text-purple-600">{formatBRL(stats.bonusGarantia)}</span>
                </div>
              )}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 border border-gray-100">
                 <span className="text-[9px] font-bold text-gray-500 uppercase">Bônus Serviços Fixos</span>
                 <span className="text-[11px] font-black text-gray-900">{formatBRL(stats.bonusServicos)}</span>
              </div>
              {stats.bonusAcelerador > 0 && (
                <div className="flex justify-between items-center p-4 rounded-2xl bg-purple-50 border border-purple-100">
                   <span className="text-[9px] font-bold text-purple-600 uppercase">Bônus Acelerador (Nível {stats.level})</span>
                   <span className="text-[11px] font-black text-purple-600">{formatBRL(stats.bonusAcelerador)}</span>
                </div>
              )}
           </div>
        </div>

        <div className="space-y-3">
           <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Últimas Atividades</h3>
           {filteredSales.slice(0, 5).map((sale, i) => {
             if (!sale) return null;
             return (
               <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                  <button 
                    onClick={() => setSelectedSale(sale)}
                    className="flex flex-col text-left hover:opacity-70 transition-opacity"
                  >
                     <span className="text-[10px] font-black text-purple-600 underline decoration-purple-200 underline-offset-4">#{sale.numeroPedido || '---'}</span>
                     <span className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">{sale.data || '---'}</span>
                  </button>
                  <div className="text-right">
                     <div className="text-[11px] font-black text-emerald-600">{formatBRL(sale.bonusTotal)}</div>
                     <div className="text-[8px] font-bold text-gray-400 uppercase">Bônus</div>
                  </div>
               </div>
             );
           })}
        </div>
      </motion.div>
    );
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Carregando...</div>;

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-cyber-black flex flex-col selection:bg-neon-blue/30 overflow-hidden font-sans text-white">
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Abstract background elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-neon-blue/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-neon-purple/5 rounded-full blur-[120px]"></div>
        </div>

        <Header performancePercent={stats.pPerc} onNavigate={navigateWithFeedback} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
          {renderContent()}
        </main>

        {/* BOTÃO FLUTUANTE DIRETO */}
        <div className="fixed bottom-8 right-8 z-40">
           <motion.button 
             whileHover={{ scale: 1.1 }}
             whileTap={{ scale: 0.90 }}
             animate={clickingNavItem === NavItem.AdicionarVenda ? { scale: 0.90 } : { scale: 1 }}
             onClick={() => navigateWithFeedback(NavItem.AdicionarVenda)} 
             className="w-16 h-16 bg-neon-blue text-black rounded-2xl flex items-center justify-center shadow-[0_0_20px_#00f2ff] hover:bg-neon-green hover:shadow-[0_0_30px_#39ff14] group outline-none"
           >
              <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
           </motion.button>
        </div>
      </div>

      {/* Modal de Detalhes do Pedido */}
      {selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-cyber-black/60 backdrop-blur-md" onClick={() => setSelectedSale(null)}></div>
          <div className="relative bg-cyber-dark/80 backdrop-blur-2xl w-full max-w-md rounded-3xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue to-neon-purple"></div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">Pedido #{selectedSale.numeroPedido}</h3>
                  <p className="text-[10px] font-black text-neon-blue uppercase tracking-[0.3em]">{selectedSale.data}</p>
                </div>
                <button onClick={() => setSelectedSale(null)} className="bg-white/5 text-white/40 px-3 py-2 rounded-xl font-black text-[10px] uppercase border border-white/10 hover:bg-white/10 transition-colors">
                  Fechar
                </button>
              </div>

              <div className="space-y-4">
                  {(selectedSale.dataRetorno || selectedSale.descricaoRetorno) && (
                    <div className="bg-neon-purple/5 p-5 rounded-2xl border border-neon-purple/20">
                      <span className="text-[8px] font-black text-neon-purple uppercase block mb-3 drop-shadow-[0_0_5px_rgba(188,19,254,0.5)]">Protocolo de Retorno</span>
                      <div className="space-y-2">
                        {selectedSale.dataRetorno && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neon-purple/50 uppercase">Data Agendada</span>
                            <span className="text-white font-black">{new Date(selectedSale.dataRetorno).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                        {selectedSale.descricaoRetorno && (
                          <div className="text-[11px] text-white/80 font-bold mt-2 pt-2 border-t border-white/5">
                            {selectedSale.descricaoRetorno}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-[8px] font-black text-white/20 uppercase block mb-3">Composição Neural da Venda</span>
                  <div className="space-y-3">
                    {selectedSale.clienteId && (
                      <div className="flex justify-between text-[11px] border-b border-white/5 pb-2 mb-2">
                        <span className="text-white/40 uppercase">Cliente</span>
                        <span className="text-neon-blue font-black">{customers.find(c => c.id === selectedSale.clienteId)?.nome || 'ID Desconhecido'}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/40 uppercase">Módulos de Produto</span>
                      <span className="text-white font-bold">{formatBRL(selectedSale.valorProduto || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/40 uppercase">Assistência Técnica</span>
                      <span className="text-white font-bold">{formatBRL(selectedSale.valorAssistencia || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-white/40 uppercase">Blindagem (Imperm.)</span>
                      <span className="text-white font-bold">{formatBRL(selectedSale.valorImpermeabilizacao || 0)}</span>
                    </div>
                  </div>
                </div>

                {Array.isArray(selectedSale.servicosExtras) && selectedSale.servicosExtras.length > 0 && (
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                    <span className="text-[8px] font-black text-white/20 uppercase block mb-3">Serviços Adicionais</span>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedSale.servicosExtras.map((serv, idx) => (
                        <span key={idx} className="px-3 py-1 bg-neon-blue/10 border border-neon-blue/20 rounded-lg text-[9px] font-black text-neon-blue uppercase">
                          {serv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neon-green/10 p-5 rounded-2xl border border-neon-green/20">
                    <span className="text-[8px] font-black text-neon-green uppercase block mb-1">Redimento</span>
                    <div className="text-xl font-black text-neon-green drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]">{formatBRL(selectedSale.bonusTotal)}</div>
                  </div>
                  <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                    <span className="text-[8px] font-black text-white/40 uppercase block mb-1">Faturamento</span>
                    <div className="text-xl font-black text-white">{formatBRL(selectedSale.total)}</div>
                  </div>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-[8px] font-black text-white/20 uppercase block mb-1">Detalhamento de Fluxo</span>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40 uppercase">Comissão Base (2.2%)</span>
                    <span className="text-white font-bold">{formatBRL(selectedSale.comissaoProduto)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40 uppercase">Bônus de Interface</span>
                    <span className="text-white font-bold">{formatBRL(selectedSale.bonusTotal - selectedSale.comissaoProduto)}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  const items = [];
                  if (selectedSale.valorProduto > 0) items.push("Produto");
                  if (selectedSale.valorAssistencia > 0) items.push("Assistência");
                  if (selectedSale.valorImpermeabilizacao > 0) items.push("Impermeabilização");
                  if (selectedSale.servicosExtras && selectedSale.servicosExtras.length > 0) items.push(...selectedSale.servicosExtras);

                  const text = `Relatório Quantum Pedido #${selectedSale.numeroPedido}\n` +
                    `Data Sincra: ${selectedSale.data}\n` +
                    `Faturamento: ${formatBRL(selectedSale.total)}\n` +
                    `Ganhos: ${formatBRL(selectedSale.bonusTotal)}\n` +
                    `-------------------\n` +
                    `Módulos: ${items.join(', ')}`;
                  
                  if (navigator.share) {
                    navigator.share({ title: `Fluxo ${selectedSale.numeroPedido}`, text });
                  } else {
                    navigator.clipboard.writeText(text);
                    alert('Log copiado para interface neural!');
                  }
                }}
                className="w-full py-5 bg-neon-blue text-black rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-95 transition-all hover:bg-neon-green hover:shadow-[0_0_30px_rgba(57,255,20,0.4)]"
              >
                Transmitir Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {saleToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-red-100"
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-4 mx-auto border border-red-100">
              <RotateCcw size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter text-center mb-2">Excluir Pedido?</h3>
            <p className="text-[10px] font-bold text-gray-400 mb-8 uppercase text-center leading-relaxed">
              Você está prestes a excluir o pedido <span className="text-red-500">#{saleToDelete.numeroPedido}</span>. Esta ação removerá os dados do servidor.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setSaleToDelete(null)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-black text-[10px] uppercase border border-gray-200"
              >
                Voltar
              </button>
              <button 
                onClick={() => deleteSale(saleToDelete)}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-500/20"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default App;
