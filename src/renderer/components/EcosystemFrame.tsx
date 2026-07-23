import React from 'react';
import { Calculator } from 'lucide-react';
import { cn } from '../lib/utils';
import { MODULE_CONTENT } from '../lib/product-content';

type EcosystemKind = 'fiscal';

const ecosystemConfig = {
  fiscal: {
    eyebrow: MODULE_CONTENT.fiscal.ecosystemTitle,
    container: 'bg-white',
    header: 'border-emerald-200/60 bg-white shadow-sm',
    accent: 'bg-emerald-600',
    text: 'text-emerald-600',

    icon: Calculator,
  },
} satisfies Record<EcosystemKind, {
  eyebrow: string;
  container: string;
  header: string;
  accent: string;
  text: string;
  icon: any;
}>;

export const EcosystemFrame: React.FC<{ kind: EcosystemKind; children: React.ReactNode }> = ({ kind, children }) => {
  const config = ecosystemConfig[kind];
  return (
    <section className={cn('h-full min-h-0 flex flex-col overflow-hidden relative', config.container)}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.55] backdrop-mesh" />
      
      <div className="relative z-10 flex-1 min-h-0">
        {children}
      </div>
      <div className={cn('absolute left-0 top-0 h-full w-1.5 pointer-events-none z-30', config.accent)} />
      
      {/* Huge Watermark Icon */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-[0.015]">
        <config.icon className={cn("w-[300px] h-[300px] md:w-[400px] md:h-[400px]", config.text)} strokeWidth={0.5} />
      </div>
    </section>
  );
};
