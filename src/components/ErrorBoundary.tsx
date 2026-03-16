"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { downloadBackup, createBackup } from "@/lib/data-backup";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleExportData = () => {
    try {
      downloadBackup(createBackup());
    } catch {
      // If export fails, just reload
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0c0a0d] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
              <div className="text-4xl mb-4">🏚️</div>
              <h1 className="text-xl font-light text-[#e8e4ec] font-serif">
                Something went wrong
              </h1>
              <p className="text-sm text-[#8a8090]">
                The goshiwon has encountered an unexpected error.
                Your progress is safe in your browser&apos;s storage.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#1a1520] rounded-lg p-3 border border-[#2a2530]">
                <p className="text-xs text-[#8a8090] font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 text-sm font-medium rounded-lg bg-[#d4a843]/20 text-[#d4a843] border border-[#d4a843]/30 hover:bg-[#d4a843]/30 transition-colors min-h-[44px]"
              >
                Reload Application
              </button>
              <button
                onClick={this.handleExportData}
                className="w-full py-3 px-4 text-sm font-medium rounded-lg bg-[#1a1520] text-[#8a8090] border border-[#2a2530] hover:bg-[#252030] transition-colors min-h-[44px]"
              >
                Export Data First
              </button>
            </div>

            <p className="text-xs text-[#4d4559]">
              If this keeps happening, try clearing your browser cache
              after exporting your data.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
