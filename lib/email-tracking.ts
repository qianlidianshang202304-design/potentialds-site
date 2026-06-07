export type EmailMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'bounced'
  | 'complained'
  | 'unsubscribed'
  | 'failed'
  | 'cancelled';

const engagementRank: Partial<Record<EmailMessageStatus, number>> = {
  queued: 0,
  sending: 1,
  sent: 2,
  delivered: 3,
  opened: 4,
  clicked: 5,
  replied: 6,
};

const terminalStatuses = new Set<EmailMessageStatus>([
  'bounced',
  'complained',
  'unsubscribed',
  'failed',
  'cancelled',
]);

export function nextEmailStatus(current: string, incoming: EmailMessageStatus) {
  const currentStatus = current as EmailMessageStatus;
  if (terminalStatuses.has(incoming)) return incoming;
  if (terminalStatuses.has(currentStatus)) return currentStatus;

  const currentRank = engagementRank[currentStatus] ?? 0;
  const incomingRank = engagementRank[incoming] ?? 0;
  return incomingRank >= currentRank ? incoming : currentStatus;
}

export function crmStatusForEmailEvent(eventType: EmailMessageStatus) {
  if (eventType === 'opened') return 'opened';
  if (eventType === 'clicked') return 'clicked';
  if (eventType === 'replied') return 'replied';
  return null;
}
