import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Code, Users, AlertCircle, MessageCircle } from 'lucide-react';

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
          HeadM8 was created in response to the announced shutdowns of two beloved applications that 
          the plural community relied on: <strong>Simply Plural</strong> and <strong>Octocon</strong>.
        </p>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
          When these platforms announced their upcoming closures, thousands of systems faced the prospect 
          of losing access to years of personal data, memories, and important tracking information. 
          Many were left without alternatives for managing their systems.
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
          HeadM8 was created using <strong>vibe coding</strong> - an AI-assisted development approach 
          where the code was primarily generated through conversations with AI assistants. The creator 
          provided the vision and requirements while AI helped implement the functionality.
        </p>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>Kilo Code</strong> - AI coding assistant that interpreted requirements and generated code
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>Visual Studio Code</strong> - Code editor used for development
          </li>

          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>React</strong> + <strong>TypeScript</strong> - Frontend framework
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>Firebase</strong> - Authentication and database
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>Tailwind CSS</strong> - Styling
          </li>
          <li className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="w-2 h-2 bg-[var(--accent-main)] rounded-full"></span>
            <strong>Vercel</strong> - Deployment and hosting
          </li>
        </ul>
      </motion.div>

      {/* The Quiet Room Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[var(--bg-surface)] rounded-3xl p-8 border border-[var(--bg-panel)] shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-500/10 rounded-2xl">
            <MessageCircle size={24} className="text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Join Our Community</h3>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
          <strong>The Quiet Room</strong> is our inclusive Discord community where plural systems and their 
          supporters can connect, share experiences, and find understanding. Whether you're newly discovering 
          your system or have been on this journey for years, you'll find a welcoming space here.
        </p>
        <a
          href="https://discord.gg/dtJqtccwuD"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
        >
          <MessageCircle size={20} />
          Join The Quiet Room
        </a>
      </motion.div>

      {/* Credits Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
            <h4 className="font-bold text-[var(--text-primary)] mb-2">Brought to you by</h4>
            <p className="text-[var(--text-secondary)]">
              <strong>The Quiet Room</strong> • <strong>Team HeadM8</strong>
            </p>
          </div>
          
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

        </div>
      </motion.div>
    </div>
  );
};

export default About;
