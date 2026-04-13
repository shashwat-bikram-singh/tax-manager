import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center space-y-4">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">404</h1>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
      </div>
      <Button onClick={() => navigate('/')}>
        <Home className="mr-2 h-4 w-4" />
        Go to Dashboard
      </Button>
    </div>
  );
};

export default NotFound;