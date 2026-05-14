'use client';
import { useEffect, useRef } from 'react';
import { echarts, type EChartsOption } from './echarts-setup';

interface Props {
  option: EChartsOption;
  onClick?: (params: any) => void;
  height?: number | string;
  className?: string;
}

export default function EChartsWrapper({ option, onClick, height = 300, className }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const instance = echarts.init(chartRef.current);
    instanceRef.current = instance;
    instance.setOption(option);
    if (onClick) instance.on('click', onClick);
    function resize() { instance.resize(); }
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      instance.dispose();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.setOption(option, true);
    }
  }, [option]);

  return <div ref={chartRef} className={className} style={{ width: '100%', height }} />;
}
