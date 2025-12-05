
import './App.css'

// App.tsx (Como deve ficar)

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RoutesListPage } from './modules/routes/pages/RoutesListPage'; 
// Importe outros componentes/páginas aqui...

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50">
    {/* ... Header Tailwind ... */}
    <main className="container mx-auto py-6">
      {children}
    </main>
  </div>
);


export const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Rota principal, que exibe a lista de rotas */}
          <Route path="/" element={<RoutesListPage />} />
          
          {/* Outras rotas (login, registro, etc.) */}
          {/* <Route path="/login" element={<LoginPage />} /> */}
          
          <Route path="*" element={<div className="p-4 text-center">404 - Página não encontrada</div>} />
        </Routes>
      </Layout>
    </Router>
  );
};


export default App
