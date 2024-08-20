"use client";
import React, { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
} from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const FloatingNav: React.FC<{
  navItems: Array<{
    name: string;
    link: string;
    icon?: JSX.Element;
  }>;
  className?: string;
}> = ({ navItems, className }) => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = debounce(() => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    }, 100);

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <AnimatePresence mode="wait">
      <motion.nav
        initial={{ opacity: 1, y: -100 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex max-w-fit md:max-w-[90vw] lg:max-w-[80vw] fixed z-[5000] top-4 inset-x-0 mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg border border-white/10 shadow-lg items-center justify-center space-x-2 sm:space-x-4",
          className
        )}
        style={{
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(17, 25, 40, 0.8)",
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        {navItems.map((navItem, idx) => (
          <Link
            key={`nav-link-${idx}`}
            href={navItem.link}
            className={cn(
              "relative text-white hover:text-blue-300 transition-colors duration-200 flex items-center space-x-1 text-sm sm:text-base font-medium"
            )}
          >
            {navItem.icon && <span className="block sm:hidden">{navItem.icon}</span>}
            <span className="cursor-pointer">{navItem.name}</span>
          </Link>
        ))}
      </motion.nav>
    </AnimatePresence>
  );
};

// Debounce function to limit the rate at which the scroll event is fired
function debounce(func: (...args: any[]) => void, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
