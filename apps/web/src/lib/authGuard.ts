/**
 * 仅当 NEXT_PUBLIC_REQUIRE_LOGIN_FOR_APP === "true" 时，中间件会拦截未登录访问 /dashboard、/console。
 * 默认不拦截，便于先部署、调模型；正式对用户开放前请在 Vercel 设为 true 并重新部署。
 */
export function isAuthGuardDisabled(): boolean {
  return process.env.NEXT_PUBLIC_REQUIRE_LOGIN_FOR_APP !== "true";
}
