/** @vitest-environment jsdom */
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionTimelineUsage } from '@argos/shared'
import { SessionTimelineChart } from './session-timeline-chart'

vi.mock('recharts', async () => {
  const originalModule = await vi.importActual('recharts')
  return {
    ...originalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ComposedChart: () => null,
  }
})

describe('SessionTimelineChart timestamp admission', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('bounds usage timestamp parsing independently of sort comparisons', () => {
    const usageTimeline: SessionTimelineUsage[] = [
      {
        timestamp: '2026-09-07T00:04:00.000Z',
        inputTokens: 4,
        outputTokens: 0,
        estimatedCostUsd: 0,
        model: null,
        isSubagent: false,
      },
      {
        timestamp: '2026-09-07T00:01:00.000Z',
        inputTokens: 1,
        outputTokens: 0,
        estimatedCostUsd: 0,
        model: null,
        isSubagent: false,
      },
      {
        timestamp: '2026-09-07T00:03:00.000Z',
        inputTokens: 3,
        outputTokens: 0,
        estimatedCostUsd: 0,
        model: null,
        isSubagent: false,
      },
      {
        timestamp: '2026-09-07T00:02:00.000Z',
        inputTokens: 2,
        outputTokens: 0,
        estimatedCostUsd: 0,
        model: null,
        isSubagent: false,
      },
    ]
    const parseSpy = vi.spyOn(Date, 'parse')

    render(
      <SessionTimelineChart
        usageTimeline={usageTimeline}
        messages={[]}
        sessionStartedAt="2026-09-07T00:00:00.000Z"
      />
    )

    expect(parseSpy.mock.calls.length).toBeLessThanOrEqual(usageTimeline.length * 2)
  })
})
