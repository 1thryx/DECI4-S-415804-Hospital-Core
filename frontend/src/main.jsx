import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached reads are served instantly while a background refetch reconciles —
      // this is what keeps the SPA off the network on every navigation.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => (error?.status >= 400 && error?.status < 500 ? false : failureCount < 2),
      refetchOnWindowFocus: true
    },
    mutations: { retry: 0 }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
