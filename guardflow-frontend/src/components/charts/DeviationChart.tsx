import React, { useRef, useEffect } from 'react';
import type { DeviationTrends } from '../../services/analytics';

interface DeviationChartProps {
  data: DeviationTrends[];
  height?: number;
}

export const DeviationChart: React.FC<DeviationChartProps> = ({ data, height = 250 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Find max values for scaling
    const avgScores = data.map(d => d.average_score);
    const highRiskCounts = data.map(d => d.high_risk_users);
    
    const maxAvgScore = Math.max(...avgScores);
    const minAvgScore = Math.min(...avgScores);
    const avgScoreRange = maxAvgScore - minAvgScore;
    
    const maxHighRisk = Math.max(...highRiskCounts);

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

    // Draw average score line
    if (data.length > 1) {
      ctx.strokeStyle = '#f59e0b'; // orange
      ctx.lineWidth = 3;
      ctx.beginPath();

      data.forEach((item, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const normalizedValue = avgScoreRange > 0 ? (item.average_score - minAvgScore) / avgScoreRange : 0.5;
        const y = padding + chartHeight - (normalizedValue * chartHeight);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw data points for average score
      ctx.fillStyle = '#f59e0b';
      data.forEach((item, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const normalizedValue = avgScoreRange > 0 ? (item.average_score - minAvgScore) / avgScoreRange : 0.5;
        const y = padding + chartHeight - (normalizedValue * chartHeight);

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Draw high-risk users bars
    const barWidth = Math.max(8, chartWidth / data.length * 0.6);
    ctx.fillStyle = '#ef4444' + '80'; // red with transparency
    
    data.forEach((item, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index - barWidth / 2;
      const normalizedHeight = maxHighRisk > 0 ? (item.high_risk_users / maxHighRisk) * chartHeight : 0;
      const y = padding + chartHeight - normalizedHeight;

      ctx.fillRect(x, y, barWidth, normalizedHeight);
    });

    // Draw Y-axis labels for average score (left side)
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const value = minAvgScore + (avgScoreRange / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i + 4;
      ctx.fillText(value.toFixed(1), padding - 10, y);
    }

    // Draw Y-axis labels for high-risk users (right side)
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 5; i++) {
      const value = (maxHighRisk / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i + 4;
      ctx.fillText(Math.round(value).toString(), padding + chartWidth + 10, y);
    }

    // Draw X-axis labels (dates)
    ctx.textAlign = 'center';
    const maxLabels = Math.floor(chartWidth / 80);
    const labelStep = Math.max(1, Math.floor(data.length / maxLabels));
    
    data.forEach((item, index) => {
      if (index % labelStep === 0 || index === data.length - 1) {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const date = new Date(item.date);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        ctx.fillText(label, x, height - 10);
      }
    });

    // Draw axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    
    // Y-axis label (left)
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Average Deviation Score', 0, 0);
    ctx.restore();
    
    // Y-axis label (right)
    ctx.save();
    ctx.translate(rect.width - 15, height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('High-Risk Users', 0, 0);
    ctx.restore();

  }, [data, height]);

  return (
    <div id="deviation-trends-chart" className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Deviation Score Trends</h3>
      <div className="flex items-center space-x-6 mb-4 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-400 rounded mr-2"></div>
          <span className="text-gray-600">Average Score</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-400 rounded mr-2"></div>
          <span className="text-gray-600">High-Risk Users</span>
        </div>
      </div>
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