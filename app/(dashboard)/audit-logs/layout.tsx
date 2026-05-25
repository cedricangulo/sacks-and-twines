interface Props {
  children: React.ReactNode
}

export default function AuditLogsLayout({ children }: Props) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold type-lg">Audit Logs</h2>
      </div>
      {children}
    </div>
  )
}
