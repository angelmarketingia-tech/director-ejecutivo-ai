"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDeck } from "@/lib/store";
import { useEscape } from "@/lib/useEscape";
import { SidebarContent } from "@/components/Sidebar";
import { X } from "lucide-react";

/** Drawer de navegación para móvil/tablet (< lg). Se abre desde el botón del Topbar. */
export function MobileNav() {
  const open = useDeck((s) => s.mobileNavOpen);
  const setOpen = useDeck((s) => s.setMobileNav);
  useEscape(open, () => setOpen(false));

  return (
    <AnimatePresence>
      {open && (
        <div className="lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            data-testid="mobile-drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed left-0 top-0 z-[60] flex h-full w-[82%] max-w-[300px] flex-col border-r border-border bg-bg-soft px-3 py-5 shadow-panel"
          >
            <button
              data-testid="mobile-nav-close"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-border text-text-muted"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
