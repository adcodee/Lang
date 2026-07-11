"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentLesson } from "@/lib/hooks/useCurrentLesson";

export default function NextLessonFAB() {
  const router = useRouter();
  const current = useCurrentLesson();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 120);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!current) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="fab"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.2 }}
          onClick={() => router.push(current.href)}
          className="fixed bottom-6 right-4 z-50 flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-white shadow-[0_4px_0_#3a5a34] active:translate-y-[2px] active:shadow-[0_2px_0_#3a5a34]"
          aria-label={`Continue to ${current.lesson.title}`}
        >
          Continue →
        </motion.button>
      )}
    </AnimatePresence>
  );
}
