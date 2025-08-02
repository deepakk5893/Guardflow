import React, { useRef, useEffect } from 'react';
import type { IntentDistribution } from '../../services/analytics';

interface IntentChartProps {
  data: IntentDistribution[];
  height?: number;
}

export const IntentChart: React.FC<IntentChartProps> = ({ data, height = 300 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getIntentColor = (intent: string, index: number) => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // yellow
      '#ef4444', // red
      '#8b5cf6', // purple
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
    ];
    return colors[index % colors.length];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, height);

    // Chart dimensions
    const centerX = rect.width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 80;

    // Draw pie chart
    let currentAngle = -Math.PI / 2; // Start at top

    data.forEach((item, index) => {
      const sliceAngle = (item.percentage / 100) * 2 * Math.PI;
      
      // Draw slice
      ctx.fillStyle = getIntentColor(item.intent, index);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      // Draw slice border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sliceAngle;
    });

    // Draw legend
    const legendX = rect.width - 150;
    let legendY = 20;

    ctx.font = '14px system-ui';
    ctx.textAlign = 'left';

    data.forEach((item, index) => {
      // Legend color box
      ctx.fillStyle = getIntentColor(item.intent, index);
      ctx.fillRect(legendX, legendY, 12, 12);

      // Legend text
      ctx.fillStyle = '#374151';
      ctx.fillText(item.intent, legendX + 20, legendY + 9);
      
      // Percentage
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${item.percentage.toFixed(1)}%`, legendX + 20, legendY + 25);

      legendY += 35;
    });

  }, [data, height]);

  return (
    <div id="intent-distribution-chart" className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Intent Classification Distribution</h3>
      <div className="relative">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: `${height}px` }}
          className="block"
        />
        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};