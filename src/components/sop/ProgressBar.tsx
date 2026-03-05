"use client";

interface ProgressBarProps {
  completed: number;
  total: number;
  showLabel?: boolean;
}

const ProgressBar = ({ completed, total, showLabel = true }: ProgressBarProps) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-gray-500">
            {completed}/{total} steps
          </span>
          <span className="text-xs font-bold text-amber-600">
            {percentage}%
          </span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
