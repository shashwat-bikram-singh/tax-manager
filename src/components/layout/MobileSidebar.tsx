import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

interface MobileSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onOpenChange,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <Sidebar isOpen={true} />
      </SheetContent>
    </Sheet>
  );
};

export default MobileSidebar;