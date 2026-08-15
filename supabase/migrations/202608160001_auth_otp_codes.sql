-- 自托管邮箱验证码（OTP）表
-- 用于注册验证 / 登录验证码，绕开 Supabase 默认发信服务被国内邮箱屏蔽的问题
CREATE TABLE IF NOT EXISTS public.auth_otp_codes (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup_confirm', 'magic_login')),
  code_digest TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  send_attempts INTEGER NOT NULL DEFAULT 1,
  last_sent_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_codes_email_purpose ON public.auth_otp_codes (email, purpose, created_at DESC);

-- RLS：任何 anon 都不可直接读写，只能通过受控 API（service role 后端）处理
ALTER TABLE public.auth_otp_codes ENABLE ROW LEVEL SECURITY;

-- 帮助函数：update set send_attempts = send_attempts + 1
CREATE OR REPLACE FUNCTION public.increment(x INTEGER) RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(x, 0) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
