import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: "Home", to: "/" },
    { label: "About", to: "/about" },
  ];

  return (
    <div className="text-sm text-white w-full mb-4">
      <div className="text-center font-medium py-2 bg-linear-to-r from-violet-500 via-[#9938CA] to-[#E0724A]">
        <p>
          Find trusted professionals <span className="underline underline-offset-2">for every job at home!</span>
        </p>
      </div>

      <nav className="relative h-17.5 flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 bg-white text-gray-900 transition-all shadow">
        <a href="#" className="text-xl font-bold">
          Logo
        </a>

        <ul className="hidden md:flex items-center space-x-8 md:pl-28">
          {menuItems.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="hover:text-violet-600">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <button className="md:inline hidden bg-white hover:bg-gray-50 border border-gray-300 ml-20 px-9 py-2 rounded-full active:scale-95 transition-all">
          Get started
        </button>

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
        </div>
      </nav>
    </div>
  );
}
