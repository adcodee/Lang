"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentLesson } from "@/lib/hooks/useCurrentLesson";

export default function NextLessonFAB() {
  const router = useRouter();
  const current = useCurrentLesson();
  const [visible, setVisible] = useState(false);

  // Show the FAB only once the learner's current-lesson node has actually
  // scrolled out of view — not a raw scroll-position threshold. That
  // threshold assumed the home screen always opens at the top; 1.2's Phase
  // F auto-scrolls straight to the current-lesson node on load, which for
  // any returning learner lands well past a fixed pixel threshold before
  // they've touched the screen, so the FAB used to show immediately, every
  // time. SkillTree already tags that node with the same `data-node-key`
  // it uses for the auto-scroll — reuse it here instead of a pixel guess.
  useEffect(() => {
    if (!current) {
      setVisible(false);
      return;
    }
    const el = document.querySelector(
      `[data-node-key="${CSS.escape(current.currentKey)}"]`
    );
    if (!el) {
      setVisible(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [current]);

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
