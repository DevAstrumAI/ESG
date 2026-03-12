// src/components/dashboard/ProgressTracker.jsx
import React from "react";
import ProgressBar from "../ui/ProgressBar";

const ProgressTracker = () => {
  const completion = 40; // Placeholder percentage

  return (
    <div className="my-4">
      <h3 className="text-md font-medium mb-2">Setup Progress</h3>
      <ProgressBar value={completion} />
      <p className="text-sm text-gray-500 mt-1">{completion}% completed</p>
    </div>
  );
};

export default ProgressTracker;
