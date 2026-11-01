import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { Task, TaskCategory, TASK_CATEGORY_METADATA } from '../utils/taskStatusSystem';
import {
  calculateThirtyDayTaskCompletion,
  CATEGORY_CHART_COLORS,
  CategoryCompletionMetric,
} from '../utils/taskCompletionAnalytics';

interface TaskCompletionChartWidgetProps {
  tasks: Task[];
  activeFilterCategory: TaskCategory | 'all';
  onSelectCategory: (category: TaskCategory | 'all') => void;
}

type ChartViewMode = 'category_bars' | 'thirty_day_trend';

export const TaskCompletionChartWidget: React.FC<TaskCompletionChartWidgetProps> = ({
  tasks,
  activeFilterCategory,
  onSelectCategory,
}) => {
  const [chartView, setChartView] = useState<ChartViewMode>('category_bars');

  const summary = useMemo(() => {
    return calculateThirtyDayTaskCompletion(tasks, new Date(), 30);
  }, [tasks]);

  const startDateShort = useMemo(() => {
    return new Date(summary.windowStartIso).toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'short',
    });
  }, [summary.windowStartIso]);

  const endDateShort = useMemo(() => {
    return new Date(summary.windowEndIso).toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'short',
    });
  }, [summary.windowEndIso]);

  return (
    <section
      aria-labelledby="task-completion-chart-heading"
      data-testid="task-completion-chart-widget"
      className="rounded-xl border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-4 sm:p-5 space-y-4"
    >
      {/* Top Header & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#D3DDD6] dark:border-[#2B3C34]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#52645B] dark:text-[#9DB0A5]">
            <span>गत 30 दिवस विश्लेषण (Last 30 Days)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {startDateShort} – {endDateShort}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              कुल पूर्णता दर: {summary.overallCompletionRate}% ({summary.totalCompletedInWindow}/
              {summary.totalTasksInWindow})
            </span>
          </div>
          <h3
            id="task-completion-chart-heading"
            className="text-base sm:text-lg font-bold text-[#13231C] dark:text-[#E7F0EA] m-0"
          >
            श्रेणीवार कार्य पूर्णता दर (30-Day Task Completion Rates by Category)
          </h3>
        </div>

        {/* Interactive Chart Mode Segmented Buttons */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#E6EDE8] dark:bg-[#1E2E26] self-start lg:self-auto"
          role="group"
          aria-label="Chart visualization mode"
        >
          <button
            type="button"
            onClick={() => setChartView('category_bars')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              chartView === 'category_bars'
                ? 'bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] shadow-xs'
                : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-[#E7F0EA]'
            }`}
          >
            श्रेणी तुलना (Category Rates)
          </button>
          <button
            type="button"
            onClick={() => setChartView('thirty_day_trend')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              chartView === 'thirty_day_trend'
                ? 'bg-white dark:bg-[#16231D] text-[#13231C] dark:text-[#E7F0EA] shadow-xs'
                : 'text-[#52645B] dark:text-[#9DB0A5] hover:text-[#13231C] dark:hover:text-[#E7F0EA]'
            }`}
          >
            30-दिवसीय रुझान (30-Day Trend)
          </button>
        </div>
      </div>

      {/* 3 Category KPI Cards (Interactive Filter Triggers) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {summary.byCategory.map((item: CategoryCompletionMetric) => {
          const isSelected = activeFilterCategory === item.category;
          const catMeta = TASK_CATEGORY_METADATA[item.category];

          return (
            <button
              key={item.category}
              type="button"
              onClick={() =>
                onSelectCategory(isSelected ? 'all' : item.category)
              }
              className={`p-3.5 rounded-xl border text-left transition-colors ${
                isSelected
                  ? 'border-[#0D5B49] dark:border-[#00F5D4] bg-[#F1F5F2] dark:bg-[#1E2E26]'
                  : 'border-[#D3DDD6] dark:border-[#2B3C34] bg-[#F8FAF9] dark:bg-[#1A2A22] hover:bg-[#F1F5F2] dark:hover:bg-[#1E2E26]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#13231C] dark:text-[#E7F0EA] truncate">
                  <span aria-hidden="true" className="mr-1.5">
                    {catMeta.icon}
                  </span>
                  {item.labelHi} ({item.labelEn})
                </div>
                <span className="text-lg font-bold font-mono tabular-nums text-[#0D5B49] dark:text-[#3FBF9B]">
                  {item.completionRate}%
                </span>
              </div>

              {/* Clean Progress Track */}
              <div className="w-full h-2 rounded-full bg-[#E6EDE8] dark:bg-[#2B3C34] overflow-hidden my-2">
                <div
                  className="h-full rounded-full transition-transform duration-200 origin-left"
                  style={{
                    width: `${item.completionRate}%`,
                    backgroundColor: item.fillColor,
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#52645B] dark:text-[#9DB0A5] font-mono tabular-nums">
                <span>
                  पूर्ण: {item.completedTasks}/{item.totalTasks}
                </span>
                <span>·</span>
                <span>प्रगति: {item.inProgressTasks}</span>
                <span>·</span>
                <span
                  className={
                    item.overdueTasks > 0
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : ''
                  }
                >
                  विलंबित: {item.overdueTasks}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recharts Visualization Canvas */}
      {summary.totalTasksInWindow === 0 ? (
        <div className="py-10 text-center rounded-lg border border-dashed border-[#D3DDD6] dark:border-[#2B3C34]">
          <p className="text-sm font-semibold text-[#13231C] dark:text-[#E7F0EA]">
            पिछले 30 दिनों में कोई कार्य डेटा उपलब्ध नहीं है।
          </p>
          <p className="text-xs text-[#52645B] dark:text-[#9DB0A5] mt-1">
            नया कार्य जोड़ने पर यहाँ श्रेणीवार पूर्णता दर (Administrative, Academic, Extra-curricular) दिखाई देगी।
          </p>
        </div>
      ) : (
        <div className="w-full min-h-[280px] pt-2" data-testid="recharts-canvas-container">
          {chartView === 'category_bars' ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={summary.byCategory}
                margin={{ top: 12, right: 20, left: 0, bottom: 8 }}
                barSize={44}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(130, 150, 140, 0.22)"
                />
                <XAxis
                  dataKey="displayName"
                  tick={{ fill: '#52645B', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: 'rgba(130, 150, 140, 0.35)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fill: '#52645B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(13, 91, 73, 0.06)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload as CategoryCompletionMetric;
                    return (
                      <div className="rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-3 shadow-md text-xs space-y-1">
                        <div className="font-bold text-[#13231C] dark:text-[#E7F0EA]">
                          {data.displayName}
                        </div>
                        <div className="font-mono tabular-nums text-[#0D5B49] dark:text-[#3FBF9B] font-semibold">
                          पूर्णता दर (Completion Rate): {data.completionRate}%
                        </div>
                        <div className="font-mono tabular-nums text-[#52645B] dark:text-[#9DB0A5]">
                          पूर्ण कार्य: {data.completedTasks} / कुल {data.totalTasks}
                        </div>
                        <div className="font-mono tabular-nums text-[#52645B] dark:text-[#9DB0A5]">
                          प्रगति पर: {data.inProgressTasks} · विलंबित: {data.overdueTasks}
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  formatter={() => (
                    <span className="text-xs font-medium text-[#52645B] dark:text-[#9DB0A5]">
                      30-दिवसीय कार्य पूर्णता प्रतिशत (Completion Rate %)
                    </span>
                  )}
                />
                <Bar
                  dataKey="completionRate"
                  name="Completion Rate (%)"
                  radius={[6, 6, 0, 0]}
                >
                  {summary.byCategory.map((entry) => (
                    <Cell key={`cell-${entry.category}`} fill={entry.fillColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={summary.trendSeries}
                margin={{ top: 12, right: 20, left: 0, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(130, 150, 140, 0.22)"
                />
                <XAxis
                  dataKey="bucketLabel"
                  tick={{ fill: '#52645B', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(130, 150, 140, 0.35)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fill: '#52645B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    return (
                      <div className="rounded-lg border border-[#D3DDD6] dark:border-[#2B3C34] bg-white dark:bg-[#16231D] p-3 shadow-md text-xs space-y-1">
                        <div className="font-bold text-[#13231C] dark:text-[#E7F0EA]">
                          अवधि: {label}
                        </div>
                        {payload.map((entry: any) => (
                          <div
                            key={entry.name}
                            className="flex items-center justify-between gap-4 font-mono tabular-nums"
                            style={{ color: entry.color }}
                          >
                            <span>{entry.name}:</span>
                            <span className="font-bold">{entry.value}%</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend verticalAlign="top" height={32} />
                <Area
                  type="monotone"
                  dataKey="Administrative"
                  name="प्रशासनिक (Administrative)"
                  stroke={CATEGORY_CHART_COLORS.Administrative}
                  fill={CATEGORY_CHART_COLORS.Administrative}
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Academic"
                  name="शैक्षणिक (Academic)"
                  stroke={CATEGORY_CHART_COLORS.Academic}
                  fill={CATEGORY_CHART_COLORS.Academic}
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Extra-curricular"
                  name="सह-पाठ्यचर्या (Extra-curricular)"
                  stroke={CATEGORY_CHART_COLORS['Extra-curricular']}
                  fill={CATEGORY_CHART_COLORS['Extra-curricular']}
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </section>
  );
};
