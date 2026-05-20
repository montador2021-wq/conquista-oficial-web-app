import React, { useState } from 'react';
import { auth } from '../src/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { User } from '../src/types';
import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      setError('Erro ao conectar com Google. Tente abrir o app em uma nova aba.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-blue/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-green/10 rounded-full blur-[120px]"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[400px] bg-cyber-dark/40 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_50px_rgba(0,242,255,0.1)] border border-white/5 p-8 space-y-8 relative overflow-hidden z-10"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green"></div>
        
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-cyber-dark border border-neon-blue/30 rounded-2xl flex items-center justify-center text-neon-blue mx-auto shadow-[0_0_20px_rgba(0,242,255,0.2)] transform -rotate-3 hover:rotate-0 transition-all duration-500 group">
            <ShieldCheck size={40} className="group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter leading-none italic">
              <span className="text-white">CONQUISTA</span> <span className="text-neon-blue drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]">APP</span>
            </h1>
            <p className="text-[9px] font-black uppercase text-neon-blue/60 tracking-[0.4em] mt-3">Quantum Neural Interface</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-sm font-bold text-white/90 mb-1">Boas-vindas ao Amanhã</h3>
            <p className="text-[10px] text-gray-400 font-medium">Autenticação biométrica corporativa requerida.</p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black text-sm hover:bg-white/10 hover:border-neon-blue/50 active:scale-[0.98] transition-all shadow-sm group"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#00f2ff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#39ff14"/>
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            {loading ? 'Sincronizando...' : 'Conectar Google'}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 p-3 rounded-xl border border-red-500/20"
            >
              <p className="text-red-400 text-[10px] font-black uppercase text-center tracking-widest">
                {error}
              </p>
            </motion.div>
          )}
        </div>

        <div className="text-center pt-2">
          <p className="text-[8px] text-white/20 font-bold uppercase tracking-[0.2em] leading-relaxed">
            Acesso restrito ao pessoal autorizado <br/> Protocolos de segurança V&C ativos.
          </p>
        </div>
      </motion.div>
      
      <div className="mt-8 flex flex-col items-center gap-3 z-10">
        <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em]">Quantum Interface v3.0 // V&C Corp</p>
        <div className="flex items-center gap-3 bg-cyber-dark/50 px-4 py-1.5 rounded-full border border-white/5">
          <div className="w-2 h-2 bg-neon-green rounded-full shadow-[0_0_8px_#39ff14] animate-pulse"></div>
          <span className="text-[8px] font-black text-neon-green uppercase tracking-widest">Nódulos Estáveis</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
