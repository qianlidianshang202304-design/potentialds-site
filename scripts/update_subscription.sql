-- 更新用户订阅类型为年付会员
UPDATE profiles
SET subscription_type = 'yearly',
    is_paid = true
WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'kimball@wonderbiotics.com'
);

-- 查看更新结果
SELECT p.id, u.email, p.subscription_type, p.is_paid 
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'kimball@wonderbiotics.com';