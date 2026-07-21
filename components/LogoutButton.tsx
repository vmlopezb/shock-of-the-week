import { logoutAction } from "@/app/actions/auth";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit" className="btn-secondary !px-3 !py-1.5 text-xs">
        Log out
      </button>
    </form>
  );
}
