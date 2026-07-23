import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppView } from '../types';
import { ArrowRight, Landmark, LogIn } from 'lucide-react';
import logoUrl from '../assets/logo-lockup-transparent.png';

interface IntroductionProps {
  onStart: (view: AppView) => void;
  user: any;
  onLogin: () => void | Promise<void>;
  onLogout: () => void;
  onLoadCase: (c: any) => void;
}

export const Introduction: React.FC<IntroductionProps> = ({
  onLogin,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  // Stagger variants for entry animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
        delayChildren: 0.2,
      }
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    }
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.95, filter: 'drop-shadow(0 0 0px rgba(197, 160, 89, 0))' },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'drop-shadow(0 15px 30px rgba(197, 160, 89, 0.15))',
      transition: {
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070b13] text-white font-sans relative flex items-center justify-center scrollbar-hide select-none">
      
      {/* ── Ambient Background Glows ─────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Soft center mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.8)_0%,#05080f_100%)]" />
        
        {/* Drifting glowing orbs */}
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.06)_0%,rgba(197,160,89,0)_70%)] filter blur-3xl"
        />
        
        <motion.div
          animate={{
            x: [0, -45, 25, 0],
            y: [0, 35, -30, 0],
            scale: [1, 0.85, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(30,58,95,0.15)_0%,rgba(30,58,95,0)_75%)] filter blur-3xl"
        />
        
        {/* Fine gold horizontal line */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-legal-gold/25 to-transparent" />
      </div>

      {/* ── Main Content Container ──────────────────────────── */}
      <main className="relative z-10 flex w-full items-center justify-center px-6 md:px-8 py-8">
        <AnimatePresence mode="wait">
          {!isEntering && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex w-full max-w-4xl flex-col items-center gap-8 text-center"
            >
              {/* Logo Area */}
              <motion.div variants={logoVariants} className="w-full flex justify-center relative z-10">
                {logoError ? (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <Landmark size={80} className="text-legal-gold drop-shadow-[0_0_20px_rgba(197,160,89,0.4)]" />
                  </div>
                ) : (
                  <div className="w-[320px] md:w-[480px] h-auto flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Logo Lex Corporativo"
                      className="w-full h-auto object-contain"
                      loading="eager"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                )}
              </motion.div>

              {/* Elegant Subtitle / Slogan */}
              <motion.div variants={itemVariants} className="flex flex-col items-center gap-2">
                <span className="text-[10px] md:text-xs font-bold tracking-[0.4em] text-legal-gold/80 uppercase">
                  Estación de Trabajo Jurídica Local
                </span>
                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-legal-gold/40 to-transparent mt-1" />
              </motion.div>

              {/* Login Button with Springy Interaction */}
              <motion.div variants={itemVariants} className="w-full max-w-md mt-6">
                <motion.button
                  onClick={async () => {
                    if (isEntering) return;
                    setIsEntering(true);
                    try {
                      await onLogin();
                    } catch {
                      setIsEntering(false);
                    }
                  }}
                  whileHover={{ 
                    scale: 1.02, 
                    y: -2,
                    boxShadow: "0 20px 40px -15px rgba(197,160,89,0.45)",
                  }}
                  whileTap={{ scale: 0.98, y: 0 }}
                  className="w-full max-w-xs mx-auto group relative flex items-center justify-center gap-3 overflow-hidden rounded-lg bg-legal-gold text-slate-950 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-colors duration-300 hover:bg-white hover:text-slate-950 shadow-[0_15px_30px_-10px_rgba(197,160,89,0.3)]"
                >
                  <LogIn size={18} className="transition-transform group-hover:translate-x-1" />
                  <span>ENTRAR</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1.5" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Entrance Transition Overlay */}
        <AnimatePresence>
          {isEntering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#070b13] z-50 pointer-events-none"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-10 h-10 border-[3px] border-legal-gold border-t-transparent rounded-full shadow-[0_0_15px_rgba(197,160,89,0.2)]"
              />
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[10px] uppercase font-bold tracking-[0.3em] text-legal-gold/90"
              >
                Iniciando Estación...
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
