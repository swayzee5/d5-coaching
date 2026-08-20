import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        Se déconnecter
      </button>
    </form>
  );
}
