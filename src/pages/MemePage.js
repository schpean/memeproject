import React from 'react';
import { useParams } from 'react-router-dom';
import CommentsPage from './CommentsPage';

const MemePage = () => {
  const { id } = useParams();
  
  return <CommentsPage />;
};

export default MemePage; 