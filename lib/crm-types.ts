export type Creator = {
  id: string;
  nickname: string | null;
  username: string | null;
  avatar: string | null;
  platform: string | null;
  region: string | null;
  region_zh: string | null;
  tags: string | null;
  link: string | null;
  fans_num: number | null;
  view_avg: number | null;
  interactive_rate_avg: number | null;
  like_avg: number | null;
  biz_count: number | null;
};

export type CreatorList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type RelationshipStatus =
  | 'to_contact'
  | 'sent'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'negotiating'
  | 'partnered'
  | 'rejected'
  | 'paused';

export type CreatorRelationship = {
  id: string;
  user_id: string;
  influencer_id: string;
  status: RelationshipStatus;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  owner_name: string | null;
  quoted_price: number | null;
  quoted_currency: string;
  custom_tags: string[];
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedCreator = {
  id: string;
  user_id: string;
  list_id: string;
  influencer_id: string;
  source: string;
  created_at: string;
  influencers?: Creator | null;
  creator_lists?: Pick<CreatorList, 'id' | 'name' | 'color'> | null;
  creator_relationships?: CreatorRelationship | null;
};

export const relationshipStatuses: Array<{
  value: RelationshipStatus;
  label: string;
}> = [
  { value: 'to_contact', label: '待联系' },
  { value: 'sent', label: '已发送' },
  { value: 'opened', label: '已打开' },
  { value: 'clicked', label: '已点击' },
  { value: 'replied', label: '已回复' },
  { value: 'negotiating', label: '洽谈中' },
  { value: 'partnered', label: '已合作' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'paused', label: '暂停' },
];

export function relationshipStatusLabel(status: RelationshipStatus) {
  return relationshipStatuses.find((item) => item.value === status)?.label ?? status;
}

export function formatCreatorNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  if (value >= 10_000) {
    const amount = value / 10_000;
    return `${amount >= 100 ? amount.toFixed(0) : amount.toFixed(1).replace(/\.0$/, '')}万`;
  }
  return new Intl.NumberFormat('zh-CN').format(value);
}
