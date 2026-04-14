import React from 'react';
import { useSystem } from '../SystemContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

const SwitchAnalytics: React.FC = () => {
  const { alters, frontHistory } = useSystem();

  const addedEntries = frontHistory.filter(entry => entry.action === 'added');
  
  const data = alters.map(alter => {
    const alterEntries = addedEntries.filter(e => e.alterId === alter.id);
    return {
      name: alter.name,
      count: alterEntries.length
    };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  const hasData = data.some(d => d.count > 0);

  if (!hasData) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-center px-4">
        <div className="text-[var(--text-muted)]">
          <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No switch data yet</p>
          <p className="text-xs opacity-70">Start tracking switches to see analytics</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bg-panel)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-muted)' }}
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            contentStyle={{ 
              borderRadius: '16px', 
              border: '1px solid var(--bg-panel)', 
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              padding: '12px'
            }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--accent-main)' : COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SwitchAnalytics;
