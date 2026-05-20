
import React from 'react';
import { NAVIGATION_ITEMS } from '../constants';
import { NavItem } from '../tipos';
import { Shield, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeItem: NavItem;
  onSelect: (item: NavItem) => void;
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem, onSelect, isCollapsed, setIsCollapsed }) => {
  // O sidebar agora tem um comportamento dinâmico por item
  // Se estiver colapsado globalmente, ele expande no hover para mostrar nomes
  const [isHovered, setIsHovered] = React.useState(false);
  const effectiveExpanded = !isCollapsed || isHovered;

  return (
    <aside 
      className="h-screen bg-cyber-black flex flex-col w-20 items-center py-6 border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.5)] z-50"
    >
      <div className="mb-10">
        <div className="bg-neon-blue/10 p-2.5 rounded-2xl border border-neon-blue/30 shadow-[0_0_15px_rgba(0,242,255,0.2)]">
          <Shield className="text-neon-blue" size={24} />
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-4 w-full px-2">
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = activeItem === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`w-full py-3.5 rounded-2xl transition-all duration-300 relative group flex flex-col items-center gap-2 ${
                isActive 
                  ? 'bg-neon-blue/10 text-neon-blue' 
                  : 'text-white/20 hover:text-white/60 hover:bg-white/5'
              }`}
              title={item.label}
            >
              <div className={`transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest text-center leading-none px-1 transition-colors ${
                isActive ? 'text-neon-blue' : 'text-white/20 group-hover:text-white/60'
              }`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-[3px] h-8 bg-neon-blue rounded-l-full shadow-[0_0_10px_#00f2ff]"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pb-6">
        <div className="w-10 h-10 rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:border-neon-blue/50 transition-colors cursor-pointer">
          <img 
            src="https://picsum.photos/seed/admin/100/100" 
            className="w-full h-full object-cover"
            alt="Usuário"
          />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
