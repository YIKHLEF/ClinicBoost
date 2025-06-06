/**
 * Chart Components
 * 
 * Reusable chart components for clinic analytics
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import {
  Line,
  Bar,
  Pie,
  Doughnut
} from 'react-chartjs-2';
import { ChartConfig, ChartDataPoint } from '../../lib/analytics/types';
import useTranslation from '../../hooks/useTranslation';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface ChartProps {
  config: ChartConfig;
  className?: string;
}

// Default color palette
const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280'  // Gray
];

/**
 * Line Chart Component
 */
export const LineChart: React.FC<ChartProps> = ({ config, className }) => {
  const { isRTL } = useTranslation();

  const data = {
    labels: config.data.map(item => item.label),
    datasets: [{
      label: config.title,
      data: config.data.map(item => item.value),
      borderColor: config.options?.colors?.[0] || DEFAULT_COLORS[0],
      backgroundColor: `${config.options?.colors?.[0] || DEFAULT_COLORS[0]}20`,
      fill: true,
      tension: 0.4,
    }]
  };

  const options = {
    responsive: config.options?.responsive ?? true,
    maintainAspectRatio: config.options?.maintainAspectRatio ?? false,
    plugins: {
      legend: {
        display: config.options?.showLegend ?? true,
        position: 'top' as const,
        rtl: isRTL(),
      },
      tooltip: {
        enabled: config.options?.showTooltips ?? true,
        rtl: isRTL(),
      },
      title: {
        display: true,
        text: config.title,
      }
    },
    scales: {
      x: {
        reverse: isRTL(),
      },
      y: {
        beginAtZero: true,
      }
    }
  };

  return (
    <div className={className}>
      <Line data={data} options={options} />
    </div>
  );
};

/**
 * Bar Chart Component
 */
export const BarChart: React.FC<ChartProps> = ({ config, className }) => {
  const { isRTL } = useTranslation();

  const data = {
    labels: config.data.map(item => item.label),
    datasets: [{
      label: config.title,
      data: config.data.map(item => item.value),
      backgroundColor: config.options?.colors || DEFAULT_COLORS.slice(0, config.data.length),
      borderColor: config.options?.colors?.map(color => `${color}80`) || DEFAULT_COLORS.slice(0, config.data.length).map(color => `${color}80`),
      borderWidth: 1,
    }]
  };

  const options = {
    responsive: config.options?.responsive ?? true,
    maintainAspectRatio: config.options?.maintainAspectRatio ?? false,
    plugins: {
      legend: {
        display: config.options?.showLegend ?? true,
        position: 'top' as const,
        rtl: isRTL(),
      },
      tooltip: {
        enabled: config.options?.showTooltips ?? true,
        rtl: isRTL(),
      },
      title: {
        display: true,
        text: config.title,
      }
    },
    scales: {
      x: {
        reverse: isRTL(),
      },
      y: {
        beginAtZero: true,
      }
    }
  };

  return (
    <div className={className}>
      <Bar data={data} options={options} />
    </div>
  );
};

/**
 * Pie Chart Component
 */
export const PieChart: React.FC<ChartProps> = ({ config, className }) => {
  const { isRTL } = useTranslation();

  const data = {
    labels: config.data.map(item => item.label),
    datasets: [{
      data: config.data.map(item => item.value),
      backgroundColor: config.options?.colors || DEFAULT_COLORS.slice(0, config.data.length),
      borderColor: '#ffffff',
      borderWidth: 2,
    }]
  };

  const options = {
    responsive: config.options?.responsive ?? true,
    maintainAspectRatio: config.options?.maintainAspectRatio ?? false,
    plugins: {
      legend: {
        display: config.options?.showLegend ?? true,
        position: isRTL() ? 'left' as const : 'right' as const,
        rtl: isRTL(),
      },
      tooltip: {
        enabled: config.options?.showTooltips ?? true,
        rtl: isRTL(),
      },
      title: {
        display: true,
        text: config.title,
      }
    }
  };

  return (
    <div className={className}>
      <Pie data={data} options={options} />
    </div>
  );
};

/**
 * Doughnut Chart Component
 */
export const DoughnutChart: React.FC<ChartProps> = ({ config, className }) => {
  const { isRTL } = useTranslation();

  const data = {
    labels: config.data.map(item => item.label),
    datasets: [{
      data: config.data.map(item => item.value),
      backgroundColor: config.options?.colors || DEFAULT_COLORS.slice(0, config.data.length),
      borderColor: '#ffffff',
      borderWidth: 2,
    }]
  };

  const options = {
    responsive: config.options?.responsive ?? true,
    maintainAspectRatio: config.options?.maintainAspectRatio ?? false,
    plugins: {
      legend: {
        display: config.options?.showLegend ?? true,
        position: isRTL() ? 'left' as const : 'right' as const,
        rtl: isRTL(),
      },
      tooltip: {
        enabled: config.options?.showTooltips ?? true,
        rtl: isRTL(),
      },
      title: {
        display: true,
        text: config.title,
      }
    }
  };

  return (
    <div className={className}>
      <Doughnut data={data} options={options} />
    </div>
  );
};

/**
 * Universal Chart Component
 */
export const Chart: React.FC<ChartProps> = ({ config, className }) => {
  switch (config.type) {
    case 'line':
    case 'area':
      return <LineChart config={config} className={className} />;
    case 'bar':
      return <BarChart config={config} className={className} />;
    case 'pie':
      return <PieChart config={config} className={className} />;
    case 'doughnut':
      return <DoughnutChart config={config} className={className} />;
    default:
      return (
        <div className={`${className} flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg`}>
          <p className="text-gray-500 dark:text-gray-400">Unsupported chart type: {config.type}</p>
        </div>
      );
  }
};

/**
 * Chart Container with Loading and Error States
 */
interface ChartContainerProps {
  config?: ChartConfig;
  loading?: boolean;
  error?: string;
  className?: string;
  title?: string;
  description?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  config,
  loading,
  error,
  className,
  title,
  description
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800`}>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{t('errors.loadError')}</p>
          <p className="text-sm text-red-500 dark:text-red-300 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={`${className} flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg`}>
        <p className="text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
          {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>}
        </div>
      )}
      <Chart config={config} />
    </div>
  );
};
