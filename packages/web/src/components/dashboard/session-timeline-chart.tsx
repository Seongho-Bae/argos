'use client'

import React, { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'
import { formatTokens, formatCost, formatRelativeTime } from '@/lib/format'
import type { SessionTimelineUsage, SessionDetail } from '@argos/shared'

interface SessionTimelineChartProps {
  usageTimeline: SessionTimelineUsage[]
  messages: SessionDetail['messages']
  sessionStartedAt: string
}

interface ToolCallPoint {
  toolName: string
  parsedTimestamp: number
}

interface ChartDataItem {
  relativeTime: string
  input: number
  output: number
  cost: number
  model?: string | null
  toolSummary: string
}

/** Format cumulative tool-call counts for the chart tooltip. */
function buildToolSummary(toolCounts: ReadonlyMap<string, number>): string {
  if (toolCounts.size === 0) return ''

  // Map preserves first-seen order, and Array#sort is stable. Equal-count tools
  // therefore retain the chronological order in which they first appeared.
  const sorted = Array.from(toolCounts.entries()).sort((a, b) => b[1] - a[1])

  const displayCount = Math.min(3, sorted.length)
  const displayItems = sorted.slice(0, displayCount).map(([name, count]) => {
    return count > 1 ? `${name} x${count}` : name
  })

  const remaining = sorted.length - displayCount
  if (remaining > 0) {
    return `${displayItems.join(', ')} +${remaining} more`
  }

  return displayItems.join(', ')
}

/**
 * Merge chronologically sorted usage and tool events into cumulative chart rows.
 *
 * Local copies are sorted in O(N log N + M log M). The forward cursor then
 * consumes every tool event once instead of filtering all M events for every
 * one of the N usage rows.
 */
function buildChartData(
  usageTimeline: SessionTimelineUsage[],
  toolCalls: ToolCallPoint[],
  sessionStartedAt: string
): ChartDataItem[] {
  // ⚡ Bolt Optimization: Use Schwartzian transform (pre-parsing timestamps) to prevent O(N log N) Date.parse bottleneck during array sorting.
  const sortedUsage = usageTimeline
    .map((usage) => ({ ...usage, parsedTimestamp: Date.parse(usage.timestamp) }))
    .sort((a, b) => a.parsedTimestamp - b.parsedTimestamp)
  const sortedTools = [...toolCalls].sort(
    (a, b) => a.parsedTimestamp - b.parsedTimestamp
  )

  let toolIndex = 0
  const cumulativeToolCounts = new Map<string, number>()

  return sortedUsage.map((usage) => {
    const currentTimestamp = usage.parsedTimestamp

    while (
      toolIndex < sortedTools.length &&
      sortedTools[toolIndex]!.parsedTimestamp <= currentTimestamp
    ) {
      const toolName = sortedTools[toolIndex]!.toolName || 'unknown'
      cumulativeToolCounts.set(
        toolName,
        (cumulativeToolCounts.get(toolName) ?? 0) + 1
      )
      toolIndex += 1
    }

    return {
      relativeTime: formatRelativeTime(usage.timestamp, sessionStartedAt),
      input: usage.inputTokens,
      output: usage.outputTokens,
      cost: usage.estimatedCostUsd,
      model: usage.model,
      toolSummary: buildToolSummary(cumulativeToolCounts),
    }
  })
}

function CustomTooltip({
  active,
  payload,
}: TooltipProps<number, string> & { chartData?: ChartDataItem[] }) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0]?.payload as ChartDataItem | undefined
  if (!data) return null

  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3">
      <p className="font-medium mb-2">{data.relativeTime}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-1" />
          <span className="text-muted-foreground">Input Tokens:</span>
          <span className="font-medium tabular-nums">{formatTokens(data.input)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-2" />
          <span className="text-muted-foreground">Output Tokens:</span>
          <span className="font-medium tabular-nums">{formatTokens(data.output)}</span>
        </div>
        <div className="pt-1 mt-1 border-t border-border">
          <span className="text-muted-foreground">Cost:</span>
          <span className="font-medium ml-2 tabular-nums">{formatCost(data.cost)}</span>
        </div>
        {data.model && (
          <div>
            <span className="text-muted-foreground">Model:</span>
            <span className="font-medium ml-2">{data.model}</span>
          </div>
        )}
        {data.toolSummary && (
          <div className="pt-1 mt-1 border-t border-border">
            <span className="text-muted-foreground">Tools:</span>
            <span className="font-medium ml-2">{data.toolSummary}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/** Render token usage, cost, model, and cumulative tool activity over time. */
export function SessionTimelineChart({
  usageTimeline,
  messages,
  sessionStartedAt,
}: SessionTimelineChartProps) {
  // Cache the normalized tool events until the underlying messages change.
  const toolCalls: ToolCallPoint[] = useMemo(() => {
    return messages
      .filter((message) => message.role === 'TOOL')
      .map((message) => ({
        toolName: message.toolName ?? 'unknown',
        parsedTimestamp: Date.parse(message.timestamp),
      }))
  }, [messages])

  const chartData = useMemo(
    () => buildChartData(usageTimeline, toolCalls, sessionStartedAt),
    [usageTimeline, sessionStartedAt, toolCalls]
  )

  if (usageTimeline.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">No timeline data available</p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="relativeTime"
          stroke="var(--color-muted-foreground)"
          tickLine={false}
          axisLine={false}
          style={{ fontSize: '11px' }}
        />
        <YAxis
          tickFormatter={formatTokens}
          stroke="var(--color-muted-foreground)"
          tickLine={false}
          axisLine={false}
          style={{ fontSize: '11px' }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }} />
        <Bar
          dataKey="input"
          stackId="tokens"
          fill="var(--color-chart-1)"
          name="Input Tokens"
        />
        <Bar
          dataKey="output"
          stackId="tokens"
          fill="var(--color-chart-2)"
          name="Output Tokens"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
