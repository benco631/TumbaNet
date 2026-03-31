import { Variants } from "framer-motion";

// === Page Transitions ===
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// === Staggered Container ===
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

// === Fade In Up (cards, list items) ===
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// === Scale In (modals, popups) ===
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

// === Slide In from Right (notifications, toasts) ===
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 80 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    x: 80,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// === Slide Down (dropdowns, menus) ===
export const slideDown: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

// === Slide Up (bottom sheets, mobile menus) ===
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 40,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// === Overlay fade ===
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// === Button hover/tap presets (use as motion props, not variants) ===
export const buttonMotion = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring" as const, stiffness: 400, damping: 20 },
};

export const cardHoverMotion = {
  whileHover: { y: -2, transition: { duration: 0.2 } },
};

// === Neon glow pulse (CSS keyframe helper — apply via className) ===
export const neonPulseKeyframes = `
@keyframes neonPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(192, 38, 211, 0.15); }
  50% { box-shadow: 0 0 20px rgba(192, 38, 211, 0.3); }
}
`;
