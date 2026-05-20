import React, { useState } from 'react';
import { auth, db } from '../src/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { User } from '../src/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  Building,
  KeyRound,
  Chrome
} from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'google'>('credentials');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [store, setStore] = useState('Loja Centro'); // Default selectable store
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      setError('O login do Google falhou no simulador (pop-ups bloqueados em iFrames). Use o login por E-mail e Senha ao lado ou abra em uma nova aba.');
      setLoading(false);
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      // App.tsx automatically handles user persistence onAuthStateChanged,
      // but let's give a friendly UI feedback
      setSuccess('Conexão estabelecida com sucesso!');
    } catch (err: any) {
      console.error('Erro ao autenticar com e-mail/senha:', err);
      let errorMsg = 'E-mail ou senha incorretos.';
      if (err.code === 'auth/user-not-found') {
        errorMsg = 'Nenhum usuário encontrado com este e-mail. Se ainda não possui acesso, mude para a aba "Criar Acesso".';
      } else if (err.code === 'auth/wrong-password') {
        errorMsg = 'Senha incorreta. Por favor, verifique seus dados.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Formato de e-mail inválido.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Acesso temporariamente bloqueado por excesso de tentativas. Tente novamente mais tarde.';
      }
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName || !store) {
      setError('Por favor, preencha todos os campos para cadastrar o vendedor.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;

      // 2. Criar e salvar o registro detalhado correspondente no Firestore
      const newUser: User = {
        id: uid,
        email: email.trim().toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        store: store,
        password: 'credentials-protected',
        role: email.trim().toLowerCase() === 'montador2021@gmail.com' ? 'admin' : 'vendedor',
        lastLogin: new Date().toISOString(),
        photoUrl: `https://picsum.photos/seed/${uid}/100/100`
      };

      await setDoc(doc(db, 'users', uid), newUser);
      
      setSuccess('Conta de vendedor ativa com sucesso!');
      setIsRegisterMode(false);
      setLoading(false);
    } catch (err: any) {
      console.error('Erro no cadastro do vendedor:', err);
      let errorMsg = 'Ocorreu um erro ao criar a conta.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'Este e-mail já está cadastrado em nossa rede.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Formato de e-mail inválido.';
      }
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05020a] flex flex-col items-center justify-center p-4 relative overflow-y-auto">
      {/* Background Glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[430px] bg-[#0c0714]/60 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,242,255,0.08)] border border-white/5 p-6 space-y-6 relative overflow-hidden z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500"></div>
        
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-[#0c0714] border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_20px_rgba(34,211,238,0.15)] transform -rotate-3 hover:rotate-0 transition-all duration-500 group">
            <ShieldCheck size={32} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter leading-none italic uppercase">
              <span className="text-white">CONQUISTA</span> <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">APP</span>
            </h1>
            <p className="text-[8px] font-black uppercase text-cyan-400/60 tracking-[0.4em] mt-2">Quantum Neural Interface</p>
          </div>
        </div>

        {/* Tab Selector when NOT in register mode */}
        {!isRegisterMode && (
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => { setActiveTab('credentials'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'credentials' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/15' : 'text-slate-400 hover:text-white'}`}
            >
              <KeyRound size={12} />
              Acesso Direto
            </button>
            <button
              onClick={() => { setActiveTab('google'); setError(null); }}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'google' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/15' : 'text-slate-400 hover:text-white'}`}
            >
              <Chrome size={12} />
              Google Sign-In
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isRegisterMode ? (
            /* REGISTER FORM */
            <motion.form 
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRegister}
              className="space-y-4"
            >
              <div className="text-center">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Novo Cadastro Corporativo</h3>
                <p className="text-[10px] text-gray-400 mt-1">Insira suas informações de vendedor para ingressar.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Nome</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ex: João"
                    className="w-full bg-[#0c0714] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 transition-all outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Sobrenome</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Ex: Silva"
                    className="w-full bg-[#0c0714] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Selecione sua Loja / Filial</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <select
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="w-full bg-[#0c0714] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="Loja Centro">Loja Centro</option>
                    <option value="Loja Shopping">Loja Shopping</option>
                    <option value="Loja Norte">Loja Norte</option>
                    <option value="Loja Sul">Loja Sul</option>
                    <option value="Showroom">Showroom V&C</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">E-mail de Trabalho</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vendedor@conquistacorp.com"
                    className="w-full bg-[#0c0714] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Escolha uma Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 dígitos"
                    className="w-full bg-[#0c0714] border border-white/10 rounded-2xl pl-11 pr-11 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-500 text-black py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-cyan-400 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-cyan-500/20"
              >
                {loading ? 'Sincronizando Rede...' : 'Ativar Acesso'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setError(null); }}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  Voltar para tela de Login
                </button>
              </div>
            </motion.form>
          ) : activeTab === 'credentials' ? (
            /* CREDENTIALS LOGIN */
            <motion.form 
              key="login-cred"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleCredentialsLogin}
              className="space-y-4"
            >
              <div className="text-center">
                <h3 className="text-xs font-bold text-white/90 uppercase tracking-widest">Canal de Credenciais Diretas</h3>
                <p className="text-[10px] text-gray-400 mt-1">Conecte-se de forma corporativa e privada.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu-email@vendedor.com"
                    className="w-full bg-[#0c0714] border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Senha Secreta</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Insira sua senha"
                    className="w-full bg-[#0c0714] border border-white/10 rounded-2xl pl-11 pr-11 py-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-500 text-black py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-cyan-400 active:scale-[0.98] transition-all duration-300 shadow-lg shadow-cyan-500/20"
              >
                {loading ? 'Sincronizando Canal...' : 'Entrar com Credenciais'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(true); setError(null); }}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  Novo por aqui? Criar Acesso
                </button>
              </div>
            </motion.form>
          ) : (
            /* GOOGLE OAUTH LOGIN */
            <motion.div
              key="login-google"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="text-center space-y-2">
                <h3 className="text-xs font-bold text-white/90 uppercase tracking-widest">Google Identity Service</h3>
                <p className="text-[10px] text-gray-400">
                  Acesso rápido integrado com Contas Google. 
                  <span className="block text-cyan-400/80 mt-1 font-semibold">Aviso: Se estiver no simulador, o Google bloqueará o pop-up por segurança. Prefira o "Acesso Direto" ao lado para testar aqui dentro!</span>
                </p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black text-sm hover:bg-white/10 hover:border-cyan-500/50 active:scale-[0.98] transition-all shadow-sm group"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#22d3ee"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#10b981"/>
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#f59e0b"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#ef4444"/>
                </svg>
                {loading ? 'Conectando...' : 'Entrar com Conta Google'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FEEDBACK SYSTEM */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 p-3 rounded-xl border border-red-500/20"
            >
              <p className="text-red-400 text-[10px] font-black uppercase text-center tracking-widest leading-relaxed">
                {error}
              </p>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20"
            >
              <p className="text-emerald-400 text-[10px] font-black uppercase text-center tracking-widest">
                {success}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center pt-2">
          <p className="text-[8px] text-white/20 font-bold uppercase tracking-[0.2em] leading-relaxed">
            Acesso restrito ao pessoal autorizado <br/> Protocolos de segurança V&C ativos.
          </p>
        </div>
      </motion.div>
      
      <div className="mt-8 flex flex-col items-center gap-3 z-10">
        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em]">Quantum Interface v3.0 // V&C Corp</p>
        <div className="flex items-center gap-3 bg-[#0c0714]/50 px-4 py-1.5 rounded-full border border-white/5">
          <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981] animate-pulse"></div>
          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Nódulos Estáveis</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
