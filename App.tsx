import React from 'react';
import AgentWorkflowPage from './components/AgentWorkflowPage';
import './index.css';

const App: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <AgentWorkflowPage />
    </div>
  );
};

export default App;
