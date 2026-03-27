// src/components/layout/Sidebar.jsx
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
  FiHome, 
  FiSettings, 
  FiTruck, 
  FiBriefcase, 
  FiZap, 
  FiFileText,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiHelpCircle
} from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";

function Sidebar({ collapsed, onCollapse }) {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const { logout } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const getInitials = () => {
    const name = user?.displayName || user?.email || "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <FiHome size={20} />, color: "#2E7D64" },
    { label: "Company Setup", path: "/setup", icon: <FiBriefcase size={20} />, color: "#2E7D64" },
    { label: "Scope 1", path: "/scope1", icon: <FiTruck size={20} />, color: "#2E7D64" },
    { label: "Scope 2", path: "/scope2", icon: <FiZap size={20} />, color: "#2E7D64" },
    { label: "Reports", path: "/reports", icon: <FiFileText size={20} />, color: "#2E7D64" },
  ];

  const bottomItems = [
    { label: "Settings", path: "/settings", icon: <FiSettings size={20} />, color: "#6B7280" },
    { label: "Help", path: "/help", icon: <FiHelpCircle size={20} />, color: "#6B7280" },
  ];

  const isActive = (path) => location.pathname === path;

  const handleCollapse = () => onCollapse(!collapsed);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav
      className="sidebar"
      style={{
        width: "100%",
        height: "100vh",
        background: "#1B4D3E",
        padding: collapsed ? "20px 8px" : "20px 16px",
        boxSizing: "border-box",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #2E7D64",
        overflow: "visible",
        position: "relative",
      }}
    >
      {/* Logo Area - Lumyna Brand */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        marginBottom: "32px",
      }}>
        {!collapsed ? (
          <>
            <div style={{
              width: "40px",
              height: "40px",
              background: "#2E7D64",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "20px",
              marginRight: "12px",
            }}>
              <BiLeaf size={20} />
            </div>
            <span style={{ 
              fontWeight: 700, 
              fontSize: "20px", 
              color: "white",
              letterSpacing: "0.5px",
            }}>
              Lumyna
            </span>
          </>
        ) : (
          <div style={{
            width: "44px",
            height: "44px",
            background: "#2E7D64",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "22px",
          }}>
            <BiLeaf size={22} />
          </div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={handleCollapse}
        style={{
          position: "absolute",
          right: "-14px",
          top: "70px",
          width: "28px",
          height: "28px",
          background: "white",
          border: "2px solid #2E7D64",
          borderRadius: "50%",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2E7D64",
          fontSize: "16px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease",
          zIndex: 1100,
          padding: 0,
          outline: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#2E7D64";
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.color = "#2E7D64";
        }}
      >
        {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
      </button>

      {/* Main Navigation Items */}
      <div style={{ 
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        marginBottom: "16px",
      }}>
        <ul style={{ 
          padding: 0, 
          margin: 0, 
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link to={item.path} style={{ textDecoration: "none" }}>
                <button
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    width: "100%",
                    padding: collapsed ? "12px 0" : "10px 12px",
                    background: isActive(item.path)
                      ? "#2E7D64"
                      : hoveredItem === item.path
                      ? "rgba(46, 125, 100, 0.2)"
                      : "transparent",
                    color: isActive(item.path) 
                      ? "white" 
                      : hoveredItem === item.path
                      ? "#FFFFFF"
                      : "#E5E7EB",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: "12px",
                    fontWeight: isActive(item.path) ? 600 : 500,
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    position: "relative",
                  }}
                >
                  <span style={{ color: isActive(item.path) ? "white" : "#E5E7EB" }}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Section */}
      <div style={{ 
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        paddingTop: "16px",
      }}>
        <ul style={{ padding: 0, margin: 0, listStyle: "none", marginBottom: "12px" }}>
          {bottomItems.map((item) => (
            <li key={item.path} style={{ marginBottom: "4px" }}>
              <Link to={item.path} style={{ textDecoration: "none" }}>
                <button
                  onMouseEnter={() => setHoveredItem(item.path)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    width: "100%",
                    padding: collapsed ? "10px 0" : "8px 12px",
                    background: isActive(item.path)
                      ? "rgba(46, 125, 100, 0.2)"
                      : hoveredItem === item.path
                      ? "rgba(46, 125, 100, 0.15)"
                      : "transparent",
                    color: isActive(item.path) ? "white" : "#9CA3AF",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: "12px",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </Link>
            </li>
          ))}

          {/* Logout Button */}
          <li>
            <button
              onClick={handleLogout}
              onMouseEnter={() => setHoveredItem("logout")}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                width: "100%",
                padding: collapsed ? "10px 0" : "8px 12px",
                background: hoveredItem === "logout" ? "rgba(239, 68, 68, 0.15)" : "transparent",
                color: hoveredItem === "logout" ? "#F87171" : "#9CA3AF",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: "12px",
                fontSize: "14px",
                transition: "all 0.2s ease",
              }}
            >
              <FiLogOut size={20} />
              {!collapsed && <span>Logout</span>}
            </button>
          </li>
        </ul>

        {/* User Profile */}
        {!collapsed && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 8px",
            marginTop: "12px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "8px",
          }}>
            <div style={{
              width: "36px",
              height: "36px",
              background: "#2E7D64",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 600,
              fontSize: "14px",
              flexShrink: 0,
            }}>
              {getInitials()}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ 
                fontWeight: 500, 
                fontSize: "13px", 
                color: "white",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {displayName}
              </div>
              <div style={{ 
                fontSize: "11px", 
                color: "#A7F3D0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {displayEmail}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsed view user indicator */}
      {collapsed && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "auto",
          paddingTop: "16px",
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            background: "#2E7D64",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 600,
            fontSize: "12px",
          }}>
            {getInitials()}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Sidebar;