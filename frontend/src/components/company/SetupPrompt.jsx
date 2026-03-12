import PrimaryButton from "../ui/PrimaryButton";

export default function SetupPrompt({ onStartSetup }) {
  return (
    <div style={{ border: "1px solid #D1D5DB", padding: "15px", borderRadius: "8px", marginBottom: "20px", backgroundColor: "#F3F4F6" }}>
      <h4>Company setup is not complete</h4>
      <p>Complete your company setup to start calculating emissions.</p>
          <PrimaryButton onClick={onStartSetup}>
                  Start Setup
          </PrimaryButton>
    </div>
  );
}
