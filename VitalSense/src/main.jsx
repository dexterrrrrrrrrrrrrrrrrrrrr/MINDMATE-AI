import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    return this.state.error ? <main className="error-page"><h1>Let’s get you back.</h1><p>VitalSense could not open this screen. Your saved data is still on this browser.</p><button onClick={() => window.location.reload()}>Reload VitalSense</button></main> : this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById('root')).render(<BrowserRouter><ErrorBoundary><App /></ErrorBoundary></BrowserRouter>);
