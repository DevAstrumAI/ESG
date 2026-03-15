import Scope2Wizard from "./Scope2Wizard";

export default function Scope2Container() {
  return (
    <div className="scope2-container">
      {/* Header */}
      <div className="calculator-header">
        <div className="header-content">
          <h1>Scope 2 Emissions</h1>
          <p>Report your purchased electricity, heating/cooling, and renewable energy usage</p>
          <div className="model-status">
            <span className="status-dot"></span>
            Location-based & Market-based methods available
          </div>
        </div>
      </div>

      {/* Wizard */}
      <Scope2Wizard />

      <style jsx>{`
        .scope2-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .calculator-header {
          background: linear-gradient(135deg, #f0f9f0 0%, #e6f3e6 100%);
          border-radius: 24px;
          padding: 32px;
          margin-bottom: 24px;
          border: 1px solid rgba(46, 125, 50, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .header-content h1 {
          margin: 0 0 12px 0;
          font-size: 28px;
          font-weight: 700;
          color: #1B5E20;
        }

        .header-content p {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #4B5563;
        }

        .model-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: white;
          border-radius: 30px;
          font-size: 13px;
          color: #2E7D32;
          border: 1px solid rgba(46, 125, 50, 0.2);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #2E7D32;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        @media (max-width: 768px) {
          .scope2-container {
            padding: 16px;
          }

          .calculator-header {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
}