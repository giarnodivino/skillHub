import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

type AuthState = {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isAdmin: false,
    isLoading: true,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const syncAuthState = async () => {
      const token = localStorage.getItem("skillhub_access_token");

      if (!token) {
        setAuthState({ isAuthenticated: false, isAdmin: false, isLoading: false });
        return;
      }

      try {
        const response = await api.get("accounts/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setAuthState({
          isAuthenticated: true,
          isAdmin: response.data?.role === "admin",
          isLoading: false,
        });
      } catch {
        localStorage.removeItem("skillhub_access_token");
        localStorage.removeItem("skillhub_refresh_token");
        setAuthState({ isAuthenticated: false, isAdmin: false, isLoading: false });
        window.dispatchEvent(new Event("auth-state-changed"));
      }
    };

    void syncAuthState();

    const handleAuthChange = () => {
      void syncAuthState();
    };

    window.addEventListener("auth-state-changed", handleAuthChange);

    return () => {
      window.removeEventListener("auth-state-changed", handleAuthChange);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("skillhub_access_token");
    localStorage.removeItem("skillhub_refresh_token");
    setAuthState({ isAuthenticated: false, isAdmin: false, isLoading: false });
    window.dispatchEvent(new Event("auth-state-changed"));
    setIsOpen(false);
    navigate("/");
  };

  const menuItems = [
    { label: "About", to: "/about" },
    ...(!authState.isLoading && !authState.isAuthenticated
      ? [
          { label: "Register", to: "/register" },
          { label: "Login", to: "/login" },
        ]
      : []),
    ...(!authState.isLoading && authState.isAuthenticated ? [{ label: "Profile", to: "/profile" }] : []),
    ...(!authState.isLoading && authState.isAuthenticated ? [{ label: "Jobs", to: "/jobs" }] : []),
    ...(!authState.isLoading && authState.isAuthenticated ? [{ label: "Messages", to: "/messages" }] : []),
    ...(!authState.isLoading && authState.isAdmin ? [{ label: "Admin", to: "/admin/contractors" }] : []),
  ];

  return (
    <div className="text-sm text-white w-full mb-4">
      <div className="text-center font-medium py-2 bg-linear-to-r from-violet-500 via-[#9938CA] to-[#E0724A]">
        <p>
          Find trusted professionals <span className="underline underline-offset-2">for every job at home!</span>
        </p>
      </div>

      <nav className="relative h-17.5 flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 bg-white text-gray-900 transition-all shadow">
        <Link to="/" className="text-xl font-bold">
          NexTask
        </Link>

        <ul className="hidden md:flex items-center space-x-8 md:pl-28">
          {menuItems.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="hover:text-violet-600">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {authState.isAuthenticated ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="md:inline hidden bg-white hover:bg-gray-50 border border-gray-300 ml-20 px-9 py-2 rounded-full active:scale-95 transition-all"
          >
            Sign out
          </button>
        ) : (
          <Link
            to="/register"
            className="md:inline hidden bg-white hover:bg-gray-50 border border-gray-300 ml-20 px-9 py-2 rounded-full active:scale-95 transition-all"
          >
            Get started
          </Link>
        )}

        <button
          aria-label="menu-btn"
          type="button"
          className="inline-block md:hidden active:scale-90 transition"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
            <path d="M3 7a1 1 0 1 0 0 2h24a1 1 0 1 0 0-2zm0 7a1 1 0 1 0 0 2h24a1 1 0 1 0 0-2zm0 7a1 1 0 1 0 0 2h24a1 1 0 1 0 0-2z" />
          </svg>
        </button>

        <div
          className={`mobile-menu absolute top-17.5 left-0 w-full bg-white shadow-sm p-6 md:hidden ${
            isOpen ? "block" : "hidden"
          }`}
        >
          <ul className="flex flex-col space-y-4 text-lg">
            {menuItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm text-gray-700 hover:text-violet-600"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {authState.isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-4 w-full rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
