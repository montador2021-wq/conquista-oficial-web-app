
import React from 'react';
import { Search, Bell, Cpu, Target, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

import { NavItem } from '../tipos';

interface HeaderProps {
  performancePercent?: number;
  onNavigate?: (item: NavItem) => void;
}

const Header: React.FC<HeaderProps> = ({ performancePercent = 72, onNavigate }) => {
  return (
    <header className="h-24 flex items-center justify-between px-6 md:px-10 lg:px-14 sticky top-0 z-40 bg-cyber-dark/40 backdrop-blur-2xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="flex-1 max-w-lg">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-blue transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="PESQUISAR NO ECOSSISTEMA..." 
            className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-neon-blue/5 focus:border-neon-blue/50 transition-all text-[11px] font-black tracking-widest text-white/80 placeholder:text-white/20 uppercase"
          />
        </div>
      </div>
      
      <div className="hidden lg:flex items-center gap-8 mx-10">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-neon-blue" />
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Meta de Vendas</span>
            <span className="text-[10px] font-black text-neon-blue">{(performancePercent * 100).toFixed(0)}%</span>
          </div>
          <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full shadow-[0_0_15px_rgba(0,242,255,0.4)] transition-all duration-1000 ease-out" 
              style={{ width: `${Math.min(performancePercent * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 bg-neon-blue/5 border border-neon-blue/20 rounded-xl shadow-[0_0_15px_rgba(0,242,255,0.05)]">
          <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse shadow-[0_0_8px_#00f2ff]"></div>
          <span className="text-[9px] font-black text-neon-blue uppercase tracking-[0.2em]">Sincronia Estável</span>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.90 }}
          className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-neon-blue hover:bg-white/10 hover:shadow-[0_0_20px_rgba(0,242,255,0.1)] transition-all relative border border-white/10 outline-none"
        >
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-neon-purple rounded-full border-2 border-cyber-dark ring-2 ring-neon-purple/20"></span>
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.90 }}
          onClick={() => onNavigate?.(NavItem.Meta)}
          title="Ver Minhas Metas"
          className="w-11 h-11 flex items-center justify-center bg-white/5 rounded-2xl text-white/40 hover:text-neon-blue hover:bg-white/10 hover:shadow-[0_0_20px_rgba(0,242,255,0.1)] transition-all border border-white/10 outline-none"
        >
          <TrendingUp size={20} />
        </motion.button>
      </div>
    </header>
  );
};

export default Header;
