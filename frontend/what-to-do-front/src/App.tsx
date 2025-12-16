
import './App.css'

// App.tsx (Como deve ficar)

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RoutesListPage } from './modules/routes/pages/RoutesListPage'; 
import { RouteDetailPage } from './modules/routes/pages/RouteDetailPage';
import { AuthProvider } from './modules/auth/AuthContext'; // Importar o Provedor
import { LoginPage } from './modules/auth/pages/LoginPage'; // Importar
import { AuthRouteGuard } from './modules/auth/AuthRouteGuard'; // Importar o Guard
import { UploadRoutePage } from './modules/routes/pages/UploadRoutePage';
import { RouteEditPage } from './modules/routes/pages/RouteEditPage';
import { RegisterPage } from './modules/auth/pages/RegisterPage';
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
      <AuthProvider>
      <Layout>
        <Routes>
          {/* Rota principal, que exibe a lista de rotas */}
          <Route path="/" element={<RoutesListPage />} />

          <Route path="/index.html" element={<RoutesListPage />} />
          
          <Route path="/login" element={<LoginPage />} />

          <Route path="/register" element={<RegisterPage />} />
          {/* Outras rotas (login, registro, etc.) */}
          {/* <Route path="/login" element={<LoginPage />} /> */}
          <Route
              path="/routes/:routeId"
              element={
                <AuthRouteGuard>
                  <RouteDetailPage />
                </AuthRouteGuard>
              }
            />

            <Route
                path="/upload"
                element={
                <AuthRouteGuard>
                <UploadRoutePage />
                </AuthRouteGuard>
              }
            />

            <Route
                path="/routes/edit/:routeId"
                element={
                <AuthRouteGuard>
                <RouteEditPage /> 
                </AuthRouteGuard>
                            }
            />
          
          <Route path="*" element={<div className="p-4 text-center">404 - Página não encontrada</div>} />
        </Routes>
      </Layout>
      </AuthProvider>
    </Router>
  );
};


export default App
