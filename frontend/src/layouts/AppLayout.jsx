import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({ children, pageTitle }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const headerHeight = 0;
  const sidebarWidth = sidebarCollapsed ? 80 : 260;

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 768 && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [windowWidth]);

  return (
    <div style={{ 
      display: "flex", 
      width: "100vw",
      height: "100vh",
      margin: 0,
      padding: 0,
      backgroundColor: "#f9fafb",
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: "hidden",
      "--app-sidebar-width": `${sidebarWidth}px`,
    }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarWidth,
        height: "100vh",
        transition: "width 0.3s ease",
        flexShrink: 0,
      }}>
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onCollapse={setSidebarCollapsed} 
        />
      </div>
      
      {/* Main Content */}
      <div style={{
        flex: 1,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f9fafb",
        overflow: "hidden",
      }}>
        <div style={{
          height: headerHeight,
          width: "100%",
          flexShrink: 0,
        }}>
          {/*<Header title={pageTitle || "ESG Calculator"} />*/}
        </div>

        <main style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          backgroundColor: "#f9fafb",
          padding: windowWidth < 768 ? "16px" : "24px",
        }}>
          <div style={{
            maxWidth: "1400px",
            margin: "0 auto",
            height: "100%",
            backgroundColor: "#f9fafb",
          }}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {windowWidth < 768 && !sidebarCollapsed && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 999,
            cursor: "pointer",
          }}
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
}