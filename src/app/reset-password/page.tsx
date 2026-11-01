import ResetPasswordForm from "./ResetPasswordForm";

// The reset email's link lands here (?code=… with PKCE). The browser
// Supabase client exchanges the code for a recovery session on load; the
// form then sets the new password.
export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-4">
      <div className="w-full max-w-sm">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
