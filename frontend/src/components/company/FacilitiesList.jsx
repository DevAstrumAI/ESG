// src/components/company/FacilitiesList.jsx
import { FiMapPin } from "react-icons/fi";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";

export default function FacilitiesList({ locations }) {
  const getCountryLabel = (country) => {
    const countries = {
      'uae': "UAE",
      'qatar': "Qatar",
      'saudi-arabia': "Saudi Arabia",
      'saudi': "Saudi Arabia",
      'singapore': "Singapore",
    };
    return countries[country] || country;
  };

  return (
    <div className="facilities-step">
      <div className="step-header">
        <span className="step-icon">🏛️</span>
        <h3>Facilities & Locations</h3>
      </div>

      <p className="step-description">
        Review the facilities and locations you've added for your company.
      </p>

      <Card className="facilities-list-card">
        <div className="list-header">
          <div>
            <h4>Your Facilities</h4>
            <p className="list-subtitle">Summary of all registered locations</p>
          </div>
          <span className="facility-count">{locations.length} {locations.length === 1 ? 'facility' : 'facilities'}</span>
        </div>

        {locations.length === 0 ? (
          <EmptyState message="No facilities added yet" />
        ) : (
          <div className="table-wrapper">
            <table className="facilities-table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>Country</th>
                  </tr>
                </thead>
              <tbody>
                {locations.map((loc, index) => (
                  <tr key={loc.id}>
                    <td data-label="City">
                      <div className="city-cell">
                        <FiMapPin className="cell-icon" />
                        <span className="city-name">{loc.city}</span>
                      </div>
                    </td>
                    <td data-label="Country">
                      <span className="country-badge">{getCountryLabel(loc.country)}</span>
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
          color: #1B4D3E;
          margin: 0;
        }

        .step-description {
          color: #4A5568;
          margin-bottom: 32px;
          font-size: 15px;
          line-height: 1.6;
        }

        .facilities-list-card {
          padding: 0;
          border: 1px solid #E5E7EB;
          overflow: hidden;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: #F8FAF8;
          border-bottom: 1px solid #E5E7EB;
        }

        .list-header h4 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1B4D3E;
        }

        .list-subtitle {
          margin: 0;
          font-size: 13px;
          color: #6B7280;
        }

        .facility-count {
          padding: 6px 16px;
          background: white;
          color: #2E7D64;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #E5E7EB;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .facilities-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          table-layout: fixed;
        }
        .facilities-table th:first-child,
        .facilities-table td:first-child { width: 55%; }
        .facilities-table th:last-child,
        .facilities-table td:last-child { width: 45%; }

        .facilities-table th {
          text-align: left;
          padding: 14px 20px;
          background: white;
          color: #4A5568;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #E5E7EB;
        }

        .facilities-table td {
          padding: 14px 20px;
          border-bottom: 1px solid #F3F4F6;
        }

        .facilities-table tr:last-child td {
          border-bottom: none;
        }

        .city-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cell-icon {
          color: #2E7D64;
          font-size: 16px;
        }

        .city-name {
          font-weight: 500;
          color: #1B4D3E;
        }

        .country-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #F8FAF8;
          color: #1B4D3E;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid #E5E7EB;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
        }

        

        @media (max-width: 768px) {
          .facilities-table thead {
            display: none;
          }
          .facilities-table tr {
            display: block;
            margin-bottom: 16px;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
          }
          .facilities-table td {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            border-bottom: 1px solid #F3F4F6;
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