// src/components/company/FacilitiesList.jsx
import { FiMapPin } from "react-icons/fi";
import { BiBuilding } from "react-icons/bi";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";

export default function FacilitiesList({ locations }) {
  return (
    <div className="facilities-step">
      <div className="step-header">
        <span className="step-icon">🏛️</span>
        <h3>Facilities & Locations</h3>
      </div>

      <p className="step-description">
        Review the facilities and locations you've added for your company.
      </p>

      {/* Facilities List - Read Only Table */}
      <Card className="facilities-list-card">
        <div className="list-header">
          <div>
            <h4>Your Facilities</h4>
            <p className="list-subtitle">Summary of all registered locations</p>
          </div>
          <span className="facility-count">{locations.length} {locations.length === 1 ? 'facility' : 'facilities'}</span>
        </div>

        {locations.length === 0 ? (
          <EmptyState 
            message="No facilities added yet" 
            suggestion="Go back to Step 3 to add cities"
          />
        ) : (
          <div className="table-wrapper">
            <table className="facilities-table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>Country</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, index) => (
                  <tr key={loc.id} className={index % 2 === 0 ? 'even-row' : 'odd-row'}>
                    <td>
                      <div className="city-cell">
                        <FiMapPin className="cell-icon" />
                        <span className="city-name">{loc.city}</span>
                      </div>
                    </td>
                    <td>
                      <span className="country-badge">
                        {loc.country === 'uae' ? 'UAE' : 
                         loc.country === 'qatar' ? 'Qatar' : 'Saudi Arabia'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge active">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <style jsx>{`
        .facilities-step {
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .step-icon {
          font-size: 32px;
        }

        .step-header h3 {
          font-size: 22px;
          font-weight: 700;
          color: #14532D;
          margin: 0;
        }

        .step-description {
          color: #4B5563;
          margin-bottom: 32px;
          font-size: 15px;
          line-height: 1.6;
        }

        /* Facilities List - Read Only Table */
        .facilities-list-card {
          padding: 0;
          border: 1px solid rgba(34, 197, 94, 0.15);
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: linear-gradient(135deg, #f8faf8 0%, #f0f9f0 100%);
          border-bottom: 2px solid rgba(34, 197, 94, 0.2);
        }

        .list-header h4 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 700;
          color: #14532D;
        }

        .list-subtitle {
          margin: 0;
          font-size: 13px;
          color: #4B5563;
        }

        .facility-count {
          padding: 6px 16px;
          background: white;
          color: #15803D;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .facilities-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .facilities-table th {
          text-align: left;
          padding: 16px 20px;
          background: white;
          color: #374151;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(34, 197, 94, 0.15);
        }

        .facilities-table td {
          padding: 16px 20px;
          border-bottom: 1px solid #edf2f7;
        }

        .even-row {
          background: white;
        }

        .odd-row {
          background: #fafdfa;
        }

        .city-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cell-icon {
          color: #22C55E;
          font-size: 16px;
        }

        .city-name {
          font-weight: 500;
          color: #14532D;
        }

        .country-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #F0FDF4;
          color: #15803D;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.active {
          background: #E6F7E6;
          color: #15803D;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        @media (max-width: 768px) {
          .facilities-table {
            border: 0;
          }

          .facilities-table thead {
            display: none;
          }

          .facilities-table tr {
            display: block;
            margin-bottom: 16px;
            border: 1px solid rgba(34, 197, 94, 0.15);
            border-radius: 8px;
          }

          .facilities-table td {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            border-bottom: 1px solid #E5E7EB;
          }

          .facilities-table td:last-child {
            border-bottom: none;
          }

          .facilities-table td::before {
            content: attr(data-label);
            font-weight: 600;
            color: #6B7280;
            width: 100px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}