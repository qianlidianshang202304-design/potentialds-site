import { RelationshipStatus } from './crm-types';

const statusAliases: Record<string, RelationshipStatus> = {
  to_contact: 'to_contact',
  '待联系': 'to_contact',
  sent: 'sent',
  '已发送': 'sent',
  opened: 'opened',
  '已打开': 'opened',
  clicked: 'clicked',
  '已点击': 'clicked',
  replied: 'replied',
  '已回复': 'replied',
  negotiating: 'negotiating',
  '洽谈中': 'negotiating',
  partnered: 'partnered',
  '已合作': 'partnered',
  rejected: 'rejected',
  '已拒绝': 'rejected',
  paused: 'paused',
  '暂停': 'paused',
};

export function normalizeImportPlatform(value: unknown) {
  const platform = String(value ?? '').trim().toLowerCase();
  if (platform === 'instagram' || platform === 'ig') return 'instagram';
  if (platform === 'youtube' || platform === 'yt') return 'youtube';
  if (platform === 'tiktok' || platform === 'tik tok' || platform === 'tt') return 'tiktok';
  return platform.slice(0, 40);
}

export function normalizeImportStatus(value: unknown): RelationshipStatus {
  const status = String(value ?? '').trim().toLowerCase();
  return statusAliases[status] ?? 'to_contact';
}

export function importNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(number) ? Math.trunc(number) : null;
}
