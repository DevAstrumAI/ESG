import React from "react";

export default function Tabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="tabs-container">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`tab-button ${activeTab === tab ? 'active' : ''}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}