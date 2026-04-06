// src/components/reports/TargetTracker.jsx
import React from "react";
import { FiTarget, FiTrendingUp, FiCheckCircle, FiClock, FiAlertCircle } from "react-icons/fi";

export default function TargetTracker({ targets, milestones, currentTotalT }) {
  if (!targets) {
    return (
      <div className="target-tracker-placeholder">
        <p>No target data available</p>
        <style jsx>{`
          .target-tracker-placeholder {
            text-align: center;
            padding: 40px;
            color: #9CA3AF;
            background: #F9FAFB;
            border-radius: 12px;
          }
        `}</style>
      </div>
    );
  }

  const currentReduction = targets.reduction_achieved_pct || 0;
  const target2030 = 42;
  const target2050 = 90;
  const remainingTo2030 = Math.max(0, target2030 - currentReduction);
  const yearsTo2030 = 2030 - new Date().getFullYear();

  // Status based on progress
  const getStatus = () => {
    if (currentReduction >= target2030) return "ahead";
    if (currentReduction >= target2030 * 0.5) return "on-track";
    if (currentReduction > 0) return "behind";
    return "not-started";
  };

  const status = getStatus();

  const statusConfig = {
    ahead: { text: "Ahead of Target", color: "#10B981", icon: <FiCheckCircle /> },
    "on-track": { text: "On Track", color: "#3B82F6", icon: <FiTrendingUp /> },
    behind: { text: "Behind Target", color: "#F59E0B", icon: <FiClock /> },
    "not-started": { text: "Not Started", color: "#9CA3AF", icon: <FiAlertCircle /> }
  };

  // Get key milestones (every 5 years)
  const keyMilestones = milestones?.filter(m => [2025, 2030, 2035, 2040, 2045, 2050].includes(m.year)) || [];

  return (
    <div className="target-tracker">
      {/* Header */}
      <div className="tracker-header">
        <div className="tracker-title">
          <FiTarget className="tracker-icon" />
          <h4>Science-Based Targets Progress</h4>
        </div>
        <div className={`tracker-status ${status}`}>
          {statusConfig[status].icon}
          <span>{statusConfig[status].text}</span>
        </div>
      </div>

      {/* Main Progress Ring */}
      <div className="progress-ring-container">
        <div className="progress-ring">
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r="60"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="12"
            />
            <circle
              cx="70"
              cy="70"
              r="60"
              fill="none"
              stroke={statusConfig[status].color}
              strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 60 * (currentReduction / target2030)} ${2 * Math.PI * 60}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          </svg>
          <div className="progress-ring-text">
            <span className="progress-value">{currentReduction.toFixed(1)}%</span>
            <span className="progress-label">Achieved</span>
          </div>
        </div>

        <div className="target-summary">
          <div className="target-item">
            <span className="target-label">2030 Target</span>
            <span className="target-value">{target2030}% reduction</span>
            <span className="target-sub">SBTi 1.5°C aligned</span>
          </div>
          <div className="target-divider"></div>
          <div className="target-item">
            <span className="target-label">2050 Target</span>
            <span className="target-value">{target2050}% reduction</span>
            <span className="target-sub">Net Zero</span>
          </div>
          <div className="target-divider"></div>
          <div className="target-item">
            <span className="target-label">Remaining to 2030</span>
            <span className="target-value">{remainingTo2030.toFixed(1)}%</span>
            <span className="target-sub">{yearsTo2030} years left</span>
          </div>
        </div>
      </div>

      {/* Progress Bar to 2030 */}
      <div className="progress-bar-container">
        <div className="progress-bar-header">
          <span>Progress to 2030 Target</span>
          <span>{currentReduction.toFixed(1)}% / {target2030}%</span>
        </div>
        <div className="progress-bar-track">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${Math.min((currentReduction / target2030) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Milestone Timeline */}
      <div className="milestone-timeline">
        <h5>Reduction Milestones</h5>
        <div className="timeline-track">
          {keyMilestones.map((milestone, idx) => {
            const isCompleted = (milestone.target_kg || 0) <= (targets.current_total_t || 0);
            const isCurrent = milestone.year === new Date().getFullYear();
            
            return (
              <div key={idx} className="timeline-marker">
                <div className={`marker-dot ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}>
                  {isCompleted && <FiCheckCircle size={12} />}
                </div>
                <div className="marker-year">{milestone.year}</div>
                <div className="marker-target">
                  {milestone.target_kg?.toFixed(0)} t
                </div>
              </div>
            );
          })}
        </div>
        <div className="timeline-labels">
          <span>Today</span>
          <span>2030</span>
          <span>2050</span>
        </div>
      </div>

      {/* Required Annual Reduction */}
      <div className="annual-target">
        <div className="annual-header">
          <FiTrendingUp />
          <span>Required Annual Reduction</span>
        </div>
        <div className="annual-value">
          {(remainingTo2030 / yearsTo2030).toFixed(1)}% per year
        </div>
        <div className="annual-note">
          To achieve {target2030}% reduction by 2030
        </div>
      </div>

      <style jsx>{`
        .target-tracker {
          background: white;
          border-radius: 12px;
          padding: 20px;
          border: 1px solid #E5E7EB;
          margin-bottom: 24px;
        }

        .tracker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .tracker-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tracker-icon {
          font-size: 20px;
          color: #2E7D64;
        }

        .tracker-title h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1B4D3E;
        }

        .tracker-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
        }

        .tracker-status.ahead { background: #D1FAE5; color: #065F46; }
        .tracker-status.on-track { background: #DBEAFE; color: #1E40AF; }
        .tracker-status.behind { background: #FEF3C7; color: #92400E; }
        .tracker-status.not-started { background: #F3F4F6; color: #6B7280; }

        .progress-ring-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .progress-ring {
          position: relative;
          width: 140px;
          height: 140px;
        }

        .progress-ring-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .progress-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #1B4D3E;
        }

        .progress-label {
          font-size: 11px;
          color: #6B7280;
        }

        .target-summary {
          display: flex;
          gap: 24px;
          align-items: center;
          flex-wrap: wrap;
        }

        .target-item {
          text-align: center;
        }

        .target-label {
          display: block;
          font-size: 11px;
          color: #6B7280;
        }

        .target-value {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #1B4D3E;
        }

        .target-sub {
          font-size: 10px;
          color: #9CA3AF;
        }

        .target-divider {
          width: 1px;
          height: 40px;
          background: #E5E7EB;
        }

        .progress-bar-container {
          margin-bottom: 24px;
        }

        .progress-bar-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 8px;
        }

        .progress-bar-track {
          height: 8px;
          background: #E5E7EB;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: #2E7D64;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .milestone-timeline {
          margin-bottom: 24px;
        }

        .milestone-timeline h5 {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 16px;
        }

        .timeline-track {
          display: flex;
          justify-content: space-between;
          position: relative;
          margin-bottom: 8px;
        }

        .timeline-track::before {
          content: '';
          position: absolute;
          top: 12px;
          left: 0;
          right: 0;
          height: 2px;
          background: #E5E7EB;
        }

        .timeline-marker {
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .marker-dot {
          width: 24px;
          height: 24px;
          background: white;
          border: 2px solid #E5E7EB;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
        }

        .marker-dot.completed {
          background: #10B981;
          border-color: #10B981;
          color: white;
        }

        .marker-dot.current {
          border-color: #2E7D64;
          border-width: 3px;
          box-shadow: 0 0 0 3px rgba(46, 125, 100, 0.2);
        }

        .marker-year {
          font-size: 11px;
          font-weight: 500;
          color: #374151;
        }

        .marker-target {
          font-size: 10px;
          color: #6B7280;
        }

        .timeline-labels {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #9CA3AF;
          margin-top: 4px;
        }

        .annual-target {
          background: #F8FAF8;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          border: 1px solid #E5E7EB;
        }

        .annual-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 8px;
        }

        .annual-value {
          font-size: 24px;
          font-weight: 700;
          color: #2E7D64;
        }

        .annual-note {
          font-size: 11px;
          color: #9CA3AF;
          margin-top: 4px;
        }

        @media (max-width: 640px) {
          .progress-ring-container {
            flex-direction: column;
            gap: 20px;
          }
          
          .target-divider {
            width: 80%;
            height: 1px;
          }
          
          .target-summary {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}