import { Connection, VersionedTransaction } from '@solana/web3.js';

/**
 * O-SLOT transaction execution utility
 * This function handles the execution of swap transactions using 0slot setup
 * Uses Connection.sendRawTransaction approach similar to the reference implementation
 * 
 * @param {string} transactionBase64 - Base64 encoded transaction from swap endpoint
 * @param {Connection} connection - Solana connection instance (for blockhash if needed)
 * @param {Function} signTransaction - Wallet sign transaction function
 * @param {string} endpoint - 0slot endpoint for execution (with API key, e.g., https://de.0slot.trade?api-key=...)
 * @returns {Promise<string>} Transaction signature
 */
export async function executeSwapWithOSlot(
    transactionBase64,
    connection,
    signTransaction,
    endpoint
) {
    const totalStartTime = performance.now();

    try {
        console.log('🔄 Starting 0slot transaction execution...');
        const prepareStartTime = performance.now();

        // Deserialize the transaction
        const transactionBuffer = Buffer.from(transactionBase64, 'base64');
        const versionedTransaction = VersionedTransaction.deserialize(transactionBuffer);

        // Sign the transaction with the wallet
        const signedTransaction = await signTransaction(versionedTransaction);

        // Serialize the signed transaction to buffer (for sendRawTransaction)
        const serializedTx = signedTransaction.serialize();

        const prepareTime = ((performance.now() - prepareStartTime) / 1000).toFixed(5);
        console.log(`⏱️  Transaction preparation took: ${prepareTime} seconds`);

        // Create a connection to the 0slot endpoint
        // Extract API key from endpoint if present, or use endpoint as-is
        const oslotConnection = new Connection(endpoint, 'confirmed');

        // Log request details
        const requestStartTime = performance.now();
        console.log(`📤 Sending transaction to 0slot endpoint: ${endpoint}`);
        console.log(`📦 Transaction size: ${serializedTx.length} bytes`);

        // Send transaction using sendRawTransaction (Connection-based approach)
        const signature = await oslotConnection.sendRawTransaction(serializedTx, {
            skipPreflight: true,
            maxRetries: 0,
        });

        const requestTime = ((performance.now() - requestStartTime) / 1000).toFixed(5);
        const totalTime = ((performance.now() - totalStartTime) / 1000).toFixed(5);

        console.log(`✅ Transaction sent in ${requestTime} seconds`);
        console.log(`⏱️  Total execution time: ${totalTime} seconds`);
        console.log(`🚀 Transaction signature: ${signature}`);
        console.log(`✨ It took ${totalTime} seconds to send transaction ${signature} (ZeroSlot)`);
        console.log(`💡 Note: This is easy to optimize, you just have to be closer to 0slot server`);

        return signature;
    } catch (error) {
        const totalTime = ((performance.now() - totalStartTime) / 1000).toFixed(5);
        console.error(`❌ 0slot execution error after ${totalTime} seconds:`, error);
        throw error;
    }
}

/**
 * Fetch swap transaction from endpoint
 * Supports custom swap API endpoint with GET request and query parameters
 * 
 * @param {string} swapEndpoint - API endpoint to fetch swap transaction
 * @param {Object} swapParams - Swap parameters (inputMint, outputMint, amount, etc.)
 * @param {string} userPublicKey - User's public key for the swap
 * @returns {Promise<string>} Base64 encoded transaction
 */
export async function fetchSwapTransaction(swapEndpoint, swapParams, userPublicKey) {
    try {
        // Check if this is the custom swap endpoint (route/solana/swap or metaagg.velvetdao.xyz)
        if (swapEndpoint.includes('route/solana/swap') || swapEndpoint.includes('metaagg.velvetdao.xyz')) {
            // Build query parameters for GET request
            const queryParams = new URLSearchParams({
                tokenIn: swapParams.inputMint,
                tokenOut: swapParams.outputMint,
                amount: swapParams.amount.toString(),
                sender: userPublicKey,
                slippage: (swapParams.slippageBps || 50).toString(), // slippage in basis points
            });

            const url = `${swapEndpoint}?${queryParams.toString()}`;
            console.log('Fetching swap from:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch swap transaction: ${response.statusText} - ${errorText}`);
            }

            const responseData = await response.json();

            // Handle response structure: { data: { swapData: "...", quote: {...} } }
            if (responseData.data && responseData.data.swapData) {
                console.log('Swap quote info:', {
                    amountOut: responseData.data.quote?.amountOut,
                    priceImpact: responseData.data.quote?.priceImpact,
                });
                return responseData.data.swapData;
            } else {
                throw new Error('Invalid response format from swap endpoint. Expected data.swapData');
            }
        } else if (swapEndpoint.includes('quote-api.jup.ag') || swapEndpoint.includes('/quote')) {
            // Jupiter v6 API support (fallback)
            // Step 1: Get quote from Jupiter
            const quoteParams = {
                inputMint: swapParams.inputMint,
                outputMint: swapParams.outputMint,
                amount: swapParams.amount,
                slippageBps: swapParams.slippageBps || 50,
            };

            const quoteUrl = `${swapEndpoint}?${new URLSearchParams({
                inputMint: quoteParams.inputMint,
                outputMint: quoteParams.outputMint,
                amount: quoteParams.amount.toString(),
                slippageBps: quoteParams.slippageBps.toString(),
            })}`;

            const quoteResponse = await fetch(quoteUrl);
            if (!quoteResponse.ok) {
                throw new Error(`Failed to get quote: ${quoteResponse.statusText}`);
            }

            const quoteData = await quoteResponse.json();

            // Step 2: Get swap transaction from Jupiter
            const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quoteResponse: quoteData,
                    userPublicKey: userPublicKey,
                    wrapAndUnwrapSol: true,
                    dynamicComputeUnitLimit: true,
                    prioritizationFeeLamports: 'auto',
                }),
            });

            if (!swapResponse.ok) {
                const errorText = await swapResponse.text();
                throw new Error(`Failed to get swap transaction: ${errorText}`);
            }

            const swapData = await swapResponse.json();

            if (swapData.swapTransaction) {
                return swapData.swapTransaction;
            } else {
                throw new Error('Invalid response format from Jupiter swap API');
            }
        } else {
            // Direct transaction endpoint (legacy format - POST)
            const response = await fetch(swapEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(swapParams),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch swap transaction: ${response.statusText}`);
            }

            const data = await response.json();

            // Handle different response formats
            if (data.transaction) {
                return data.transaction;
            } else if (data.swapTransaction) {
                return data.swapTransaction;
            } else if (data.tx) {
                return data.tx;
            } else {
                throw new Error('Invalid response format from swap endpoint');
            }
        }
    } catch (error) {
        console.error('Error fetching swap transaction:', error);
        throw error;
    }
}


