import { StrictMode, Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed during render:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: 'monospace',
            padding: '24px',
            background: '#E4E3E0',
            color: '#141414',
            minHeight: '100vh',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ margin: '0 0 8px' }}>Terjadi error saat memuat aplikasi</h2>
          <p style={{ margin: '0 0 12px' }}>{this.state.error.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 12px',
              border: '1px solid #141414',
              background: '#141414',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
