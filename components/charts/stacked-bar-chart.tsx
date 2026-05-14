'use client';
import EChartsWrapper from './echarts-wrapper';
import type { EChartsOption } from './echarts-setup';

interface Props {
  categories: string[];
  series: { name: string; data: number[]; color?: string }[];
  title?: string;
  onClick?: (params: any) => void;
  height?: number | string;
}

export default function StackedBarChart({ categories, series, title, onClick, height }: Props) {
  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14, color: '#18181B' } } : undefined,
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: categories, axisLabel: { color: '#71717A' } },
    yAxis: { type: 'value', axisLabel: { color: '#71717A', formatter: (v: number) => `₹${(v / 1e5).toFixed(1)}L` } },
    series: series.map(s => ({
      name: s.name,
      type: 'bar',
      stack: 'total',
      data: s.data,
      itemStyle: s.color ? { color: s.color } : undefined,
      barMaxWidth: 36,
    })),
    legend: { bottom: 0, textStyle: { color: '#71717A' } },
    color: ['#0D9488', '#F59E0B', '#6366F1', '#EC4899'],
  };
  return <EChartsWrapper option={option} onClick={onClick} height={height} />;
}
