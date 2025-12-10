import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './bottom-nav';

const Layout = () => {
  return (
    <div className="flex flex-col h-[100svh]">
      <main
        className="flex-1"
        style={{
          // Верхний safe-area уже учтён в #root, здесь не дублируем
          paddingBottom: 'var(--dock-total-h, 96px)',
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
