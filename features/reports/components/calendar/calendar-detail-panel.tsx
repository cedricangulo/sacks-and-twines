"use client"

import { Package } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useReportFiltersContext } from "../../hooks/report-filters-context"
import { useAdjustmentsByDateRange } from "../../hooks/use-report-adjustments"
import { useDispatchesByDateRange } from "../../hooks/use-report-dispatches"
import { useReportPagination } from "../../hooks/use-report-pagination"
import ReportAdjustmentTable from "../tables/report-adjustment-table"
import ReportDispatchTable from "../tables/report-dispatch-table"
import ReportPagination from "./report-pagination"

// Detail panel showing dispatches and stock adjustments for a selected day
export default function CalendarDetailPanel() {
  const panelRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState("dispatches")
  const {
    selectedDay,
    selectedDayStartMs,
    selectedDayEndMs,
    formattedDate,
    page,
    setPageValue,
  } = useReportFiltersContext()

  const { data: dispatches, isLoading: isLoadingDispatches } =
    useDispatchesByDateRange(selectedDayStartMs, selectedDayEndMs)

  const { data: adjustments, isLoading: isLoadingAdjustments } =
    useAdjustmentsByDateRange(selectedDayStartMs, selectedDayEndMs)

  const dispatchPagination = useReportPagination(
    dispatches.length,
    page,
    setPageValue
  )

  const adjustmentPagination = useReportPagination(
    adjustments.length,
    page,
    setPageValue
  )

  const currentPagination =
    activeTab === "dispatches" ? dispatchPagination : adjustmentPagination

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    setPageValue(1)
  }

  const paginatedDispatches = useMemo(
    () => dispatchPagination.paginatedData(dispatches),
    [dispatchPagination, dispatches]
  )

  const paginatedAdjustments = useMemo(
    () => adjustmentPagination.paginatedData(adjustments),
    [adjustmentPagination, adjustments]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: formattedDate triggers scroll on day change
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [formattedDate])

  if (selectedDay === null || !formattedDate) return null

  return (
    <div ref={panelRef} data-optional="">
      <h3 className="mb-4 font-semibold type-base">{formattedDate}</h3>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="dispatches">
              Dispatches <Badge variant="warning">{dispatches.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="adjustments">
              Stock Adjustments{" "}
              <Badge variant="success">{adjustments.length}</Badge>
            </TabsTrigger>
          </TabsList>
          {currentPagination.totalPages > 1 ? (
            <ReportPagination pagination={currentPagination} />
          ) : null}
        </div>

        <TabsContent value="dispatches" className="space-y-4 h-80">
          {isLoadingDispatches ? (
            <Skeleton className="w-full h-80" />
          ) : dispatches.length === 0 ? (
            <div className="flex items-start justify-center h-80">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package />
                  </EmptyMedia>
                  <EmptyTitle>
                    There are no dispatches scheduled for this day.
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="overflow-y-auto h-80">
              <ReportDispatchTable dispatches={paginatedDispatches} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4 h-80">
          {isLoadingAdjustments ? (
            <Skeleton className="w-full h-80" />
          ) : adjustments.length === 0 ? (
            <div className="flex items-start justify-center h-80">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package />
                  </EmptyMedia>
                  <EmptyTitle>
                    There are no stock adjustments for this day.
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="overflow-y-auto h-80">
              <ReportAdjustmentTable adjustments={paginatedAdjustments} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
