// lib/email.ts
import type { LeadARischio } from '@/lib/tasks'

export async function sendOverdueDigest(rischio: LeadARischio[]) {
  if (rischio.length === 0) return
  if (!process.env.RESEND_API_KEY) {
    console.warn('[sendOverdueDigest] RESEND_API_KEY not configured, skipping')
    return
  }
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const rows = rischio
    .map(({ lead, giorni, maiContattato }) => {
      const name = [lead.nome, lead.cognome].filter(Boolean).join(' ') || lead.azienda || lead.email
      const label = maiContattato ? `mai contattato, ${giorni}gg` : `${giorni}gg fa`
      return `• <a href="${appUrl}/leads/${lead.id}">${name}${lead.azienda ? ` — ${lead.azienda}` : ''}</a> (${label})`
    })
    .join('<br/>')

  try {
    await resend.emails.send({
      from: 'CRM <onboarding@resend.dev>',
      to: process.env.RESEND_TO_EMAIL!,
      subject: `CRM — ${rischio.length} lead da ricontattare`,
      html: `
      <h2>Lead da ricontattare</h2>
      <p>${rows}</p>
      <p><a href="${appUrl}/dashboard">Apri dashboard</a></p>
    `,
    })
  } catch (err) {
    console.error('[sendOverdueDigest] Failed to send email:', err)
  }
}
