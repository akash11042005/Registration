import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
}

// Catches render-time errors anywhere below it in the tree and shows a
// visible message instead of letting React silently unmount to a blank
// white page. Without this, any uncaught error (a bad Firestore read, a
// missing field, etc.) during render just disappears with nothing shown.
export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('Uncaught render error:', error, info.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-metal-50 px-4 py-20">
                    <div className="card p-8 max-w-lg text-center">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-7 h-7" />
                        </div>
                        <h2 className="text-title text-navy-900 mb-2">Something went wrong</h2>
                        <p className="text-sm text-metal-600 mb-4">
                            This page hit an unexpected error instead of rendering. The details below are the actual cause —
                            screenshot this if you need help fixing it.
                        </p>
                        <pre className="text-left text-[11px] bg-metal-900 text-red-300 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                            {this.state.error.message}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn-primary justify-center mt-5 mx-auto"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}