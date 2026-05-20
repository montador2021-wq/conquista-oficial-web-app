import React, { useState } from 'react';
import { Targets } from '../tipos';
import { Save, RotateCcw, Target, ShieldCheck, Download, Wrench, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  targets: Targets;
  onSave: (newTargets: Targets) => Promise<void> | void;
  onClose: () => void;
  showInstallBtn?: boolean;
  onInstall?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ targets, onSave, onClose, showInstallBtn, onInstall }) => {
  const [tempTargets, setTempTargets] = useState<Targets>(targets);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(tempTargets);
    } finally {
      setIsSaving(false);
    }
  };

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      // Limpar caches do navegador
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Desregistrar Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // Recarregar a página forçando o servidor
      window.location.reload();
    } catch (err) {
      console.error("Erro ao forçar atualização:", err);
      window.location.reload();
    }
  };

  const handleLevelChange = (level: 1 | 2 | 3, field: 'threshold' | 'rate', value: number) => {
    setTempTargets({
      ...tempTargets,
      levels: {
        ...tempTargets.levels,
        [level]: {
          ...tempTargets.levels[level],
          [field]: value
        }
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20"
    >
      <div className="bg-white p-5 rounded-2xl border border-gray-200 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-black text-gray-800 italic tracking-tighter uppercase leading-none">Painel de Controle</h2>
          <span className="text-[8px] font-black text-purple-600 tracking-[0.3em] uppercase">Gestão de Metas e Performance</span>
        </div>
        <button onClick={onClose} className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl font-black text-[10px] uppercase border border-gray-200 hover:bg-gray-200 transition-all">Voltar</button>
      </div>

      <div className="space-y-4">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 opacity-40 group-hover:scale-125 duration-1000 transition-transform"></div>
          <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-3 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg">
              <Target size={16} />
            </div> 
            Configuração de Metas
          </h3>
          
          <div className="space-y-4">
            {['product', 'assistance', 'waterproofing'].map((key) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-[9px] font-black text-gray-500 uppercase flex items-center gap-2">
                  <input
                      type="checkbox"
                      checked={tempTargets.metaAtivacao?.[key as 'product'|'assistance'|'waterproofing'] ?? true}
                      onChange={(e) => setTempTargets({ 
                          ...tempTargets, 
                          metaAtivacao: { ...tempTargets.metaAtivacao, [key]: e.target.checked } 
                      })}
                  />
                  Meta {key === 'product' ? 'Produtos' : key === 'assistance' ? 'Assistência' : 'Impermeabilização'} (R$)
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</div>
                  <input 
                    type="number" 
                    value={tempTargets[key as 'product'|'assistance'|'waterproofing']}
                    onChange={(e) => setTempTargets({ ...tempTargets, [key]: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-4 text-gray-900 font-black text-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>
            ))}
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase block mb-2">Comissão Base Produto (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={tempTargets.productCommissionRate ?? 2.2}
                onChange={(e) => setTempTargets({ ...tempTargets, productCommissionRate: Number(e.target.value) })}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 font-bold focus:border-purple-500 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-6 shadow-sm">
          <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
            <Target size={14} /> Campanha de Incentivo
          </h3>
          <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-4">
              <label className="flex items-center gap-3 text-[10px] font-black text-gray-700 uppercase cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    checked={tempTargets.premiacaoExtra?.ativo ?? false} 
                    onChange={(e) => setTempTargets({...tempTargets, premiacaoExtra: {...tempTargets.premiacaoExtra, ativo: e.target.checked}})}
                  />
                  Ativar Campanha de Premiação
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Data Início</label>
                   <input type="date" value={tempTargets.premiacaoExtra?.dataInicio ?? ''} onChange={(e) => setTempTargets({...tempTargets, premiacaoExtra: {...tempTargets.premiacaoExtra, dataInicio: e.target.value}})} className="w-full p-3 border border-rose-100 rounded-xl text-xs font-bold bg-white text-gray-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"/>
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Data Fim</label>
                   <input type="date" value={tempTargets.premiacaoExtra?.dataFim ?? ''} onChange={(e) => setTempTargets({...tempTargets, premiacaoExtra: {...tempTargets.premiacaoExtra, dataFim: e.target.value}})} className="w-full p-3 border border-rose-100 rounded-xl text-xs font-bold bg-white text-gray-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Meta de Faturamento (R$)</label>
                   <div className="relative">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 font-black text-sm">R$</div>
                     <input type="number" placeholder="Ex: 20000" value={tempTargets.premiacaoExtra?.metaValor ?? 0} onChange={(e) => setTempTargets({...tempTargets, premiacaoExtra: {...tempTargets.premiacaoExtra, metaValor: Number(e.target.value)}})} className="w-full pl-10 pr-4 py-4 border border-rose-100 rounded-xl font-bold bg-white text-gray-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"/>
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Valor do Prêmio (R$)</label>
                   <div className="relative">
                     <div className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400 font-black text-sm">R$</div>
                     <input type="number" placeholder="Ex: 500" value={tempTargets.premiacaoExtra?.valorPremio ?? 0} onChange={(e) => setTempTargets({...tempTargets, premiacaoExtra: {...tempTargets.premiacaoExtra, valorPremio: Number(e.target.value)}})} className="w-full pl-10 pr-4 py-4 border border-rose-100 rounded-xl font-bold bg-white text-gray-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all"/>
                   </div>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-[9px] text-rose-500 font-bold italic leading-tight">
                  * O bônus será concedido se o faturamento total acumulado no período for maior ou igual à meta.
                </p>
              </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-6 shadow-sm">
          <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> Níveis de Acelerador
          </h3>
          
          {[1, 2, 3].map((lvl) => (
            <div key={lvl} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
              <span className="text-[9px] font-black text-gray-700 uppercase">Nível {lvl}</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-bold text-gray-500 uppercase block mb-1">Gatilho (%)</label>
                  <input 
                    type="number" 
                    value={tempTargets.levels[lvl as 1|2|3].threshold}
                    onChange={(e) => handleLevelChange(lvl as 1|2|3, 'threshold', Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 font-bold text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-gray-500 uppercase block mb-1">Bônus (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={tempTargets.levels[lvl as 1|2|3].rate}
                    onChange={(e) => handleLevelChange(lvl as 1|2|3, 'rate', Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-800 font-bold text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-6 shadow-sm">
          <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
            <Wrench size={14} /> Bônus de Serviços (R$)
          </h3>
          
          <div className="grid grid-cols-2 gap-4 font-sans">
            <div>
              <label className="text-[8px] font-bold text-gray-500 uppercase block mb-1">Montagem</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px]">R$</div>
                <input 
                  type="number" 
                  value={tempTargets.serviceBonuses.montagem}
                  onChange={(e) => setTempTargets({ ...tempTargets, serviceBonuses: { ...tempTargets.serviceBonuses, montagem: Number(e.target.value) } })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-2 py-2 text-gray-800 font-bold text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-gray-500 uppercase block mb-1">Lavagem</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px]">R$</div>
                <input 
                  type="number" 
                  value={tempTargets.serviceBonuses.lavagem}
                  onChange={(e) => setTempTargets({ ...tempTargets, serviceBonuses: { ...tempTargets.serviceBonuses, lavagem: Number(e.target.value) } })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-2 py-2 text-gray-800 font-bold text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-gray-500 uppercase block mb-1">Almofada</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px]">R$</div>
                <input 
                  type="number" 
                  value={tempTargets.serviceBonuses.almofada}
                  onChange={(e) => setTempTargets({ ...tempTargets, serviceBonuses: { ...tempTargets.serviceBonuses, almofada: Number(e.target.value) } })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-2 py-2 text-gray-800 font-bold text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-gray-500 uppercase block mb-1">Pés G-Roupa</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px]">R$</div>
                <input 
                  type="number" 
                  value={tempTargets.serviceBonuses.pes_guarda_roupa}
                  onChange={(e) => setTempTargets({ ...tempTargets, serviceBonuses: { ...tempTargets.serviceBonuses, pes_guarda_roupa: Number(e.target.value) } })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-2 py-2 text-gray-800 font-bold text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[8px] font-bold text-gray-500 uppercase block mb-1">Impermeab.</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px]">R$</div>
                <input 
                  type="number" 
                  value={tempTargets.serviceBonuses.impermeabilizacao_bonus}
                  onChange={(e) => setTempTargets({ ...tempTargets, serviceBonuses: { ...tempTargets.serviceBonuses, impermeabilizacao_bonus: Number(e.target.value) } })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-2 py-2 text-gray-800 font-bold text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-6 shadow-sm">
          <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
            <Target size={14} /> Prêmio Bônus por Pedido R$
          </h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-700">Ativar Bônus Fixo por Pedido</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={tempTargets.bonusPorPedido?.ativo ?? false}
                  onChange={(e) => setTempTargets({
                    ...tempTargets,
                    bonusPorPedido: {
                      ...(tempTargets.bonusPorPedido || { valor: 5 }),
                      ativo: e.target.checked
                    }
                  })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className={`transition-opacity duration-300 ${tempTargets.bonusPorPedido?.ativo ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <label className="text-[8px] font-bold text-gray-500 uppercase block mb-1">Valor do Bônus em Reais (R$)</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-bold text-sm">R$</div>
                <input 
                  type="number" 
                  step="0.5"
                  value={tempTargets.bonusPorPedido?.valor ?? 5}
                  onChange={(e) => setTempTargets({
                    ...tempTargets,
                    bonusPorPedido: {
                      ...(tempTargets.bonusPorPedido || { ativo: tempTargets.bonusPorPedido?.ativo ?? false }),
                      valor: Number(e.target.value)
                    }
                  })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-gray-800 font-bold text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {showInstallBtn && (
          <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 space-y-4 shadow-sm animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <Download className="text-purple-600" size={18} />
              <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Instalar Aplicativo</h3>
            </div>
            <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
              Instale o Conquista App no seu dispositivo para acesso rápido e offline, como um aplicativo nativo.
            </p>
            <button 
              onClick={onInstall}
              className="w-full py-4 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-all hover:bg-purple-700"
            >
              Instalar Agora
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button 
            onClick={() => setTempTargets(targets)}
            className="flex-1 py-4 bg-white text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-200 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-gray-50"
          >
            <RotateCcw size={14} /> Resetar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all ${
              isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 text-white shadow-purple-500/20 active:scale-95 hover:bg-purple-700'
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Save size={14} />
            )}
            {isSaving ? 'Gravando...' : 'Salvar Alterações'}
          </button>
        </div>

        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <RefreshCw className={`text-blue-600 ${isUpdating ? 'animate-spin' : ''}`} size={18} />
            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sincronizar Versão</h3>
          </div>
          <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
            Se o aplicativo estiver mostrando uma versão antiga, use este botão para forçar o carregamento da versão mais recente.
          </p>
          <button 
            onClick={handleForceUpdate}
            disabled={isUpdating}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {isUpdating ? 'Atualizando...' : 'Forçar Atualização'}
          </button>
        </div>

      </div>
    </motion.div>
  );
};

export default Settings;
