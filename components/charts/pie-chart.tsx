'use client';
import EChartsWrapper from './echarts-wrapper';
import type { EChartsOption } from './echarts-setup';

interface Props {
  data: { name: string; value: number }[];
  title?: string;
  onClick?: (params: any) => void;
  height?: number | string;
}

export default function PieChart({ data, title, onClick, height }: Props) {
  const option: EChartsOption = {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14, color: '#18181B' } } : undefined,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold', color: '#18181B' } },
      data,
    }],
    color: ['#0D9488', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316'],
  };
  return <EChartsWrapper option={option} onClick={onClick} height={height} />;
}
