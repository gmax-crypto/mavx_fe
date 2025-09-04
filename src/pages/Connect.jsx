import { useEffect, useState } from "react";

export default function Connect() {
	const [tgId, setTgId] = useState(null);
	const [token, setToken] = useState(null);
	const [walletAddress, setWalletAddress] = useState(null);

	// --- Parse query params ---
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		setTgId(params.get("tgId"));
		setToken(params.get("token"));
        connectWallet();
	}, []);

	// --- Connect wallet (Phantom) ---
	async function connectWallet() {
		if (window.solana && window.solana.isPhantom) {
			try {
				const resp = await window.solana.connect();
				const address = resp.publicKey.toString();
				setWalletAddress(address);

				// --- POST to bot API ---
				await fetch("https://mevxpro-c2984bbac7fe.herokuapp.com/wallet-connected", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ tgId, walletAddress: address, token }),
				});

				alert("Wallet connected and sent to API!");
			} catch (err) {
				console.error("Wallet connection failed:", err);
				alert("Wallet connection failed.");
			}
		} else {
			alert("Phantom wallet not found. Please install it.");
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
