import SubShieldComplete from "./subshield/SubShieldComplete.jsx";
import ErrorBoundary from "./subshield/components/ErrorBoundary.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <SubShieldComplete />
    </ErrorBoundary>
  );
}
