import React, { useEffect, useRef, useState } from "react";
import "./ProofOverlay.css";

const SAMPLE_W = 2048;
const SAMPLE_H = 1152;

const samplePositions = {
	token: { x: 0.198877, y: 0.270677, baseH: 59 },
	percent: { x: 0.189248, y: 0.405174, baseH: 92 }, // ✅ left: 18.9248%
	usd: { x: 0.120554, y: 0.519375, baseH: 40 },
	investedValue: { x: 0.314065, y: 0.61, baseH: 40 }, // ✅ left: 27.4065%
	soldValue: { x: 0.354065, y: 0.705, baseH: 40 },     // ✅ left: 27.4065%
	username: { x: 0.154065, y: 0.865, baseH: 40 },
};

export default function ProofOverlay({
	selectedImage = "/generate/solana_dark.png",
	token = "$ZEPSTEIN",
	percent = "+945%",
	usd = "$1,396",
	invested = "1.5",
	sold = "1.5",
	username = "ogchad",
}) {
	const imgRef = useRef(null);
	const containerRef = useRef(null);
	const [display, setDisplay] = useState({ w: 0, h: 0 });

	useEffect(() => {
		if (!imgRef.current) return;

		const updateSize = () => {
			const r = imgRef.current.getBoundingClientRect();
			setDisplay({ w: Math.round(r.width), h: Math.round(r.height) });
		};

		const imgEl = imgRef.current;
		if (imgEl.complete) updateSize();
		imgEl.addEventListener("load", updateSize);

		const ro = new ResizeObserver(updateSize);
		ro.observe(imgEl);
		if (containerRef.current) ro.observe(containerRef.current);

		window.addEventListener("resize", updateSize);

		return () => {
			imgEl.removeEventListener("load", updateSize);
			ro.disconnect();
			window.removeEventListener("resize", updateSize);
		};
	}, [selectedImage]);

	// helper for positioning text
	const computeStyle = (norm, baseH, align = "center") => {
		if (!display.w || !display.h) return { visibility: "hidden" };
		const left = `${norm.x * 100}%`;
		const top = `${norm.y * 100}%`;
		const fontSizePx = Math.max(8, Math.round(baseH * (display.h / SAMPLE_H)));

		let translate = "translate(-50%, -50%)";
		if (align === "left") translate = "translate(0, -50%)";
		if (align === "right") translate = "translate(-100%, -50%)";

		return {
			left,
			top,
			fontSize: `${fontSizePx}px`,
			transform: translate,
			visibility: "visible",
		};
	};

	// token pill style (special background pill)
	const tokenStyle = () => {
		if (!display.w || !display.h) return { visibility: "hidden" };
		const pos = samplePositions.token;
		const centerLeft = `${pos.x * 100}%`;
		const centerTop = `${pos.y * 100}%`;
		const scaleH = display.h / SAMPLE_H;
		const fontSize = Math.max(10, Math.round(pos.baseH * scaleH * 0.8));

		return {
			left: centerLeft,
			top: centerTop,
			fontSize: `${fontSize}px`,
			transform: "translate(-50%, -50%)",
			visibility: "visible",
		};
	};

	return (
		<div className="proof-card" ref={containerRef}>
			<img ref={imgRef} src={selectedImage} alt="proof background" className="proof-bg" draggable={false} />

			<div className="overlay">
				{/* Token pill */}
				<div className="token-box" style={tokenStyle()}>
					<h2>{token}</h2>
				</div>

				{/* Big percent */}
				<div className="percent-text" style={computeStyle(samplePositions.percent, samplePositions.percent.baseH, "center")}>
					<h1>{percent}</h1>
				</div>

				{/* USD */}
				<div className="usd-text" style={computeStyle(samplePositions.usd, samplePositions.usd.baseH, "left")}>
					<h2>{usd}</h2>
				</div>

				{/* Invested value (left small number) */}
				<div className="small-number left" style={computeStyle(samplePositions.investedValue, samplePositions.investedValue.baseH, "left")}>
					<h2>{invested}</h2>
				</div>

				{/* Sold value (right small number) */}
				<div className="small-number right" style={computeStyle(samplePositions.soldValue, samplePositions.soldValue.baseH, "right")}>
					<h2>{sold}</h2>
				</div>

				{/* ✅ Username (new field) */}
				<div className="username-text" style={computeStyle(samplePositions.username, samplePositions.username.baseH, "left")}>
					<h3>{username}</h3>
				</div>
			</div>
		</div>
	);
}
