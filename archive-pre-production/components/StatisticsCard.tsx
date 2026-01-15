import { ReactNode } from 'react';

export interface StatisticsCardProps {
  title: string;
  value: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  onClick?: () => void;
  loading?: boolean;
}

/**
 * StatisticsCard component displays a metric with optional trend indicator
 * Implements Requirements 4.1, 4.2
 */
export function StatisticsCard({
  title,
  value,
  trend,
  icon,
  iconBgColor,
  iconColor,
  onClick,
  loading = false,
}: StatisticsCardProps) {
  const cardClasses = `bg-white rounded-lg shadow p-6 transition ${
    onClick ? 'hover:shadow-md cursor-pointer' : ''
  }`;

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div
      className={cardClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View ${title.toLowerCase()} details` : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`w-10 h-10 ${iconBgColor} rounded-lg flex items-center justify-center`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
      
      <p className="text-3xl font-bold text-gray-900 mb-1">
        {value.toLocaleString()}
      </p>
      
      {trend !== undefined ? (
        <div className="flex items-center gap-1">
          {trend.value !== 0 ? (
            <>
              {trend.isPositive ? (
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              )}
              <span
                className={`text-sm ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {Math.abs(trend.value)}%
              </span>
              <span className="text-sm text-gray-500">from last month</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">No change from last month</span>
          )}
        </div>
      ) : (
        <span className="text-sm text-gray-500">No trend data available</span>
      )}
    </div>
  );
}
