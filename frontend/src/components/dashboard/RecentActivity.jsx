// src/components/dashboard/RecentActivity.jsx
import React from "react";
import Card from "../ui/Card";

const RecentActivity = () => {
  const activities = [
    "Added new vehicle entry (Scope 1)",
    "Updated electricity usage (Scope 2)",
    "Completed company setup",
  ];

  return (
    <div className="mt-6">
      <h3 className="text-md font-medium mb-2">Recent Activity</h3>
      <div className="space-y-2">
        {activities.map((item, idx) => (
          <Card key={idx}>
            <p className="text-sm">{item}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
