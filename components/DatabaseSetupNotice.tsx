export default function DatabaseSetupNotice({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
      {message ?? 'CRM 数据表尚未启用。请先执行 supabase/migrations 中的迁移文件。'}
    </div>
  );
}
