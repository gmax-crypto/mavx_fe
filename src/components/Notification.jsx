import { useEffect } from "react";

export default function Notification({ message, onClose }) {
	useEffect(() => {
		const timer = setTimeout(onClose, 3500); // auto close after 3s
		return () => clearTimeout(timer);
	}, [onClose]);

	return (
		<div className="notification">
			{message}
		</div>
	);
}