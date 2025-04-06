import React from 'react';
import { useParams } from 'react-router-dom';
import CommentsPage from './CommentsPage';

const MemePage = () => {
  const { id } = useParams();
  
  // Pass the ID explicitly to the CommentsPage component
  return <CommentsPage memeId={id} />;
};

export default MemePage;