import { useEffect, useMemo, useRef, useState } from "react";
import "./GenerateProof.css";
import ProofOverlay from "../components/ProofOverlay";
import html2canvas from "html2canvas"; // ✅ import html2canvas

const imageOptions = ["base_light.png", "base_dark.png", "ethereum_light.png", "ethereum_dark.png", "solana_light.png", "solana_dark.png"];

export default function GenerateProof() {
	const [query, setQuery] = useState("");
	const [selectedImage, setSelectedImage] = useState(null);
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);

	// Dynamic overlay data
	const [token, setToken] = useState("$ZEPSTEIN");
	const [username, setUsername] = useState("ogchad");
	const [percent, setPercent] = useState("+945%");
	const [usd, setUsd] = useState("$1,396");
	const [invested, setInvested] = useState("1.5");
	const [sold, setSold] = useState("4.4");

	const inputRef = useRef(null);
	const wrapperRef = useRef(null);
	const proofRef = useRef(null); // ✅ reference for capture

	// Compute filtered options from the query
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return imageOptions;
		return imageOptions.filter((img) => img.toLowerCase().includes(q));
	}, [query]);

	// Close dropdown on click outside
	useEffect(() => {
		const onDocMouseDown = (e) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", onDocMouseDown);
		return () => document.removeEventListener("mousedown", onDocMouseDown);
	}, []);

	// Reset activeIndex when list changes
	useEffect(() => {
		setActiveIndex(0);
	}, [isOpen, filtered.length]);

	const select = (img) => {
		setQuery(img);
		setSelectedImage(img);
		setIsOpen(false);
	};

	const onChange = (e) => {
		setQuery(e.target.value);
		setIsOpen(true);
	};

	const onKeyDown = (e) => {
		if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
			setIsOpen(true);
			return;
		}
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
				break;
			case "ArrowUp":
				e.preventDefault();
				setActiveIndex((i) => Math.max(i - 1, 0));
				break;
			case "Enter":
				if (isOpen && filtered.length) {
					e.preventDefault();
					select(filtered[activeIndex]);
				}
				break;
			case "Escape":
				setIsOpen(false);
				break;
			default:
				break;
		}
	};

	// ✅ Capture and download function
	// ✅ Capture and download function (fixed)
	const downloadProof = async () => {
		try {
			if (!proofRef.current) return;

			// target the exact element that contains the image + overlays
			const targetEl = proofRef.current.querySelector(".proof-card") || proofRef.current;

			// sanity
			if (!targetEl) return;

			// Use devicePixelRatio for crisp images
			const scale = window.devicePixelRatio ? Math.min(window.devicePixelRatio, 3) : 2;

			const canvas = await html2canvas(targetEl, {
				backgroundColor: null, // keep transparency / no white bg
				useCORS: true,
				scale,
				// width/height/x/y are not necessary when passing the element directly,
				// html2canvas will size the canvas to the element.
			});

			const link = document.createElement("a");
			// optional: dynamic filename using token
			const nameToken = token ? token.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-]/g, "") : "proof";
			link.download = `${nameToken || "proof"}.png`;
			link.href = canvas.toDataURL("image/png");
			link.click();
		} catch (err) {
			console.error("downloadProof error:", err);
			// optionally show a user-visible error in the UI
		}
	};

	return (
		<div className="page-container">
			{/* Image search */}
			<div className="input-wrapper" ref={wrapperRef}>
				<input ref={inputRef} type="text" value={query} onChange={onChange} onKeyDown={onKeyDown} onFocus={() => setIsOpen(true)} placeholder="Type to search image..." className="input-field" aria-autocomplete="list" aria-controls="proof-suggestions" aria-expanded={isOpen} aria-haspopup="listbox" />

				{isOpen && (
					<ul id="proof-suggestions" role="listbox" className="suggestions">
						{filtered.length ? (
							filtered.map((img, idx) => (
								<li key={img} role="option" aria-selected={idx === activeIndex} onMouseDown={() => select(img)} className={`suggestion-item ${idx === activeIndex ? "active" : ""}`}>
									{img}
								</li>
							))
						) : (
							<li className="suggestion-item empty" aria-disabled="true">
								No matches
							</li>
						)}
					</ul>
				)}
			</div>

			{/* Dynamic overlay inputs */}
			{selectedImage && (
				<>
					{/* Selected image + overlay */}
					<div className="image-container" ref={proofRef}>
						<ProofOverlay selectedImage={`/generate/${selectedImage}`} token={token} percent={percent} usd={usd} invested={invested} sold={sold} username={username} />
					</div>

					<div className="form-fields">
						<h2 className="form-title">Customize Your Proof</h2>
						<p className="form-caption">Edit the details below and see them update instantly on the proof image.</p>

						<div className="form-grid">
							<label>
								<span>Token</span>
								<input type="text" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Token" />
							</label>

							<label>
								<span>Percent</span>
								<input type="text" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="Percent" />
							</label>

							<label>
								<span>USD</span>
								<input type="text" value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="USD" />
							</label>

							<label>
								<span>Invested</span>
								<input type="text" value={invested} onChange={(e) => setInvested(e.target.value)} placeholder="Invested" />
							</label>

							<label>
								<span>Sold</span>
								<input type="text" value={sold} onChange={(e) => setSold(e.target.value)} placeholder="Sold" />
							</label>

							<label>
								<span>Username</span>
								<input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
							</label>
						</div>

						{/* ✅ Download button */}
						<button className="download-btn" onClick={downloadProof}>
							⬇️ Download Proof
						</button>
					</div>
				</>
			)}
		</div>
	);
}
