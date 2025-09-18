import { useEffect } from "react";

export default function Notification({ message, onClose }) {
	useEffect(() => {
		const timer = setTimeout(onClose, 4500);
		return () => clearTimeout(timer);
	}, [onClose]);

	// Check if the message contains "failed" (case-insensitive)
	const isFailed = message?.toLowerCase().includes("failed");

	const style = {
		background: isFailed
			? "#ff4d4f"
			: "linear-gradient(135deg, #4bdb26dc, #0066ff)",
	};

	return (
		<div className="notification" style={style}>
			{message}
		</div>
	);
}
