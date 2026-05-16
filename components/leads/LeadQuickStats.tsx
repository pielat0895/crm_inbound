type Props = {
  total: number
  attivi: number
  scaduti: number
}

export function LeadQuickStats({ total, attivi, scaduti }: Props) {
  return (
    <div className="flex gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-foreground">{total}</span>
        <span className="text-muted-foreground">totali</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-foreground">{attivi}</span>
        <span className="text-muted-foreground">attivi</span>
      </div>
      {scaduti > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-destructive">{scaduti}</span>
          <span className="text-muted-foreground">follow-up scaduti</span>
        </div>
      )}
    </div>
  )
}
