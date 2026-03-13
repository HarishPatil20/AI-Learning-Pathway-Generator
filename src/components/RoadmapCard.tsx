import React from 'react';
import { RoadmapStep } from '../services/geminiService';
import { BookOpen, Clock, Code, ExternalLink, GraduationCap, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface RoadmapCardProps {
  step: RoadmapStep;
  index: number;
}

export const RoadmapCard: React.FC<RoadmapCardProps> = ({ step, index }) => {
  const difficultyColor = {
    Beginner: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Intermediate: 'bg-amber-100 text-amber-700 border-amber-200',
    Advanced: 'bg-rose-100 text-rose-700 border-rose-200',
  }[step.difficulty];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative pl-8 pb-12 last:pb-0"
    >
      {/* Timeline Line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-200 ml-[11px]" />
      
      {/* Timeline Dot */}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-zinc-900 flex items-center justify-center z-10">
        <span className="text-[10px] font-bold">{step.stepNumber}</span>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-semibold text-zinc-900">{step.topic}</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${difficultyColor}`}>
            {step.difficulty}
          </span>
        </div>

        <p className="text-zinc-600 mb-6 leading-relaxed">
          {step.importance}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 mb-3">
              <BookOpen className="w-4 h-4" />
              Learning Resources
            </h4>
            <ul className="space-y-2">
              {step.resources.map((res, i) => (
                <li key={i}>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">
                        {res.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {res.type}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 mb-3">
                <Clock className="w-4 h-4" />
                Estimated Time
              </h4>
              <p className="text-sm text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                {step.estimatedTime}
              </p>
            </div>

            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 mb-3">
                <Code className="w-4 h-4" />
                Practice Project
              </h4>
              <p className="text-sm text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                {step.practiceProject}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
