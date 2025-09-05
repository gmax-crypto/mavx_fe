import { useEffect, useState } from "react";

const params = new URLSearchParams(window.location.search);
export default function Connect() {
	const [tgId, setTgId] = useState(null);
	const [token, setToken] = useState(null);
	const [walletAddress, setWalletAddress] = useState(null);

	// --- Parse query params ---
	useEffect(() => {
		setTgId(params.get("tgId"));
		setToken(params.get("token"));
		connectWallet();
	}, []);

	// --- Connect wallet (Phantom) ---
	function isMobile() {
		return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
	}

	async function connectWallet() {
		if (window.solana && window.solana.isPhantom) {
			try {
				const resp = await window.solana.connect();
				const address = resp.publicKey.toString();
				setWalletAddress(address);

				await fetch(`https://mevxpro-c2984bbac7fe.herokuapp.com/wallet-connected`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						tgId: params.get("tgId"),
						walletAddress: address,
						token: params.get("token"),
					}),
				});

				alert("Wallet connected and sent to API!");
			} catch (err) {
				console.error("Wallet connection failed:", err);
			}
		} else if (isMobile()) {
			const dappUrl = encodeURIComponent(window.location.href);
			window.location.href = `https://phantom.app/ul/browse/${dappUrl}`;
		} else {
			console.log("DESKTOP but Phantom not found");
			alert("Please install Phantom extension to continue.");
		}
	}

	return (
		<div style={{ textAlign: "center", marginTop: "50px" }}>
			<h2>Connect Your Solana Wallet</h2>
			<p>tgId: {tgId}</p>
			<p>token: {token}</p>
			{walletAddress ? <p>✅ Connected: {walletAddress}</p> : <button onClick={connectWallet}>Connect Wallet</button>}
		</div>
	);
}
