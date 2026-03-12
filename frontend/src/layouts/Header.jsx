// src/components/layout/Header.jsx
import React, { useState, useEffect } from "react";
import { 
  FiBell, 
  FiChevronDown,
  FiSettings,
  FiSun,
  FiLogOut
} from "react-icons/fi";
import { BiLeaf } from "react-icons/bi";
import { GiEarthAmerica, GiWindTurbine } from "react-icons/gi";
import { MdOutlineEnergySavingsLeaf } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useEmissionStore } from "../store/emissionStore";

export default function Header({ title = "ESG Calculator" }) {
  const [scrolled, setScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const scope1Results = useEmissionStore((s) => s.scope1Results);
  const scope2Results = useEmissionStore((s) => s.scope2Results);
  const navigate = useNavigate();

  // ── Derived stats ──────────────────────────────────────────────────────
  const totalKg =
    (scope1Results?.total?.kgCO2e || 0) +
    (scope2Results?.total?.kgCO2e || 0);

  // Carbon score based on total tCO2e
  const getCarbonScore = () => {
    const tonnes = totalKg / 1000;
    if (tonnes === 0) return "—";
    if (tonnes < 5) return "A+";
    if (tonnes < 15) return "A";
    if (tonnes < 30) return "A-";
    if (tonnes < 50) return "B+";
    if (tonnes < 100) return "B";
    return "C";
  };

  // Renewable % = renewable kgCO2e avoided vs total scope2
  const getRenewablePercent = () => {
    const renewableKwh = scope2Results?.renewables?.kgCO2e;
    const totalScope2 = scope2Results?.total?.kgCO2e;
    if (!totalScope2 || totalScope2 === 0) return "—";
    const pct = Math.round((1 - renewableKwh / totalScope2) * 100);
    return `${Math.max(0, pct)}%`;
  };

  // User initials for avatar
  const getInitials = () => {
    const name = user?.displayName || user?.email || "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".profile-menu-wrapper")) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header
      className="esg-header"
      style={{
        width: "100%",
        height: "64px",
        background: scrolled
          ? "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)"
          : "linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)",
        color: "white",
        padding: "0 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: scrolled
          ? "0 4px 20px rgba(0, 40, 0, 0.2)"
          : "0 2px 10px rgba(0, 30, 0, 0.1)",
        transition: "all 0.3s ease",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left — Logo and Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ position: "relative", animation: "float 3s ease-in-out infinite" }}>
          <MdOutlineEnergySavingsLeaf
            size={32}
            style={{ color: "#E8F5E9", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}
          />
          <BiLeaf
            size={16}
            style={{
              position: "absolute", bottom: "-2px", right: "-2px",
              color: "#FFD54F", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.2))",
            }}
          />
        </div>
        <h1 style={{
          margin: 0, color: "white", fontSize: "20px",
          fontWeight: 600, letterSpacing: "-0.5px",
        }}>
          {title}
        </h1>
      </div>

      {/* Center — Live Environmental Metrics */}
      <div style={{
        display: "flex", alignItems: "center", gap: "24px",
        background: "rgba(255,255,255,0.1)", padding: "8px 20px",
        borderRadius: "40px", backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <GiEarthAmerica size={18} color="#E8F5E9" />
          <div>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>Carbon Score</span>
            <span style={{ fontSize: "14px", fontWeight: 600, marginLeft: "4px" }}>
              {getCarbonScore()}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <GiWindTurbine size={18} color="#E8F5E9" />
          <div>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>Total CO₂e</span>
            <span style={{ fontSize: "14px", fontWeight: 600, marginLeft: "4px" }}>
              {totalKg > 0 ? `${(totalKg / 1000).toFixed(1)}t` : "—"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FiSun size={18} color="#E8F5E9" />
          <div>
            <span style={{ fontSize: "11px", opacity: 0.8 }}>Renewable</span>
            <span style={{ fontSize: "14px", fontWeight: 600, marginLeft: "4px" }}>
              {getRenewablePercent()}
            </span>
          </div>
        </div>
      </div>

      {/* Right — Date, Notifications, Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Date/Time */}
        <div style={{
          textAlign: "right",
          borderRight: "1px solid rgba(255,255,255,0.3)",
          paddingRight: "16px",
        }}>
          <div style={{ fontSize: "13px", fontWeight: 500 }}>{formatDate(currentTime)}</div>
          <div style={{ fontSize: "11px", opacity: 0.8 }}>{formatTime(currentTime)}</div>
        </div>

        {/* Notification Bell */}
        <button
          style={{
            background: "rgba(255,255,255,0.1)", border: "none",
            borderRadius: "50%", width: "40px", height: "40px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "white", position: "relative",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
        >
          <FiBell size={20} />
          <span style={{
            position: "absolute", top: "8px", right: "8px",
            width: "8px", height: "8px", background: "#FFD54F",
            borderRadius: "50%", border: "2px solid #2E7D32",
          }} />
        </button>

        {/* Profile Menu */}
        <div className="profile-menu-wrapper" style={{ position: "relative" }}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "30px", padding: "6px 12px",
              display: "flex", alignItems: "center", gap: "8px",
              cursor: "pointer", color: "white", transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          >
            {/* Avatar */}
            <div style={{
              width: "32px", height: "32px",
              background: "linear-gradient(135deg, #FFD54F 0%, #FFB300 100%)",
              borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 600, fontSize: "14px",
              color: "#1B5E20",
            }}>
              {getInitials()}
            </div>
            <span style={{ fontSize: "14px" }}>{displayName}</span>
            <FiChevronDown
              size={16}
              style={{
                transform: showProfileMenu ? "rotate(180deg)" : "none",
                transition: "transform 0.3s ease",
              }}
            />
          </button>

          {/* Dropdown Menu */}
          {showProfileMenu && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              background: "white", borderRadius: "16px", minWidth: "220px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
              border: "1px solid rgba(46,125,50,0.1)",
              overflow: "hidden", zIndex: 200,
            }}>
              {/* User Info */}
              <div style={{
                padding: "16px", borderBottom: "1px solid #F3F4F6",
                background: "linear-gradient(135deg, #f0f9f0, #e6f3e6)",
              }}>
                <div style={{ fontWeight: 600, color: "#1B5E20", fontSize: "15px" }}>
                  {displayName}
                </div>
                <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "2px" }}>
                  {displayEmail}
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ padding: "8px" }}>
                <button
                  onClick={() => { navigate("/settings"); setShowProfileMenu(false); }}
                  style={{
                    width: "100%", padding: "10px 12px", background: "none",
                    border: "none", borderRadius: "10px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "10px",
                    color: "#374151", fontSize: "14px", textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#F3F4F6"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
                  <FiSettings size={16} color="#6B7280" />
                  Settings
                </button>

                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%", padding: "10px 12px", background: "none",
                    border: "none", borderRadius: "10px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "10px",
                    color: "#DC2626", fontSize: "14px", textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#FEF2F2"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
                  <FiLogOut size={16} color="#DC2626" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </header>
  );
}