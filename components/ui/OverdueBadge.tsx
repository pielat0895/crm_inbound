import { Badge } from '@/components/ui/badge'

type Props = {
  giorni: number | null
  threshold: number
}

export function OverdueBadge({ giorni, threshold }: Props) {
  if (giorni === null) return null
  if (giorni >= threshold) {
    return <Badge variant="destructive">{giorni}gg</Badge>
  }
  if (giorni >= threshold * 0.7) {
    return <Badge variant="outline" className="border-orange-400 text-orange-600">{giorni}gg</Badge>
  }
  return null
}
