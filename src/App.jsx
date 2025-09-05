import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Connect from "./pages/Connect";
import Claim from "./pages/Claim";
import "./App.css";

function App() {
	return (
		<Router>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/connect" element={<Connect />} />
					<Route path="/claim" element={<Claim />} />
				</Routes>
		</Router>
	);
}

export default App;
