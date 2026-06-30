export const RETENTION_DAYS = Number(process.env.RETENTION_DAYS ?? 30)

/** Events are removed this many days after event_date. */
export function retentionCutoffDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - RETENTION_DAYS)
  return d.toISOString().slice(0, 10)
}
