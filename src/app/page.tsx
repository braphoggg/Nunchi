import ChatContainer from "@/components/ChatContainer";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Home() {
  return (
    <ErrorBoundary>
      <main className="app-height bg-goshiwon-bg">
        <ChatContainer />
      </main>
    </ErrorBoundary>
  );
}
