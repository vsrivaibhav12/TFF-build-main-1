'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ComplianceDonutProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export function ComplianceDonut({ data }: ComplianceDonutProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #E4E4E7',
            fontSize: '12px',
            background: 'white',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
