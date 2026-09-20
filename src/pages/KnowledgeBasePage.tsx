import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { KnowledgeBaseView } from '../components/knowledge/KnowledgeBaseView.tsx';

export const KnowledgeBasePage: React.FC = () => {
  const { token, user } = useAuth();

  return (
    <KnowledgeBaseView
      token={token}
      userRole={user?.role}
      userName={user?.name}
    />
  );
};

