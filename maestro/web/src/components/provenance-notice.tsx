import React from "react";

export const ProvenanceNotice: React.FC<{ title?: string; text: string }> = ({
  title = "Historical Notice",
  text,
}) => (
  <div className="my-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
    <p className="font-semibold">{title}</p>
    <p className="mt-1">{text}</p>
  </div>
);
