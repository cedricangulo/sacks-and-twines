type DailyEntry = {
  date: string
  value: number
}

export interface ForecastResult {
  weekLabel: string
  actual: number
  predicted: number
}

// DAYS_MS is the number of milliseconds in a day (24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
const DAY_MS = 86_400_000

// The HISTORICAL_WEIGHTS array defines the weights for the last four weeks of historical data. The most recent week has the highest weight (0.4), and the weights decrease for each preceding week (0.3, 0.2, 0.1). This weighting scheme is used to calculate a weighted average of historical demand when predicting future demand for weeks that do not have actual data available.
const HISTORICAL_WEIGHTS = [0.4, 0.3, 0.2, 0.1]

export function forecastWeeklyDemand(
  dailyData: DailyEntry[],
  monthStartMs: number
): ForecastResult[] {
  if (dailyData.length === 0) return []

  const monthStart = new Date(monthStartMs)
  const firstDayOfWeek = monthStart.getDay()

  const dayMap = new Map<number, number>()
  for (const entry of dailyData) {
    const [y, m, d] = entry.date.split("-").map(Number)
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) continue
    const ts = new Date(y, m - 1, d).getTime()
    if (ts >= monthStartMs) {
      const week = weekOfMonth(d, firstDayOfWeek)
      dayMap.set(week, (dayMap.get(week) ?? 0) + entry.value)
    }
  }

  const weekNumbers = Array.from(dayMap.keys()).sort((a, b) => a - b)
  if (weekNumbers.length === 0) return []

  const historyTotals = computeTrailingWeeks(dailyData, monthStartMs)
  const predictions = computePerWeekPredictions(weekNumbers, historyTotals)

  return weekNumbers.map((week) => ({
    weekLabel: `Week ${week}`,
    actual: Math.round(dayMap.get(week) ?? 0),
    predicted: predictions.get(week) ?? 0,
  }))
}

function computeTrailingWeeks(
  dailyData: DailyEntry[],
  monthStartMs: number
): number[] {
  const totals: number[] = []

  for (let i = 0; i < 4; i++) {
    const blockEnd = monthStartMs - i * 7 * DAY_MS
    const blockStart = blockEnd - 7 * DAY_MS

    let total = 0
    for (const entry of dailyData) {
      const [y, m, d] = entry.date.split("-").map(Number)
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) continue
      const ts = new Date(y, m - 1, d).getTime()
      if (ts >= blockStart && ts < blockEnd) {
        total += entry.value
      }
    }
    totals.push(total)
  }

  return totals
}

function computePerWeekPredictions(
  weekNumbers: number[],
  historyTotals: number[]
): Map<number, number> {
  const weightedAverage = computeWeightedAverage(historyTotals)

  const predictions = new Map<number, number>()

  for (const week of weekNumbers) {
    if (week >= 1 && week <= 4 && historyTotals[week - 1] > 0) {
      predictions.set(week, Math.round(historyTotals[week - 1]))
    } else {
      predictions.set(week, weightedAverage)
    }
  }

  return predictions
}

function computeWeightedAverage(historyTotals: number[]): number {
  const activeIndexes = historyTotals
    .map((val, idx) => (val > 0 ? idx : -1))
    .filter((idx) => idx >= 0)

  if (activeIndexes.length === 0) return 0

  let weightedSum = 0
  let weightSum = 0

  for (const idx of activeIndexes) {
    weightedSum += historyTotals[idx] * HISTORICAL_WEIGHTS[idx]
    weightSum += HISTORICAL_WEIGHTS[idx]
  }

  return Math.round(weightedSum / weightSum)
}

function weekOfMonth(dayOfMonth: number, firstDayOfWeek: number): number {
  return Math.ceil((dayOfMonth + firstDayOfWeek) / 7)
}
