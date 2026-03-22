import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink, BookOpen, Heart, Shield, Info } from 'lucide-react';

const Resources: React.FC = () => {
  const resources = [
    {
      title: "Understanding DID/OSDD",
      description: "A comprehensive guide to Dissociative Identity Disorder and Other Specified Dissociative Disorders.",
      link: "https://www.did-research.org/",
      category: "Educational",
      icon: BookOpen,
      color: "text-purple-500"
    },
    {
      title: "System Safety & Grounding",
      description: "Techniques for managing switches, triggers, and maintaining system stability.",
      link: "https://www.beautyafterbruises.org/blog/grounding101",
      category: "Safety",
      icon: Shield,
      color: "text-emerald-500"
    },
    {
      title: "Plurality Resource",
      description: "A hub for plural systems, including terminology, FAQ, and community resources.",
      link: "https://pluralityresource.org/",
      category: "Community",
      icon: Info,
      color: "text-purple-500"
    },
    {
      title: "Crisis Support",
      description: "Immediate help and support links for systems in crisis.",
      link: "https://www.crisistextline.org/",
      category: "Support",
      icon: Heart,
      color: "text-red-500"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Resources & Support</h2>
        <p className="text-[var(--text-secondary)]">Helpful materials for your system's journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {resources.map((res, i) => (
          <motion.a
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={res.title}
            href={res.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-[var(--bg-surface)] p-8 rounded-3xl border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-all shadow-sm hover:shadow-xl"
          >
            <div className="flex items-start justify-between mb-6">
              <div className={`p-4 bg-[var(--bg-main)] rounded-2xl ${res.color}`}>
                <res.icon size={32} />
              </div>
              <ExternalLink size={20} className="text-[var(--text-muted)] group-hover:text-[var(--accent-main)] transition-colors" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">
              {res.category}
            </span>
            <h3 className="text-xl font-bold mb-3 text-[var(--text-primary)]">{res.title}</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              {res.description}
            </p>
          </motion.a>
        ))}
      </div>

      <div className="bg-[var(--accent-main)]/10 p-8 rounded-3xl border border-[var(--accent-main)]/20">
        <h3 className="text-lg font-bold text-[var(--accent-main)] mb-2">Note on Medical Advice</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          HeadM8 is a management and tracking tool, not a medical or diagnostic resource. 
          If you are in immediate danger or need professional help, please contact a licensed therapist or crisis support service.
        </p>
      </div>
    </div>
  );
};

export default Resources;
