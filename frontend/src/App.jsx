import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

import { LoginPage } from "./pages/Login";
import { NotFoundPage } from "./pages/NotFound";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
