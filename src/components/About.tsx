import React from 'react';
import { motion } from 'motion/react';
import { Heart, Code, Users, AlertCircle, Coffee } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">About HeadM8</h2>
        <p className="text-[var(--text-secondary)]">A community-driven alternative for system management.</p>
      </div>

      {/* Purpose Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-[var(--accent-main)]/10 rounded-2xl">
            <Heart size={24} className="text-[var(--accent-main)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Our Purpose</h3>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
          HeadM8 is a system management and tracking application designed for plural systems, 
          providing tools for managing alters, tracking switches, maintaining diaries, and 
          connecting with a supportive community.
        </p>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          The app serves as a safe space for systems of all sizes to document their experiences, 
          track their mental health journey, and maintain connections with friends and supporters.
        </p>
      </motion.div>

      {/* Why We Created It Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-500/10 rounded-2xl">
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Why We Created HeadM8</h3>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
          HeadM8 was created in response to the sudden shutdown of two beloved applications that 
          the plural community relied on: <strong>Simply Plural</strong> and <strong>Octocon</strong>.
        </p>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
          When these platforms abruptly shut down, thousands of systems lost access to years of 
          personal data, memories, and important tracking information. Many were left without 
          alternatives for managing their systems.
        </p>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          HeadM8 was built to provide a community-owned, transparent alternative that puts system 
          safety and data ownership first. We believe that systems deserve a platform they can 
          trust - one that won't disappear overnight.
        </p>
      </motion.div>

      {/* How It Was Built Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-500/10 rounded-2xl">
            <Code size={24} className="text-purple-500" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">How It's Built</h3>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
          HeadM8 is an <strong>open-source application</strong> built with modern web technologies:
        </p>
        <ul className="space-y-2 mb-4">
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>React</strong> - Frontend framework for building the user interface
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>TypeScript</strong> - Type-safe JavaScript for reliable code
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>Firebase</strong> - Backend services for authentication and database
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>Tailwind CSS</strong> - Styling for a modern, responsive design
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>Vercel</strong> - Deployment and hosting platform
          </li>
        </ul>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          The code is freely available for the community to review, contribute to, and host 
          independently if desired.
        </p>
      </motion.div>

      {/* Credits Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-pink-500/10 rounded-2xl">
            <Users size={24} className="text-pink-500" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Credits</h3>
        </div>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-[var(--text-primary)] mb-2">Creator</h4>
            <p className="text-[var(--text-secondary)]">
              <strong>james</strong> (Xoriori)
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-[var(--text-primary)] mb-2">Beta Testers</h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-[var(--bg-main)] rounded-full text-sm text-[var(--text-secondary)]">
                pat (xuburik)
              </span>
              <span className="px-3 py-1 bg-[var(--bg-main)] rounded-full text-sm text-[var(--text-secondary)]">
                atta (ataraz)
              </span>
              <span className="px-3 py-1 bg-[var(--bg-main)] rounded-full text-sm text-[var(--text-secondary)]">
                lexi (aklexia)
              </span>
              <span className="px-3 py-1 bg-[var(--bg-main)] rounded-full text-sm text-[var(--text-secondary)]">
                the audience
              </span>
              <span className="px-3 py-1 bg-[var(--bg-main)] rounded-full text-sm text-[var(--text-secondary)]">
                008.0
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[var(--text-primary)] mb-2">Special Thanks</h4>
            <p className="text-[var(--text-secondary)]">
              Thank you to the entire plural community for your trust, feedback, and support 
              in making HeadM8 a reality. This project exists because of you.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Support Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[var(--accent-main)]/10 p-8 rounded-3xl border border-[var(--accent-main)]/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <Coffee size={24} className="text-[var(--accent-main)]" />
          <h3 className="text-lg font-bold text-[var(--accent-main)]">Support the Project</h3>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          HeadM8 is a free, community-driven project. If you'd like to support development, 
          you can contribute code, report bugs, or simply share the app with others who might benefit from it.
        </p>
      </motion.div>
    </div>
  );
};

export default About;
