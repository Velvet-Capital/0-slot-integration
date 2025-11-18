import { Connection, VersionedTransaction } from '@solana/web3.js';

/**
 * O-SLOT transaction execution utility
 * This function handles the execution of swap transactions using 0slot setup
 * 
 * @param {string} transactionBase64 - Base64 encoded transaction from swap endpoint
 * @param {Connection} connection - Solana connection instance
 * @param {Function} signTransaction - Wallet sign transaction function
 * @param {string} endpoint - 0slot endpoint for execution (with API key)
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

        // Serialize the signed transaction to base64
        const serializedTx = Buffer.from(signedTransaction.serialize()).toString('base64');

        const prepareTime = ((performance.now() - prepareStartTime) / 1000).toFixed(5);
        console.log(`⏱️  Transaction preparation took: ${prepareTime} seconds`);

        // Prepare JSON-RPC 2.0 payload for 0slot (matching Python demo format)
        const payload = {
            jsonrpc: "2.0",
            id: 1,
            method: "sendTransaction",
            params: [
                serializedTx,
                {
                    encoding: "base64",
                    skipPreflight: true,
                    preflightCommitment: "processed",
                    maxRetries: 0,
                    minContextSlot: null,
                },
            ],
        };

        // Log request details
        const requestStartTime = performance.now();
        console.log(`📤 Sending transaction to 0slot endpoint: ${endpoint}`);
        console.log(`📦 Payload size: ${JSON.stringify(payload).length} bytes`);

        // Send to 0slot endpoint using JSON-RPC format
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const requestTime = ((performance.now() - requestStartTime) / 1000).toFixed(5);
        console.log(`⏱️  Request sent, waiting for response... (${requestTime} seconds)`);

        const responseStartTime = performance.now();

        if (response.status !== 200) {
            const errorText = await response.text();
            const responseTime = ((performance.now() - responseStartTime) / 1000).toFixed(5);
            const totalTime = ((performance.now() - totalStartTime) / 1000).toFixed(5);

            console.error(`❌ 0slot request failed after ${responseTime} seconds`);
            console.error(`❌ Total execution time: ${totalTime} seconds`);

            let errorMessage = `0slot execution failed: incorrect status code: ${response.status}`;

            try {
                const errorData = JSON.parse(errorText);
                if (errorData.error) {
                    errorMessage = errorData.error.message || errorData.error.code || errorMessage;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // If response is not JSON, use the text
                if (errorText) {
                    errorMessage = `${errorMessage}, ${errorText}`;
                }
            }

            throw new Error(errorMessage);
        }

        const responseData = await response.json();
        const responseTime = ((performance.now() - responseStartTime) / 1000).toFixed(5);
        const totalTime = ((performance.now() - totalStartTime) / 1000).toFixed(5);

        // Handle JSON-RPC response format: { result: "signature_string" }
        if (responseData.result) {
            const signature = responseData.result;
            console.log(`✅ Response received in ${responseTime} seconds`);
            console.log(`⏱️  Total execution time: ${totalTime} seconds`);
            console.log(`🚀 Transaction signature: ${signature}`);
            console.log(`✨ It took ${totalTime} seconds to send transaction ${signature} (ZeroSlot)`);
            console.log(`💡 Note: This is easy to optimize, you just have to be closer to 0slot server`);

            return signature;
        } else if (responseData.error) {
            console.error(`❌ 0slot error response received after ${responseTime} seconds`);
            console.error(`❌ Total execution time: ${totalTime} seconds`);
            throw new Error(`0slot error: ${responseData.error.message || JSON.stringify(responseData.error)}`);
        } else {
            // Fallback for other response formats
            if (responseData.signature) {
                console.log(`✅ Response received in ${responseTime} seconds`);
                console.log(`⏱️  Total execution time: ${totalTime} seconds`);
                return responseData.signature;
            } else if (responseData.txid) {
                console.log(`✅ Response received in ${responseTime} seconds`);
                console.log(`⏱️  Total execution time: ${totalTime} seconds`);
                return responseData.txid;
            } else if (responseData.txSignature) {
                console.log(`✅ Response received in ${responseTime} seconds`);
                console.log(`⏱️  Total execution time: ${totalTime} seconds`);
                return responseData.txSignature;
            } else {
                console.error(`❌ Unexpected response format after ${responseTime} seconds`);
                throw new Error('Unexpected response format from 0slot endpoint');
            }
        }
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
        // Check if this is the custom swap endpoint (localhost:4000 or route/solana/swap)
        if (swapEndpoint.includes('route/solana/swap') || swapEndpoint.includes('localhost:4000')) {
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


