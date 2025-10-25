import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './bottom-nav';

const Layout = () => {
  return (
    <div className="flex flex-col h-screen">
      <main
        className="flex-1"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(var(--dock-total-h, 96px) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
