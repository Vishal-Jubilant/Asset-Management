const fs = require('fs');
const path = require('path');

const generateFile = (folder, name, title, filterCode, role) => {
  const content = `import React, { useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { INITIAL_REQUESTS } from '../../data/requests';
import RequestTable from '../../components/RequestTable';

const ${name} = () => {
  const { currentUser } = useContext(AppContext);
  const [requests] = useState(INITIAL_REQUESTS${filterCode});
  
  return (
    <div className="space-y-4 animate-in fade-in">
      <h2 className="text-xl font-bold text-slate-900 tracking-tight">${title}</h2>
      <RequestTable requests={requests} role="${role}" />
    </div>
  );
};

export default ${name};
`;
  fs.writeFileSync(path.join(__dirname, 'src', 'pages', folder, `${name}.jsx`), content);
};

// Incharge
generateFile('incharge', 'MyRequests', 'My Requests', '.filter(r => r.requestedBy === currentUser?.id)', 'incharge');
generateFile('incharge', 'TrackRequest', 'Track Request', '.filter(r => r.requestedBy === currentUser?.id)', 'incharge');
fs.writeFileSync(path.join(__dirname, 'src', 'pages', 'incharge', 'NewRequest.jsx'), `import React from 'react';\nconst NewRequest = () => <div className="p-4">New Request Form (Restored)</div>;\nexport default NewRequest;`);
fs.writeFileSync(path.join(__dirname, 'src', 'pages', 'incharge', 'Feedback.jsx'), `import React from 'react';\nconst Feedback = () => <div className="p-4">Feedback Form (Restored)</div>;\nexport default Feedback;`);

// Manager
generateFile('manager', 'TeamRequests', 'Team Requests', '', 'manager');
generateFile('manager', 'PendingApproval', 'Pending Approval', '.filter(r => r.status === "Pending with Manager")', 'manager');
generateFile('manager', 'ApprovedRequests', 'Approved Requests', '.filter(r => r.status === "Approved" || r.status === "Pending with MD")', 'manager');
generateFile('manager', 'ReturnedRequests', 'Returned Requests', '.filter(r => r.status === "Returned")', 'manager');
fs.writeFileSync(path.join(__dirname, 'src', 'pages', 'manager', 'ManagerRequestDetails.jsx'), `import React from 'react';\nconst ManagerRequestDetails = () => <div className="p-4">Request Details (Restored)</div>;\nexport default ManagerRequestDetails;`);

// MD
generateFile('md', 'AllRequests', 'All Requests', '', 'md');
generateFile('md', 'ApprovalQueue', 'Approval Queue', '.filter(r => r.status === "Pending with MD")', 'md');
generateFile('md', 'ApprovedRequests', 'Approved Requests', '.filter(r => r.status === "Approved")', 'md');
generateFile('md', 'RejectedRequests', 'Rejected Requests', '.filter(r => r.status === "Rejected")', 'md');
fs.writeFileSync(path.join(__dirname, 'src', 'pages', 'md', 'MDRequestDetails.jsx'), `import React from 'react';\nconst MDRequestDetails = () => <div className="p-4">Request Details (Restored)</div>;\nexport default MDRequestDetails;`);

console.log("Restored all basic files.");
