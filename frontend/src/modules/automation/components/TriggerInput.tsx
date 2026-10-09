import { useState, KeyboardEvent } from 'react';
import { HiMiniXMark, HiMiniPlus, HiMiniChatBubbleOvalLeft } from "react-icons/hi2";

interface TriggerInputProps {
  triggers: string[];
  onChange: (triggers: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const TriggerInput: React.FC<TriggerInputProps> = ({
  triggers,
  onChange,
  placeholder = "Palabra clave...",
  disabled = false,
  className = ""
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const addTrigger = (trigger: string) => {
    const trimmed = trigger.trim().toLowerCase();
    if (trimmed && !triggers.includes(trimmed)) {
      onChange([...triggers, trimmed]);
    }
  };

  const removeTrigger = (index: number) => {
    onChange(triggers.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return;

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTrigger(inputValue);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && triggers.length > 0) {
      removeTrigger(triggers.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.includes(',')) {
      const newTriggers = value.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
      const uniqueNewTriggers = newTriggers.filter(t => !triggers.includes(t));
      onChange([...triggers, ...uniqueNewTriggers]);
      setInputValue('');
    } else {
      setInputValue(value);
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTrigger(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-2.5 min-h-[48px] p-2 bg-white/5 dark:bg-slate-900/50 rounded-[1.8rem] border border-emerald-100/50 dark:border-emerald-500/10 shadow-inner">
        {triggers.map((trigger, index) => (
          <div
            key={`${trigger}-${index}`}
            className="group animate-in zoom-in-95 duration-200 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-2xl text-[11px] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-500/20 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-default"
          >
            <HiMiniChatBubbleOvalLeft className="w-3.5 h-3.5 opacity-60" />
            <span>{trigger}</span>
            {!disabled && (
              <button
                onClick={() => removeTrigger(index)}
                className="ml-1 p-0.5 hover:bg-emerald-200/50 dark:hover:bg-emerald-500/20 rounded-lg text-emerald-500 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-300 transition-all"
                type="button"
                title="Eliminar"
              >
                <HiMiniXMark className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        
        {!disabled && (
          <div className="relative flex-1 min-w-[140px]">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={triggers.length === 0 ? placeholder : "Añadir..."}
              className="w-full h-full px-4 py-2 bg-transparent border-none text-[11px] font-bold text-slate-700 dark:text-slate-300 outline-none placeholder:text-slate-400 placeholder:font-bold placeholder:uppercase placeholder:tracking-widest"
              disabled={disabled}
            />
            {inputValue && (
              <button
                onClick={() => {
                  addTrigger(inputValue);
                  setInputValue('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-all animate-in zoom-in-50"
                type="button"
              >
                <HiMiniPlus className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between px-2">
         <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {triggers.length === 0 
              ? "Usa Enter para agregar disparadores"
              : `${triggers.length} ${triggers.length === 1 ? 'Palabra Clave Activa' : 'Palabras Clave Activas'}`
            }
         </p>
         {triggers.length > 0 && !disabled && (
            <button 
              onClick={() => onChange([])}
              className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-tighter transition-colors"
            >
              Borrar Todas
            </button>
         )}
      </div>
    </div>
  );
};
