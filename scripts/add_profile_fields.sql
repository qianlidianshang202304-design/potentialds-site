-- 添加新字段到 profiles 表
ALTER TABLE profiles
ADD COLUMN export_today INTEGER DEFAULT 0,
ADD COLUMN export_month INTEGER DEFAULT 0,
ADD COLUMN export_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN subscription_type VARCHAR(20) DEFAULT 'free';

-- 为现有记录设置默认值
UPDATE profiles
SET export_today = 0,
    export_month = 0,
    export_date = CURRENT_DATE,
    subscription_type = 'free'
WHERE export_today IS NULL OR export_month IS NULL OR export_date IS NULL OR subscription_type IS NULL;