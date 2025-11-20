import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { fetchSwapTransaction, executeSwapWithOSlot } from '../utils/oslot';
import './SwapComponent.css';

export default function SwapComponent() {
    const { publicKey, signTransaction, connected } = useWallet();
    const { connection } = useConnection();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [txSignature, setTxSignature] = useState(null);

    // Swap parameters
    const [swapEndpoint, setSwapEndpoint] = useState('https://metaagg.velvetdao.xyz/api/v1/route/solana/swap');
    const [oslotEndpoint] = useState('https://de1.0slot.trade/?api-key=a403faee1e7e4d9a81a3907a52cb7952');
    const [inputMint, setInputMint] = useState('So11111111111111111111111111111111111111112'); // SOL
    const [outputMint, setOutputMint] = useState('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
    const [amount, setAmount] = useState('');
    const [slippage, setSlippage] = useState(50); // Default 50 BPS (0.5%)

    const handleSwap = async () => {
        if (!connected || !publicKey) {
            setError('Please connect your wallet first');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (!slippage || parseFloat(slippage) < 0) {
            setError('Please enter a valid slippage in BPS');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        setTxSignature(null);

        try {
            // Use amount directly in lowest units (lamports)
            const amountInLowestUnits = Math.floor(parseFloat(amount));

            // Step 1: Fetch swap transaction from endpoint
            const swapParams = {
                inputMint,
                outputMint,
                amount: amountInLowestUnits,
                slippageBps: Math.floor(parseFloat(slippage)), // Use slippage directly in BPS
            };

            console.log('Fetching swap transaction from:', swapEndpoint);
            const transactionBase64 = await fetchSwapTransaction(swapEndpoint, swapParams, publicKey.toBase58());

            // Step 2: Execute swap using 0slot
            console.log('Executing swap with 0slot...');
            const signature = await executeSwapWithOSlot(
                transactionBase64,
                connection,
                signTransaction,
                oslotEndpoint
            );

            setTxSignature(signature);
            setSuccess(`Swap executed successfully! Signature: ${signature}`);

            // Clear form after successful swap
            setTimeout(() => {
                setAmount('');
            }, 3000);
        } catch (err) {
            console.error('Swap error:', err);
            setError(err.message || 'Swap failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="swap-container">
            <h2>Solana Token Swap</h2>

            <div className="swap-form">
                <div className="form-group">
                    <label htmlFor="swapEndpoint">Swap API Endpoint:</label>
                    <input
                        id="swapEndpoint"
                        type="text"
                        value={swapEndpoint}
                        onChange={(e) => setSwapEndpoint(e.target.value)}
                        placeholder="https://metaagg.velvetdao.xyz/api/v1/route/solana/swap"
                        disabled={loading}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                        GET endpoint that returns swap transaction data
                    </small>
                </div>

                <div className="form-group">
                    <label htmlFor="oslotEndpoint">0slot Execution Endpoint:</label>
                    <input
                        id="oslotEndpoint"
                        type="text"
                        value={oslotEndpoint}
                        readOnly
                        disabled={true}
                        style={{ backgroundColor: '#f5f5f5' }}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                        All swaps are executed via 0slot
                    </small>
                </div>

                <div className="form-group">
                    <label htmlFor="inputMint">Input Token Mint:</label>
                    <input
                        id="inputMint"
                        type="text"
                        value={inputMint}
                        onChange={(e) => setInputMint(e.target.value)}
                        placeholder="Input token mint address"
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="outputMint">Output Token Mint:</label>
                    <input
                        id="outputMint"
                        type="text"
                        value={outputMint}
                        onChange={(e) => setOutputMint(e.target.value)}
                        placeholder="Output token mint address"
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="amount">Amount (in lowest units, e.g., lamports):</label>
                    <input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="1000000000"
                        step="1"
                        min="0"
                        disabled={loading}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                        Enter amount in lowest units (e.g., 1000000000 lamports = 1 SOL)
                    </small>
                </div>

                <div className="form-group">
                    <label htmlFor="slippage">Slippage (in BPS - Basis Points):</label>
                    <input
                        id="slippage"
                        type="number"
                        value={slippage}
                        onChange={(e) => setSlippage(parseFloat(e.target.value) || 50)}
                        placeholder="50"
                        step="1"
                        min="0"
                        max="10000"
                        disabled={loading}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                        1 BPS = 0.01%. Example: 50 BPS = 0.5%, 100 BPS = 1%
                    </small>
                </div>

                <button
                    onClick={handleSwap}
                    disabled={loading || !connected}
                    className="swap-button"
                >
                    {loading ? 'Processing Swap...' : 'Execute Swap'}
                </button>

                {error && (
                    <div className="error-message">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {success && (
                    <div className="success-message">
                        <strong>Success:</strong> {success}
                        {txSignature && (
                            <div className="tx-link">
                                <a
                                    href={`https://solscan.io/tx/${txSignature}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    View on Solscan
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}


