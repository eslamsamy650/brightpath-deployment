export function Navbar({ loggedIn, displayName, onLogoutClick }) {
  return (
    <nav>
      <a href="#top" className="logo">
        <div className="logo-mark">🌟</div>
        Bright<span>Path</span>
      </a>
      <ul className="nav-links">
        <li>
          <a href="#features">Features</a>
        </li>
        <li>
          <a href="#dashboard">Dashboard</a>
        </li>
        <li>
          <a href="#grades">Grades</a>
        </li>
        <li>
          <a href="#attendance">Attendance</a>
        </li>
        <li>
          <a href="#messages">Messages</a>
        </li>
        {!loggedIn && (
          <li id="navGuest">
            <a href="#login" className="nav-sign-in">
              Sign In
            </a>
          </li>
        )}
        {loggedIn && (
        <li id="navUser" className="nav-user-wrap">
          <span id="navUserLabel" className="nav-user-label">
            {displayName || ''}
          </span>
          <button
            type="button"
            id="navLogout"
            className="nav-sign-in nav-btn-reset"
            onClick={() => void onLogoutClick?.()}
          >
            Log out
          </button>
        </li>
        )}
      </ul>
    </nav>
  );
}
