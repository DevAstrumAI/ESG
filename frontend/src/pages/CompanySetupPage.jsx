import { useCompanyStore } from "../store/companyStore";
import { BiLeaf } from "react-icons/bi";
import CompanyWizard from "../components/company/CompanyWizard";
export default function CompanySetupPage() {
  const { company } = useCompanyStore();

  return (
    <div className="setup-page">
      {!company && (
        <div className="page-header">
          <div className="header-content">
            <BiLeaf className="header-icon" />
            <h1>Company Setup</h1>
            <p>Complete your company profile to start calculating emissions</p>
          </div>
        </div>
      )}

      <CompanyWizard />
      
     

      <style jsx>{`
        .setup-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-icon {
          font-size: 48px;
          color: #22C55E;
          animation: float 3s ease-in-out infinite;
        }

        .header-content h1 {
          font-size: 32px;
          font-weight: 700;
          color: #14532D;
          margin: 0 0 8px;
        }

        .header-content p {
          color: #4B5563;
          margin: 0;
          font-size: 16px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        @media (max-width: 768px) {
          .setup-page {
            padding: 16px;
          }

          .header-content {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }

          .header-content h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
}