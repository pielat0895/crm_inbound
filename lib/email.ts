// lib/email.ts
import type { LeadWithComputed } from '@/types'

export async function sendOverdueDigest(leads: LeadWithComputed[]) {
  if (leads.length === 0) return
  if (!process.env.RESEND_API_KEY) {
    console.warn('[sendOverdueDigest] RESEND_API_KEY not configured, skipping')
    return
  }
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const rows = leads
    .map(l => {
      const name = [l.nome, l.cognome].filter(Boolean).join(' ') || l.azienda || l.email
      return `• <a href="${appUrl}/leads/${l.id}">${name}${l.azienda ? ` — ${l.azienda}` : ''}</a> (${l.giorni_ultimo_contatto}gg fa)`
    })
    .join('<br/>')

  try {
    await resend.emails.send({
      from: 'CRM <onboarding@resend.dev>',
      to: process.env.RESEND_TO_EMAIL!,
      subject: `CRM — ${leads.length} lead da ricontattare`,
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
