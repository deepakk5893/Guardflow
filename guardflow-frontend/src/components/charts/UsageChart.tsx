import React, { useRef, useEffect } from 'react';
import type { DailyUsage } from '../../services/analytics';

interface UsageChartProps {
  data: DailyUsage[];
  height?: number;
  type?: 'tokens' | 'users';
}

export const UsageChart: React.FC<UsageChartProps> = ({ 
  data, 
  height = 300, 
  type = 'tokens' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getDataValue = (item: DailyUsage) => {
    switch (type) {
      case 'users': return item.unique_users;
      default: return item.tokens;
    }
  };

  const getChartTitle = () => {
    switch (type) {
      case 'users': return 'Unique Users Over Time';
      default: return 'Token Usage Over Time';
    }
  };

  const getChartColor = () => {
    switch (type) {
      case 'users': return '#8b5cf6'; // purple
      default: return '#10b981'; // green
    }
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
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = height - padding * 2;

    // Find max value for scaling
    const values = data.map(getDataValue);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const valueRange = maxValue - minValue;

    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const stepX = chartWidth / (data.length - 1);
    for (let i = 0; i < data.length; i++) {
      const x = padding + stepX * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Draw line chart
    if (data.length > 1) {
      ctx.strokeStyle = getChartColor();
      ctx.lineWidth = 3;
      ctx.beginPath();

      data.forEach((item, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const value = getDataValue(item);
        const normalizedValue = valueRange > 0 ? (value - minValue) / valueRange : 0.5;
        const y = padding + chartHeight - (normalizedValue * chartHeight);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw area under the line
      ctx.fillStyle = getChartColor() + '20'; // 20% opacity
      ctx.lineTo(padding + chartWidth, padding + chartHeight);
      ctx.lineTo(padding, padding + chartHeight);
      ctx.closePath();
      ctx.fill();

      // Draw data points
      ctx.fillStyle = getChartColor();
      data.forEach((item, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const value = getDataValue(item);
        const normalizedValue = valueRange > 0 ? (value - minValue) / valueRange : 0.5;
        const y = padding + chartHeight - (normalizedValue * chartHeight);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Draw Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (valueRange / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i + 4;
      ctx.fillText(Math.round(value).toLocaleString(), padding - 10, y);
    }

    // Draw X-axis labels (dates)
    ctx.textAlign = 'center';
    const maxLabels = Math.floor(chartWidth / 80); // Prevent overcrowding
    const labelStep = Math.max(1, Math.floor(data.length / maxLabels));
    
    data.forEach((item, index) => {
      if (index % labelStep === 0 || index === data.length - 1) {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const date = new Date(item.date);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        ctx.fillText(label, x, height - 10);
      }
    });

  }, [data, height, type]);

  return (
    <div id={`usage-chart-${type}`} className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{getChartTitle()}</h3>
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