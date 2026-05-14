// lib/calendar.ts
import { google } from 'googleapis'

function getCalendarClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  })
  return google.calendar({ version: 'v3', auth })
}

export async function createReminderEvent({
  summary,
  date,
  leadUrl,
  calendarId = 'primary',
}: {
  summary: string
  date: string        // YYYY-MM-DD
  leadUrl: string
  calendarId?: string
}) {
  const calendar = getCalendarClient()

  await calendar.events.insert({
    calendarId,
    requestBody: {
      summary,
      description: `CRM Lead: ${leadUrl}`,
      start: { date },
      end: { date },
      reminders: { useDefault: true },
    },
  })
}
