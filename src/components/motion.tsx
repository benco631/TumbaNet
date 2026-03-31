"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  pageTransition,
  staggerContainer,
  fadeInUp,
  scaleIn,
  slideDown,
  slideUp,
  overlayFade,
  buttonMotion,
  cardHoverMotion,
} from "@/lib/animations";
import { ReactNode } from "react";

// === Page wrapper with fade+slide entrance ===
export function MotionPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// === Staggered list/grid container ===
export function MotionStagger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

// === Individual stagger item (use inside MotionStagger) ===
export function MotionItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={fadeInUp} className={className}>
      {children}
    </motion.div>
  );
}

// === Card with hover lift ===
export function MotionCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      {...cardHoverMotion}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// === Animated button ===
export function MotionButton({
  children,
  className = "",
  onClick,
  type = "button",
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) {
  return (
    <motion.button
      {...buttonMotion}
      className={className}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

// === Modal with overlay ===
export function MotionModal({
  isOpen,
  onClose,
  children,
  className = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={overlayFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed z-50 ${className}`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// === Dropdown menu ===
export function MotionDropdown({
  isOpen,
  children,
  className = "",
}: {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={slideDown}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// === Bottom sheet ===
export function MotionSheet({
  isOpen,
  children,
  className = "",
}: {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={overlayFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            variants={slideUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={className}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Re-export motion and AnimatePresence for direct use
export { motion, AnimatePresence };
