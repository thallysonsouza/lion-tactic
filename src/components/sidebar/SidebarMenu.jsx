import { NavLink } from "react-router-dom";

import { House, Users, Gavel, Dumbbell, BookOpen } from "lucide-react";

import "./SidebarMenu.css";

function SidebarMenu({ open }) {
  return (
    <div className="sidebar-top">
      <nav>
        <NavLink to="/app" end>
          <House size={22} />

          {open && <span>Home</span>}
        </NavLink>

        <NavLink to="/app/teams">
          <Users size={22} />

          {open && <span>Teams</span>}
        </NavLink>

        <NavLink to="/app/auction">
          <Gavel size={22} />

          {open && <span>Auction Simulator</span>}
        </NavLink>

        <NavLink to="/app/training">
          <Dumbbell size={22} />

          {open && <span>Training Simulator</span>}
        </NavLink>

        <NavLink to="/app/album">
          <BookOpen size={22} />

          {open && <span>Album</span>}
        </NavLink>
      </nav>
    </div>
  );
}

export default SidebarMenu;
