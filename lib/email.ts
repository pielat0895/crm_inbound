// lib/email.ts
import { Resend } from 'resend'
import type { LeadWithComputed } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOverdueDigest(leads: LeadWithComputed[]) {
  if (leads.length === 0) return

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const rows = leads
    .map(l => {
      const name = [l.nome, l.cognome].filter(Boolean).join(' ') || l.azienda || l.email
      return `• <a href="${appUrl}/leads/${l.id}">${name}${l.azienda ? ` — ${l.azienda}` : ''}</a> (${l.giorni_ultimo_contatto}gg fa)`
    })
    .join('<br/>')

  try {
    await resend.emails.send({
      from: 'CRM <noreply@yourdomain.com>',
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
