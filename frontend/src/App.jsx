import { useState } from "react";
import { Button } from "./components/ui/button";

function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-lg font-bold">Vite + React</h1>
      <Button variant="default" onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </Button>
    </main>
  );
}

export default App;
