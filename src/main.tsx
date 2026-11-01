import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown runtime error',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Teacher Hub RootErrorBoundary caught error:', error, errorInfo);
  }

  handleSafeReset = () => {
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
    window.location.hash = '#dashboard';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#F4F7F5',
            color: '#13231C',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: '0 12px 36px rgba(13,91,73,0.15)',
              border: '2px solid #0D5B49',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>🛡️</div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>
              बेसिक शिक्षक डैशबोर्ड — स्वतः सुरक्षा रिकवरी
            </h1>
            <p style={{ fontSize: '14px', color: '#52645B', marginBottom: '16px' }}>
              ब्राउज़र के पुराने कैश या डेटा में असंगति पाई गई है। नीचे दिए बटन से डैशबोर्ड को तुरंत रीलोड करें।
            </p>
            <button
              type="button"
              onClick={this.handleSafeReset}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: '#0D5B49',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              🔄 डैशबोर्ड रीसेट व रीलोड करें (Reset & Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  (window as any).__APP_MOUNTED__ = true;
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
}
