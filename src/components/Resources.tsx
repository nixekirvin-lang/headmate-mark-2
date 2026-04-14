import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, BookOpen, Heart, Shield, Info, Globe, ChevronDown } from 'lucide-react';

interface Resource {
  title: string;
  description: string;
  link: string;
  category: string;
}

interface Region {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  resources: Resource[];
}

const Resources: React.FC = () => {
  const [openRegion, setOpenRegion] = useState<string | null>('united-kingdom');

  const regions: Region[] = [
    {
      id: 'united-kingdom',
      name: 'United Kingdom',
      icon: Globe,
      resources: [
        {
          title: "Mind UK",
          description: "Mental health charity offering information, advice, and support for mental health issues.",
          link: "https://www.mind.org.uk/",
          category: "Mental Health Charity"
        },
        {
          title: "NHS Mental Health Services",
          description: "UK National Health Service mental health resources and crisis support.",
          link: "https://www.nhs.uk/mental-health/",
          category: "Healthcare"
        },
        {
          title: "Samaritans UK",
          description: "24/7 crisis support hotline for anyone in the UK feeling distressed.",
          link: "https://www.samaritans.org/",
          category: "Crisis Support"
        },
        {
          title: "Rethink Mental Illness",
          description: "Information, support, and advocacy for people affected by mental illness.",
          link: "https://www.rethink.org/",
          category: "Advocacy"
        },
        {
          title: "BEAT Eating Disorders",
          description: "UK charity supporting people with eating disorders and their families.",
          link: "https://www.beateatingdisorders.org.uk/",
          category: "Eating Disorders"
        },
        {
          title: "YoungMinds",
          description: "Mental health support for children and young people in the UK.",
          link: "https://www.youngminds.org.uk/",
          category: "Youth Mental Health"
        },
        {
          title: "CALM",
          description: "Campaign Against Living Miserably - mental health support for men.",
          link: "https://www.thecalmzone.net/",
          category: "Crisis Support"
        },
        {
          title: "UK Trauma Council",
          description: "Resources and training on trauma and trauma-informed practices.",
          link: "https://uktraumacouncil.org/",
          category: "Trauma"
        }
      ]
    },
    {
      id: 'europe',
      name: 'Europe',
      icon: Globe,
      resources: [
        {
          title: "European Federation of Neurological Associations",
          description: "Information on neurological and mental health conditions across Europe.",
          link: "https://www.efna.net/",
          category: "Neurological"
        },
        {
          title: "Mental Health Europe",
          description: "European network promoting mental health and well-being.",
          link: "https://www.mhe-sme.org/",
          category: "Advocacy"
        },
        {
          title: "World Health Organization - Europe",
          description: "Mental health resources and reports from WHO European region.",
          link: "https://www.euro.who.int/en/health-topics/noncommunicable-diseases/mental-health",
          category: "Healthcare"
        },
        {
          title: "Dissocia Online",
          description: "International organization for dissociative disorders education and support.",
          link: "https://www.dissociaonline.org/",
          category: "Dissociative Disorders"
        },
        {
          title: "German Association for Psychiatry and Psychotherapy",
          description: "German mental health resources (Deutsche Gesellschaft für Psychiatrie und Psychotherapie).",
          link: "https://www.dgppn.de/",
          category: "Healthcare"
        },
        {
          title: "French Mental Health Federation",
          description: "French national mental health organization (Fédération Française de Psychiatrie).",
          link: "https://www.fmpsn.org/",
          category: "Mental Health"
        }
      ]
    },
    {
      id: 'americas',
      name: 'The Americas',
      icon: Globe,
      resources: [
        {
          title: "National Alliance on Mental Illness (NAMI)",
          description: "Largest grassroots mental health organization in the US.",
          link: "https://www.nami.org/",
          category: "Advocacy"
        },
        {
          title: "Mental Health America",
          description: "Community-based mental health organization in the US.",
          link: "https://www.mhanational.org/",
          category: "Mental Health"
        },
        {
          title: "Crisis Text Line",
          description: "24/7 crisis support via text message in the US.",
          link: "https://www.crisistextline.org/",
          category: "Crisis Support"
        },
        {
          title: "988 Suicide & Crisis Lifeline",
          description: "24/7 national suicide prevention hotline in the US.",
          link: "https://988lifeline.org/",
          category: "Crisis Support"
        },
        {
          title: "SAMHSA",
          description: "US Substance Abuse and Mental Health Services Administration.",
          link: "https://www.samhsa.gov/",
          category: "Healthcare"
        },
        {
          title: "Canadian Mental Health Association",
          description: "National mental health charity in Canada.",
          link: "https://cmha.ca/",
          category: "Mental Health"
        },
        {
          title: "Centre for Addiction and Mental Health",
          description: "Canada's largest mental health and addiction teaching hospital.",
          link: "https://www.camh.ca/",
          category: "Healthcare"
        },
        {
          title: "Dissociative Disorders Resource Center",
          description: "Information and resources on dissociative disorders.",
          link: "https://www.dissociativeinfo.com/",
          category: "Dissociative Disorders"
        },
        {
          title: "The Trauma Center",
          description: "Boston-based trauma treatment and research center.",
          link: "https://www.traumacenter.org/",
          category: "Trauma"
        },
        {
          title: "ISST-D",
          description: "International Society for the Study of Trauma and Dissociation.",
          link: "https://www.isst-d.org/",
          category: "Dissociative Disorders"
        }
      ]
    },
    {
      id: 'asia',
      name: 'Asia',
      icon: Globe,
      resources: [
        {
          title: "Mental Health Awareness Japan",
          description: "Japanese mental health advocacy and education organization.",
          link: "https://mhaw.jp/",
          category: "Mental Health"
        },
        {
          title: "National Center for Mental Health (Korea)",
          description: "Korean mental health resources and crisis support.",
          link: "https://www.ncmh.go.kr/",
          category: "Healthcare"
        },
        {
          title: "Mind India",
          description: "Indian mental health organization providing support and advocacy.",
          link: "https://mindindia.org.in/",
          category: "Mental Health"
        },
        {
          title: "National Mental Health Commission Australia",
          description: "Australian government mental health strategy and resources.",
          link: "https://www.mentalhealthcommission.gov.au/",
          category: "Healthcare"
        },
        {
          title: "Beyond Blue",
          description: "Australian mental health organization providing support and information.",
          link: "https://www.beyondblue.org.au/",
          category: "Mental Health"
        },
        {
          title: "Headspace Australia",
          description: "Mental health support for young people in Australia.",
          link: "https://headspace.org.au/",
          category: "Youth Mental Health"
        },
        {
          title: "Singapore Association for Mental Health",
          description: "Singapore mental health advocacy and support services.",
          link: "https://www.samh.com.sg/",
          category: "Mental Health"
        },
        {
          title: "Mental Health Commission of Canada",
          description: "Resources for mental health in Canadian workplaces.",
          link: "https://www.mentalhealthcommission.ca/",
          category: "Workplace Mental Health"
        }
      ]
    },
    {
      id: 'international',
      name: 'International',
      icon: Globe,
      resources: [
        {
          title: "DID Research Organization",
          description: "Comprehensive research and information on Dissociative Identity Disorder.",
          link: "https://www.did-research.org/",
          category: "Educational"
        },
        {
          title: "Plurality Resource",
          description: "Hub for plural systems with terminology, FAQ, and community resources.",
          link: "https://pluralityresource.org/",
          category: "Community"
        },
        {
          title: "ISSTD",
          description: "International Society for the Study of Trauma and Dissociation.",
          link: "https://www.isst-d.org/",
          category: "Dissociative Disorders"
        },
        {
          title: "Psychology Today",
          description: "Directory of therapists and mental health articles worldwide.",
          link: "https://www.psychologytoday.com/",
          category: "Directory"
        },
        {
          title: "Crisis Text Line",
          description: "24/7 crisis support via text - available in multiple countries.",
          link: "https://www.crisistextline.org/",
          category: "Crisis Support"
        },
        {
          title: "International Bipolar Foundation",
          description: "Global resources for bipolar disorder.",
          link: "https://ibpf.org/",
          category: "Bipolar"
        },
        {
          title: "International OCD Foundation",
          description: "Resources for Obsessive-Compulsive Disorder worldwide.",
          link: "https://iocdf.org/",
          category: "OCD"
        },
        {
          title: "National Center for PTSD",
          description: "US Department of Veterans Affairs PTSD information and resources.",
          link: "https://www.ptsd.va.gov/",
          category: "Trauma"
        },
        {
          title: "The Trevor Project",
          description: "Crisis support for LGBTQ+ youth internationally.",
          link: "https://www.thetrevorproject.org/",
          category: "LGBTQ+"
        },
        {
          title: "RAINN",
          description: "Sexual assault resources and support (primarily US, but international reach).",
          link: "https://www.rainn.org/",
          category: "Trauma"
        },
        {
          title: "Beauty After Bruises",
          description: "Resources for trauma, DID, and complex trauma support.",
          link: "https://www.beautyafterbruises.org/",
          category: "Trauma"
        },
        {
          title: "C-PTSD Foundation",
          description: "Complex PTSD resources and support.",
          link: "https://cptsdfoundation.org/",
          category: "Trauma"
        }
      ]
    }
  ];

  const toggleRegion = (regionId: string) => {
    setOpenRegion(openRegion === regionId ? null : regionId);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Resources & Support</h2>
        <p className="text-[var(--text-secondary)]">Mental health resources organized by region.</p>
      </div>

      <div className="space-y-4">
        {regions.map((region) => (
          <motion.div
            key={region.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--bg-panel)] overflow-hidden"
          >
            <button
              onClick={() => toggleRegion(region.id)}
              className="w-full flex items-center justify-between p-6 hover:bg-[var(--bg-main)] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[var(--accent-main)]/10 rounded-2xl">
                  {region.icon ? (
                    <region.icon size={24} className="text-[var(--accent-main)]" />
                  ) : (
                    <Globe size={24} className="text-[var(--accent-main)]" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{region.name}</h3>
                <span className="text-sm text-[var(--text-muted)]">({region.resources.length} resources)</span>
              </div>
              <ChevronDown
                size={24}
                className={`text-[var(--text-muted)] transition-transform ${
                  openRegion === region.id ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {openRegion === region.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {region.resources.map((res, i) => (
                      <motion.a
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={res.title}
                        href={res.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-5 bg-[var(--bg-main)] rounded-2xl border border-[var(--bg-panel)] hover:border-[var(--accent-main)] transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-main)]">
                            {res.category}
                          </span>
                          <ExternalLink size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent-main)] transition-colors" />
                        </div>
                        <h4 className="font-bold mb-1 text-[var(--text-primary)]">{res.title}</h4>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          {res.description}
                        </p>
                      </motion.a>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
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
